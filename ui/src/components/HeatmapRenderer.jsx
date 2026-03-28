import React, { useEffect, useRef, useState } from 'react';
import './HeatmapRenderer.css';

const HeatmapRenderer = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const ssrRef = useRef(null);
    
    // Config
    const TICK_W = 2; // pixels per time tick
    const MIN_VOL = 0;
    const MAX_VOL = 500; // Expected max volume to normalize colors
    const PRICE_SCROLL = 50; // Visible levels up/down

    const [currentPrice, setCurrentPrice] = useState(0);
    const [status, setStatus] = useState('Connecting...');

    // Color ramp (Bookmap style: Dark blue -> Cyan -> Green -> Yellow -> Red -> White)
    const getColor = (vol) => {
        if (!vol) return 'rgba(10,10,12,1)'; // bg color
        let rat = vol / MAX_VOL;
        if (rat > 1) rat = 1;

        if (rat < 0.2) return `rgba(0, 0, ${100 + rat * 5 * 155}, 1)`;
        if (rat < 0.4) return `rgba(0, ${(rat - 0.2) * 5 * 255}, 255, 1)`;
        if (rat < 0.6) return `rgba(0, 255, ${255 - (rat - 0.4) * 5 * 255}, 1)`;
        if (rat < 0.8) return `rgba(${(rat - 0.6) * 5 * 255}, 255, 0, 1)`;
        if (rat < 0.95) return `rgba(255, ${255 - (rat - 0.8) * (1/0.15) * 255}, 0, 1)`;
        return `rgba(255, 255, 255, 1)`;
    };

    useEffect(() => {
        const fetchStream = () => {
            console.log("Connecting to SSE...");
            const evtSource = new EventSource('http://localhost:3001/stream');
            
            setStatus('Connected to C++ Engine Live Feed');

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { alpha: false }); // optimize
            
            // Offscreen canvas for very fast scrolling
            const off = document.createElement('canvas');
            off.width = canvas.width;
            off.height = canvas.height;
            const octx = off.getContext('2d', { alpha: false });
            
            // Initial clear
            octx.fillStyle = '#0a0a0c'; // premium dark
            octx.fillRect(0, 0, off.width, off.height);
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let lastPrice = 0;

            evtSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'snapshot') {
                    const price = data.price;
                    setCurrentPrice(price);
                    lastPrice = price;

                    // 1. Shift offscreen canvas LEFT by TICK_W
                    octx.drawImage(off, TICK_W, 0, off.width - TICK_W, off.height, 0, 0, off.width - TICK_W, off.height);
                    
                    // Clear the newly exposed strip on the right
                    octx.fillStyle = '#0a0a0c';
                    octx.fillRect(off.width - TICK_W, 0, TICK_W, off.height);

                    // We have 200 levels (100 bid, 100 ask).
                    // Draw vertical strip for this tick on the rightmost edge.
                    // Instead of full 200 (which varies), let's render a fixed range around current price
                    // We assume TICK_SIZE is 0.5 for our scaling (from C++)
                    const pxHeight = off.height / (PRICE_SCROLL * 2);
                    
                    // Render Bids
                    data.bids.forEach(bid => {
                        const px = bid[0];
                        const vol = bid[1];
                        // diff from center
                        const levelDiff = (lastPrice - px) / 0.5; // levels below
                        if (levelDiff >= 0 && levelDiff < PRICE_SCROLL) {
                            const y = off.height / 2 + (levelDiff * pxHeight);
                            octx.fillStyle = getColor(vol);
                            octx.fillRect(off.width - TICK_W, y, TICK_W, pxHeight);
                        }
                    });

                    // Render Asks
                    data.asks.forEach(ask => {
                        const px = ask[0];
                        const vol = ask[1];
                        const levelDiff = (px - lastPrice) / 0.5; // levels above
                        if (levelDiff >= 0 && levelDiff < PRICE_SCROLL) {
                            const y = off.height / 2 - ((levelDiff + 1) * pxHeight);
                            octx.fillStyle = getColor(vol);
                            octx.fillRect(off.width - TICK_W, y, TICK_W, pxHeight);
                        }
                    });
                    
                    // Render the price line
                    octx.fillStyle = '#ff0055'; // neon red/pink line for price
                    octx.fillRect(off.width - TICK_W, off.height/2 - pxHeight/2, TICK_W, pxHeight);

                    // Finally, copy offscreen to visible
                    ctx.drawImage(off, 0, 0);
                }
            };

            evtSource.onerror = (e) => {
                console.error("SSE Error:", e);
                setStatus('Feed Disconnected. Reconnecting...');
                evtSource.close();
                setTimeout(fetchStream, 2000);
            };

            ssrRef.current = evtSource;
        };

        const handleResize = () => {
             // to keep things simple, we'll fix canvas size for ultra perf or let it resize. 
             // Resizing a live shifting canvas requires recopying history. Simple reload on resize.
             if (containerRef.current && canvasRef.current) {
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;
             }
        };
        
        handleResize();
        window.addEventListener('resize', handleResize);
        fetchStream();

        return () => {
            window.removeEventListener('resize', handleResize);
            if(ssrRef.current) ssrRef.current.close();
        };
    }, []);

    return (
        <div className="heatmap-container" ref={containerRef}>
            <div className="heatmap-overlay">
                <div className="status-indicator">
                    <span className={status.includes('Connected') ? 'pulse-green' : 'pulse-red'}></span>
                    {status}
                </div>
                <div className="price-display">
                    {currentPrice.toFixed(2)}
                </div>
            </div>
            <canvas ref={canvasRef} className="heatmap-canvas" />
        </div>
    );
};

export default HeatmapRenderer;

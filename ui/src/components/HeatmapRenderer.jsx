import React, { useEffect, useRef, useState } from 'react';
import './HeatmapRenderer.css';

const HeatmapRenderer = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const ssrRef = useRef(null);
    const centerScaleRef = useRef(0);
    
    // Config
    const TICK_W = 2; // pixels per time tick
    const MIN_VOL = 0;
    const MAX_VOL = 500; // Expected max volume to normalize colors
    const PRICE_SCROLL = 60; // Visible levels up/down from centerScale
    const TICK_SIZE = 0.5;

    const [currentPrice, setCurrentPrice] = useState(0);
    const [status, setStatus] = useState('Connecting...');

    // Color ramp (Bookmap style: Dark blue -> Cyan -> Green -> Yellow -> Red -> White)
    const getColor = (vol) => {
        if (!vol) return 'rgba(10,10,12,1)'; // bg color
        let rat = vol / MAX_VOL;
        if (rat > 1) rat = 1; // max cap

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
            const endpoint = window.location.hostname === 'localhost' 
                ? 'http://localhost:3001/stream' 
                : 'https://e991bce81ac0b5.lhr.life/stream';
            
            const evtSource = new EventSource(endpoint);
            setStatus('Connected to C++ Engine Live Feed');

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { alpha: false }); 
            
            const off = document.createElement('canvas');
            off.width = canvas.width;
            off.height = canvas.height;
            const octx = off.getContext('2d', { alpha: false });
            
            // Initial clear
            octx.fillStyle = '#0a0a0c'; // premium dark
            octx.fillRect(0, 0, off.width, off.height);
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            evtSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'snapshot') {
                    const price = data.price;
                    setCurrentPrice(price);

                    // Initialize or jump scale if price drifts too far
                    if (centerScaleRef.current === 0 || Math.abs(price - centerScaleRef.current) > (PRICE_SCROLL - 10) * TICK_SIZE) {
                        centerScaleRef.current = price;
                        // Draw a full vertical red line to indicate scale wipe/jump
                        octx.fillStyle = '#ff0055'; 
                        octx.fillRect(off.width - TICK_W, 0, TICK_W, off.height);
                    }

                    const topPrice = centerScaleRef.current + (PRICE_SCROLL * TICK_SIZE);
                    const bottomPrice = centerScaleRef.current - (PRICE_SCROLL * TICK_SIZE);

                    // Shift offscreen canvas LEFT
                    octx.drawImage(off, TICK_W, 0, off.width - TICK_W, off.height, 0, 0, off.width - TICK_W, off.height);
                    
                    // Clear newest strip
                    octx.fillStyle = '#0a0a0c';
                    octx.fillRect(off.width - TICK_W, 0, TICK_W, off.height);

                    // Real Bookmap representation based on Absolute Prices
                    const totalVisibleLevels = PRICE_SCROLL * 2;
                    const pxHeight = off.height / totalVisibleLevels;
                    // Fix subpixel gap bleeding by expanding rectangle height
                    const drawHeight = Math.ceil(pxHeight) + 1;

                    // Helper to draw a level
                    const drawLevel = (lvlPrice, vol) => {
                        if (lvlPrice <= topPrice && lvlPrice >= bottomPrice) {
                            const levelsFromTop = (topPrice - lvlPrice) / TICK_SIZE;
                            const y = Math.floor(levelsFromTop * pxHeight);
                            octx.fillStyle = getColor(vol);
                            octx.fillRect(off.width - TICK_W, y, TICK_W, drawHeight);
                        }
                    };

                    data.bids.forEach(bid => drawLevel(bid[0], bid[1]));
                    data.asks.forEach(ask => drawLevel(ask[0], ask[1]));
                    
                    // Render the Current Price snaking through
                    if (price <= topPrice && price >= bottomPrice) {
                        const priceLevelsTop = (topPrice - price) / TICK_SIZE;
                        const pY = Math.floor(priceLevelsTop * pxHeight);
                        octx.fillStyle = '#ff0055'; // neon red/pink line for actual traded price
                        octx.fillRect(off.width - TICK_W, pY, TICK_W, drawHeight);
                    }

                    // Copy offscreen to visible
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

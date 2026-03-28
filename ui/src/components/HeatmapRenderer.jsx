import React, { useEffect, useRef, useState } from 'react';
import './HeatmapRenderer.css';

const HeatmapRenderer = ({ feedSource }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const connectionRef = useRef(null);
    const centerScaleRef = useRef(0);
    
    // Config mappings based on feedSource
    const FEED_CONFIGS = {
        'binance': { url: 'wss://stream.binance.com:9443/ws/btcusdt@depth20@100ms', type: 'ws', tickSize: 0.5, priceScroll: 50, defaultMaxVol: 5, zoomFactor: 1 },
        'binance-eth': { url: 'wss://stream.binance.com:9443/ws/ethusdt@depth20@100ms', type: 'ws', tickSize: 0.1, priceScroll: 30, defaultMaxVol: 50, zoomFactor: 1 },
        'local': { url: 'tunnel', type: 'sse', tickSize: 0.5, priceScroll: 60, defaultMaxVol: 500, zoomFactor: 1 }
    };

    const TICK_W = 2; // pixels per time tick (scroll speed)
    const [currentPrice, setCurrentPrice] = useState(0);
    const [status, setStatus] = useState('Connecting...');

    // Auto-adjusting Volume Scale for colors
    const maxVolRef = useRef(10); 

    // Bookmap Premium Dark Color Ramp mapping
    const getColor = (vol, maxVol) => {
        if (!vol || vol <= 0) return 'rgba(5, 5, 7, 1)'; // deep premium background
        let rat = vol / maxVol;
        if (rat > 1) rat = 1;

        if (rat < 0.2) return `rgba(0, 0, ${100 + rat * 5 * 155}, 1)`;
        if (rat < 0.4) return `rgba(0, ${(rat - 0.2) * 5 * 255}, 255, 1)`;
        if (rat < 0.6) return `rgba(0, 255, ${255 - (rat - 0.4) * 5 * 255}, 1)`;
        if (rat < 0.8) return `rgba(${(rat - 0.6) * 5 * 255}, 255, 0, 1)`;
        if (rat < 0.95) return `rgba(255, ${255 - (rat - 0.8) * (1/0.15) * 255}, 0, 1)`;
        return `rgba(255, 255, 255, 1)`;
    };

    useEffect(() => {
        let isRenderActive = true;
        const config = FEED_CONFIGS[feedSource] || FEED_CONFIGS['binance'];
        let connection = null;

        maxVolRef.current = config.defaultMaxVol;
        centerScaleRef.current = 0; // reset scale on feed change

        const initCanvas = () => {
            if (!canvasRef.current || !containerRef.current) return null;
            const canvas = canvasRef.current;
            canvas.width = containerRef.current.clientWidth;
            canvas.height = containerRef.current.clientHeight;

            const ctx = canvas.getContext('2d', { alpha: false }); 
            const off = document.createElement('canvas');
            off.width = canvas.width;
            off.height = canvas.height;
            const octx = off.getContext('2d', { alpha: false });
            
            // Clear screens
            octx.fillStyle = '#050507';
            octx.fillRect(0, 0, off.width, off.height);
            ctx.fillStyle = '#050507';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            return { canvas, ctx, off, octx };
        };

        const renderContext = initCanvas();
        if (!renderContext) return;
        const { canvas, ctx, off, octx } = renderContext;

        const handleResize = () => {
             if (containerRef.current && canvasRef.current) {
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;
                off.width = canvasRef.current.width;
                off.height = canvasRef.current.height;
                // Re-clear on resize
                octx.fillStyle = '#050507';
                octx.fillRect(0, 0, off.width, off.height);
             }
        };
        window.addEventListener('resize', handleResize);

        // Core Render Logic for incoming data
        const processSnapshot = (price, bids, asks) => {
            if (!isRenderActive) return;
            setCurrentPrice(price);

            // Dynamic volume scaling adjustment (EWMA)
            let currentLocalMax = 0;
            bids.forEach(b => currentLocalMax = Math.max(currentLocalMax, b[1]));
            asks.forEach(a => currentLocalMax = Math.max(currentLocalMax, a[1]));
            if (currentLocalMax > maxVolRef.current) {
                maxVolRef.current = currentLocalMax; 
            } else {
                // slowly decay max to adapt to lower volume regimes
                maxVolRef.current = maxVolRef.current * 0.999 + config.defaultMaxVol * 0.001; 
            }

            // Initialize or jump scale if price drifts too far
            if (centerScaleRef.current === 0 || Math.abs(price - centerScaleRef.current) > (config.priceScroll - 10) * config.tickSize) {
                centerScaleRef.current = price;
                // Wipe line indicator
                octx.fillStyle = 'rgba(255, 42, 95, 0.8)'; 
                octx.fillRect(off.width - TICK_W, 0, TICK_W, off.height);
            }

            const topPrice = centerScaleRef.current + (config.priceScroll * config.tickSize);
            const bottomPrice = centerScaleRef.current - (config.priceScroll * config.tickSize);

            // Shift offscreen canvas LEFT
            octx.drawImage(off, TICK_W, 0, off.width - TICK_W, off.height, 0, 0, off.width - TICK_W, off.height);
            
            // Clear newest strip
            octx.fillStyle = '#050507';
            octx.fillRect(off.width - TICK_W, 0, TICK_W, off.height);

            const totalVisibleLevels = config.priceScroll * 2;
            const pxHeight = off.height / totalVisibleLevels;
            const drawHeight = Math.ceil(pxHeight) + 1; // prevent subpixel bleed gaps

            // Helper to draw a level
            const drawLevel = (lvlPrice, vol) => {
                if (lvlPrice <= topPrice && lvlPrice >= bottomPrice) {
                    const levelsFromTop = (topPrice - lvlPrice) / config.tickSize;
                    const y = Math.floor(levelsFromTop * pxHeight);
                    octx.fillStyle = getColor(vol, maxVolRef.current);
                    octx.fillRect(off.width - TICK_W, y, TICK_W, drawHeight);
                }
            };

            bids.forEach(bid => drawLevel(bid[0], bid[1]));
            asks.forEach(ask => drawLevel(ask[0], ask[1]));
            
            // Render the Current Price snaking through
            if (price <= topPrice && price >= bottomPrice) {
                const priceLevelsTop = (topPrice - price) / config.tickSize;
                const pY = Math.floor(priceLevelsTop * pxHeight);
                octx.fillStyle = '#ff2a5f'; // glowing red line
                octx.fillRect(off.width - TICK_W, pY, TICK_W, 2);
            }

            // Copy offscreen to visible canvas
            ctx.drawImage(off, 0, 0);
        };

        const connect = () => {
            setStatus(config.type === 'ws' ? 'Connecting to Exchange WS...' : 'Connecting to Local SSE...');
            
            if (config.type === 'ws') {
                const ws = new WebSocket(config.url);
                ws.onopen = () => setStatus(`Connected: ${feedSource.toUpperCase()} Live Order Book`);
                ws.onmessage = (e) => {
                    const data = JSON.parse(e.data);
                    if (data.bids && data.asks && data.bids.length > 0 && data.asks.length > 0) {
                        try {
                            const bids = data.bids.map(b => [parseFloat(b[0]), parseFloat(b[1])]);
                            const asks = data.asks.map(a => [parseFloat(a[0]), parseFloat(a[1])]);
                            // approximate mid price
                            const midPrice = (bids[0][0] + asks[0][0]) / 2.0;
                            processSnapshot(midPrice, bids, asks);
                        } catch(err) {} 
                    }
                };
                ws.onerror = () => setStatus('Connection Error. Reconnecting...');
                ws.onclose = () => {
                    if (isRenderActive) setTimeout(connect, 2000);
                };
                connectionRef.current = ws;
                connection = ws;

            } else {
                // Legacy Local Tunnel setup
                const endpoint = window.location.hostname === 'localhost' 
                    ? 'http://localhost:3001/stream' 
                    : 'https://e991bce81ac0b5.lhr.life/stream';
                
                const evtSource = new EventSource(endpoint);
                evtSource.onopen = () => setStatus('Connected to C++ Engine Live Feed');
                evtSource.onmessage = (e) => {
                    const data = JSON.parse(e.data);
                    if (data.type === 'snapshot') {
                        processSnapshot(data.price, data.bids, data.asks);
                    }
                };
                evtSource.onerror = () => {
                    setStatus('Feed Disconnected. Reconnecting...');
                    evtSource.close();
                    if(isRenderActive) setTimeout(connect, 2000);
                };
                connectionRef.current = evtSource;
                connection = evtSource;
            }
        };

        connect();

        return () => {
            isRenderActive = false;
            window.removeEventListener('resize', handleResize);
            if (connection) {
                if (connection.close) connection.close();
            }
        };
    }, [feedSource]); // re-run effect if feed source changes

    // Calculate dynamic Y-axis labels
    const renderYAxis = () => {
        const topPrice = centerScaleRef.current + (FEED_CONFIGS[feedSource]?.priceScroll || 50) * (FEED_CONFIGS[feedSource]?.tickSize || 1);
        const bottomPrice = centerScaleRef.current - (FEED_CONFIGS[feedSource]?.priceScroll || 50) * (FEED_CONFIGS[feedSource]?.tickSize || 1);
        const step = (topPrice - bottomPrice) / 5;
        const labels = [];
        for (let i = 0; i <= 5; i++) {
            labels.push(topPrice - (step * i));
        }

        // Where does current price sit percentage wise?
        const pricePercent = topPrice === bottomPrice ? 50 : ((topPrice - currentPrice) / (topPrice - bottomPrice)) * 100;

        return (
            <div className="price-y-axis">
                {labels.map((px, idx) => (
                    <div key={idx} className="price-y-label" style={{ top: `${(idx / 5) * 100}%` }}>
                        {px.toFixed(feedSource.includes('eth') ? 2 : 1)}
                    </div>
                ))}
                
                {pricePercent >= 0 && pricePercent <= 100 && (
                    <div className="current-price-tag" style={{ top: `${pricePercent}%` }}>
                        {currentPrice.toFixed(feedSource.includes('eth') ? 2 : 1)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="heatmap-container" ref={containerRef}>
            <div className="heatmap-overlay">
                <div className="status-panel">
                    <div className="status-indicator">
                        <span className={status.includes('Connected') ? 'pulse-green' : (status.includes('Error') || status.includes('Disconnected') ? 'pulse-red' : 'pulse-yellow')}></span>
                        {status}
                    </div>
                </div>
                <div className="price-panel">
                    <div className="status-indicator" style={{color: 'var(--text-dim)', marginBottom: '5px'}}>TRADED PRICE</div>
                    <div className="price-display">
                        ${currentPrice.toFixed(feedSource.includes('eth') ? 2 : 1)}
                    </div>
                </div>
            </div>
            {renderYAxis()}
            <canvas ref={canvasRef} className="heatmap-canvas" />
        </div>
    );
};

export default HeatmapRenderer;

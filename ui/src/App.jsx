import React, { useState } from 'react';
import HeatmapRenderer from './components/HeatmapRenderer';
import './index.css';

function App() {
  const [feedSource, setFeedSource] = useState('binance'); // default to binance for direct real-world deploy

  return (
    <div className="app-container">
      {/* Top Glassmorphism Navigation UI */}
      <div className="top-header">
        <div className="brand">
          <h1>Toxic <span>Flow</span></h1>
          <div className="meta">L2 ORDERBOOK HEATMAP</div>
        </div>

        <div className="controls-container">
          <select 
            className="feed-select" 
            value={feedSource} 
            onChange={(e) => setFeedSource(e.target.value)}
          >
            <option value="binance">Binance: BTC/USDT (Live)</option>
            <option value="binance-eth">Binance: ETH/USDT (Live)</option>
            <option value="local">Local: C++ Stochastic Engine</option>
          </select>
        </div>
      </div>

      <HeatmapRenderer feedSource={feedSource} />
      
      {/* Bottom Watermark */}
      <div className="watermark">
        <h2>Institutional Grade Tools</h2>
        <p>Ultra-Low Latency Canvas Streaming</p>
      </div>
    </div>
  );
}

export default App;

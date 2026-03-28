import React from 'react';
import HeatmapRenderer from './components/HeatmapRenderer';
import './index.css';

function App() {
  return (
    <div className="app-container">
      <div className="header">
        <h1>BOOKMAP <span>WEB</span></h1>
        <div className="meta">STOCHASTIC L2 MICROSTRUCTURE ENGINE</div>
      </div>
      <HeatmapRenderer />
    </div>
  );
}

export default App;

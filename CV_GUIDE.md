# CV Guide & Project Pitch: Toxic Flow L2 Order Book Heatmap

This document serves as your personal guide on how to position, explain, and leverage this project on your Resume/CV and during technical interviews or networking interactions.

## 🚀 The Elevator Pitch
**"I built an ultra-low latency, institutional-grade order book heatmap (a Bookmap clone) that visualizes real-time Level 2 crypto market data or simulated C++ stochastic order flows. It leverages WebSockets for zero-delay streaming and an optimized HTML5 Canvas engine to render thousands of dynamic data points per second without performance degradation."**

## 💡 Why This Project is Exceptional for Your CV
1. **Solves a Hard Technical Problem**: Rendering high-frequency data (like L2 order books updating every 100ms) instantly crashes poorly written frontend code. You solved this using off-screen canvas buffering, rendering bypassing the DOM.
2. **Shows Full-Stack Competency**: You architected a C++ backend for complex stochastic L2 simulations, bound it through Node/SSE, AND built a production-ready Web Frontend capable of tapping directly into live market API WebSockets (Binance).
3. **Domain Expertise in Finance**: It proves you understand order books, liquidity, market micro-structure, bids/asks, order flow toxicity, and latency—skills highly coveted by HFTs, Prop Shops, and FinTechs.
4. **Visually Stunning**: "Show, don't tell." When recruiters click your GitHub Pages link, they are instantly greeted by live, flashing real-world crypto liquidity. It's an instant "Wow" factor.

## 📝 How to Write it on your Resume

**Project Name**: *Real-Time L2 Order Book Heatmap & Flow Analyzer*
**Tech Stack**: *C++, React, Node.js, WebSockets, HTML5 Canvas, GitHub Pages*

- Designed and deployed an institutional-grade order book visualization tool (similar to Bookmap) capable of rendering high-frequency Level 2 market data streams.
- Architected an ultra-low latency frontend rendering engine using off-screen HTML5 Canvas buffering, successfully processing and rendering 100ms WebSocket payloads from the Binance API without frame drops.
- Developed a high-performance C++ backend simulator utilizing stochastic calculus (random walks, mean reversion) to generate mock limit order book data, streamed to the client via Server-Sent Events (SSE).
- Engineered a dynamic memory/volume scaling algorithm to mathematically normalize liquidity heat colors in real-time, preventing visual washout during extreme market volatility.
- Delivered a dark-mode glassmorphism UI offering multiple data feed integrations, actively deployed as a serverless portfolio showcase on GitHub Pages.

## 🧠 Anticipating Interview Questions

### Q: "How did you handle the performance bottleneck of React updating states 10 times a second?"
**Your Answer**: "React's Virtual DOM reconciliation is too slow for 10Hz updates with thousands of data points. I bypassed React's rendering tier entirely for the matrix visualization. I used a `useRef` to maintain a direct reference to the HTML5 Canvas context and created an off-screen buffer (`document.createElement('canvas')`). When the WebSocket payload arrives, my logic paints the new depth slice directly onto the off-screen buffer and uses `drawImage` to shift it left, natively blitting the result to the visible canvas. React is only used for the UI shell and managing the WebSocket connection lifecycle."

### Q: "Why did you build both a C++ Backend and a Binance WebSocket frontend?"
**Your Answer**: "The C++ backend was crucial for my initial modeling. I wanted to simulate synthetic toxic flows using stochastic math to test how the heatmap handles artificial liquidity voids and spoofing. I used Node to pipe it via SSE. However, for a zero-friction production portfolio piece that anyone could interact with globally without spinning up my backend, I implemented the direct browser-to-Binance WebSocket architecture. It showcases my flexibility in handling both custom engine networking and public streaming APIs."

### Q: "How do you map volume to color in the heatmap?"
**Your Answer**: "Liquidity changes vastly depending on the asset (e.g., BTC volume vs an altcoin). I implemented a dynamic Exponential Weighted Moving Average (EWMA) to track the maximum volume in the book. As volume spikes, the `maxVol` cap rises instantly, ensuring the hottest zones remain visibly distinct (white/red) without washing out the screen. When volume drops, the envelope decays slowly so the colors dynamically re-calibrate to the new micro-environment."

## 🚀 Deployment Instructions for GitHub Pages
Since the app uses relative routing (`base: './'`) and connects perfectly to public WebSockets, building and deploying is effortless:
1. `cd ui`
2. `npm install`
3. `npm run build`
4. Copy the contents of `/ui/dist/` into the root of your `gh-pages` branch, or simply use the `gh-pages` npm package:
   - `npm install -g gh-pages`
   - `gh-pages -d dist`

Share the generated `https://[username].github.io/Bookmap` link on LinkedIn and your CV. It works instantly!

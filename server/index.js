const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const app = express();
app.use(cors());

// List of connected SSE clients
let clients = [];
// Keep latest snapshot to immediately send to new clients
let latestSnapshot = null;

// Determine path to C++ executable (handling Windows/MSVC vs Linux/GCC default paths)
const isWin = process.platform === "win32";
const enginePathRelease = path.join(__dirname, '..', 'cpp-engine', 'build', 'Release', 'simulator.exe');
const enginePathDebug = path.join(__dirname, '..', 'cpp-engine', 'build', 'Debug', 'simulator.exe');
const enginePathDefault = path.join(__dirname, '..', 'cpp-engine', 'build', 'simulator');

const executablePath = isWin ? enginePathRelease : enginePathDefault;

console.log(`Starting C++ Engine from: ${executablePath}`);
let engineProcess;

try {
  engineProcess = spawn(executablePath);

  const rl = readline.createInterface({
      input: engineProcess.stdout,
      terminal: false
  });

  rl.on('line', (line) => {
      try {
          const data = JSON.parse(line);
          latestSnapshot = data; // Cache the latest to instantly feed new clients

          // Broadcast to all SSE clients
          const payload = `data: ${JSON.stringify(data)}\n\n`;
          clients.forEach(client => {
              client.res.write(payload);
          });
      } catch (err) {
          console.error("Failed to parse JSON from engine:", err.message);
      }
  });

  engineProcess.stderr.on('data', (data) => {
      console.error(`[Engine Error]: ${data}`);
  });

  engineProcess.on('close', (code) => {
      console.log(`C++ engine exited with code ${code}`);
  });

} catch (e) {
  console.error("Failed to spawn engine:", e);
}

// SSE Endpoint
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Immediately send the latest snapshot so they don't have to wait
  if (latestSnapshot) {
      res.write(`data: ${JSON.stringify(latestSnapshot)}\n\n`);
  }

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  req.on('close', () => {
      clients = clients.filter(client => client.id !== clientId);
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
  console.log(`SSE endpoint available at http://localhost:${PORT}/stream`);
});

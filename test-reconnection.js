const io = require('socket.io-client');
const os = require('os-utils');
const { v4: uuidv4 } = require('uuid');

const clientId = '3af80972-1118-4ca7-99eb-3480b2c453c8';

// Connect to the server
const socket = io('http://localhost:5000');

// Handle connection event
socket.on('connect', () => {
  console.log('Client connected to server');
  socket.emit('register-client', clientId);
});

// Handle reconnect event
socket.on('reconnect', (attemptNumber) => {
  console.log(`Client reconnected to server on attempt ${attemptNumber}`);
  socket.emit('register-client', clientId);
  startSendingData(); // Start sending data again after reconnection
});

// Handle disconnection
socket.on('disconnect', (reason) => {
  console.log(`Client disconnected from server: ${reason}`);
});

// Simulate heartbeat
setInterval(() => {
  socket.emit('heartbeat', clientId);
}, 5000);

// Handle server shutdown
socket.on('shutdown', () => {
  console.log('Server is shutting down, disconnecting client...');
  socket.disconnect();
  process.exit(); // Exit the client process when the server shuts down
});

// Function to start sending data to the server
function startSendingData() {
  setInterval(() => {
    os.cpuUsage((v) => {
      const data = {
        clientId,
        cpuUsage: v * 100,
        memoryUsage: (os.totalmem() - os.freemem()) / 1024, // Convert to MB
        responseTime: 0, // Placeholder for response time
        active: true,
      };

      socket.emit('client-data', data);
    });
  }, 1000);

  // Measure response time
  setInterval(() => {
    const start = Date.now();
    socket.emit('ping', start);
  }, 5000);

  socket.on('pong', (start) => {
    const responseTime = Date.now() - start;
    socket.emit('client-data', { clientId, responseTime });
  });
}

// Start sending data when the client is initially connected
startSendingData();

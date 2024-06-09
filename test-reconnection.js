const io = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');

const clientId = '8fed8a0a-4f4f-411c-9096-85f4546c6ad8';

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
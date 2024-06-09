const io = require('socket.io-client');
const os = require('os-utils');
const { v4: uuidv4 } = require('uuid');
const cookie = require('js-cookie');

const socket = io.connect('http://localhost:5000');

let clientId = cookie.get('clientId');
if (!clientId) {
  clientId = uuidv4();
  cookie.set('clientId', clientId);
}

let currentTask = null;
let currentIntervalId = null;
let responseTime = 0;  // Initialize response time

const HEARTBEAT_INTERVAL = 5000; // 5 seconds

setInterval(() => {
  os.cpuUsage((v) => {
    const data = {
      clientId,
      cpuUsage: v * 100,
      memoryUsage: (os.totalmem() - os.freemem()) / 1024, // Convert to MB
      responseTime, // Include the measured response time
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
  responseTime = Date.now() - start;  // Update response time
});

socket.on('new-task', (task) => {
  console.log(`Received new task: ${task.id}, count to ${task.number}`);

  currentTask = task;
  const taskId = task.id;
  const targetNumber = task.number;

  socket.emit('client-status', { clientId, status: 'busy' });

  let count = 0;
  currentIntervalId = setInterval(() => {
    count++;
    if (count >= targetNumber) {
      clearInterval(currentIntervalId);
      currentTask = null;
      currentIntervalId = null;
      console.log(`Task ${taskId} done`);
      socket.emit('task-completed', { clientId, taskId, status: 'done' });
      socket.emit('client-status', { clientId, status: 'active' });
    }
  }, 100);

  setTimeout(() => {
    if (currentTask && count < targetNumber) {
      clearInterval(currentIntervalId);
      console.log(`Task ${taskId} failed`);
      socket.emit('task-completed', { clientId, taskId: currentTask.id, status: 'failed' });
      currentTask = null;
      currentIntervalId = null;
      socket.emit('client-status', { clientId, status: 'active' });
    }
  }, task.deadline - Date.now());
});

socket.on('connect', () => {
  console.log('Client connected to server');
  socket.emit('register-client', clientId);
  setInterval(() => {
    socket.emit('heartbeat', clientId);
  }, HEARTBEAT_INTERVAL);
});

socket.on('shutdown', () => {
  console.log('Server is shutting down, disconnecting client...');
  if (currentTask) {
    clearInterval(currentIntervalId);
    console.log(`Task ${currentTask.id} failed (server shutdown)`);
    socket.emit('task-completed', { clientId, taskId: currentTask.id, status: 'failed' });
    currentTask = null;
    currentIntervalId = null;
    socket.emit('client-status', { clientId, status: 'inactive' });
  }
  socket.disconnect();
  process.exit(); // Exit the client process when the server shuts down
});

socket.on('disconnect', () => {
  console.log('Client disconnected from server');
  if (currentTask) {
    clearInterval(currentIntervalId);
    console.log(`Task ${currentTask.id} failed (client disconnected)`);
    socket.emit('task-completed', { clientId, taskId: currentTask.id, status: 'failed' });
    currentTask = null;
    currentIntervalId = null;
  }
});

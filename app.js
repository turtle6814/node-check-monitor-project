const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

mongoose.connect('mongodb://localhost:27017/scalable-system', {});

const clientSchema = new mongoose.Schema({
  id: String,
  socketId: String,
  active: Boolean,
  status: String,  // Added status field
  timestamp: Number,
  cpuUsage: Number,
  memoryUsage: Number,
  responseTime: Number,
  coreUsage: Number,
  tasks: Array,
  lastHeartbeat: Number,
});

const taskSchema = new mongoose.Schema({
  id: String,
  number: Number,
  startTime: Number,
  deadline: Number,
  status: String,
  clientId: String,
});

const Client = mongoose.model('Client', clientSchema);
const Task = mongoose.model('Task', taskSchema);

let totalVirtualCores = os.cpus().length;
let totalContainers = 10; // Assuming 10 containers for example

const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const HEARTBEAT_TIMEOUT = 15000; // 15 seconds

io.on('connection', async (socket) => {
  socket.on('register-client', async (clientId) => {
    socket.clientId = clientId; // Attach clientId to the socket object for easy access

    let client = await Client.findOne({ id: clientId });
    if (!client) {
      console.log(`New client registered: ${clientId}`);
      client = new Client({
        id: clientId,
        socketId: socket.id,
        active: true,
        status: 'active',
        timestamp: Date.now(),
        cpuUsage: 0,
        memoryUsage: 0,
        responseTime: 0,
        coreUsage: 0,
        tasks: [],
        lastHeartbeat: Date.now(),
      });
    } else {
      console.log(`Existing client reconnected: ${clientId}`);
      client.active = true;
      client.socketId = socket.id;
      client.status = 'active';
      client.lastHeartbeat = Date.now();
    }
    await client.save();

    updateClientCounts();
  });

  socket.on('client-data', async (data) => {
    const clientId = data.clientId;
    const client = await Client.findOne({ id: clientId });
    if (client) {
      Object.assign(client, data, { timestamp: Date.now() });
      await client.save();
    }
  });

  socket.on('client-status', async (data) => {
    const clientId = data.clientId;
    const client = await Client.findOne({ id: clientId });
    if (client) {
      client.status = data.status;
      await client.save();
    }
  });

  socket.on('task-completed', async (taskResult) => {
    const { clientId, taskId, status } = taskResult;
    const task = await Task.findOne({ id: taskId });
    if (task) {
      task.status = status;
      task.endTime = Date.now();
      await task.save();

      console.log(`Task ${taskId} completed with status: ${status}`);

      updateTaskMetrics();
    }
  });

  socket.on('heartbeat', async (clientId) => {
    const client = await Client.findOne({ id: clientId });
    if (client) {
      client.lastHeartbeat = Date.now();
      await client.save();
    }
  });

  socket.on('ping', (timestamp) => {
    socket.emit('pong', timestamp);
  });

  socket.on('disconnect', async () => {
    const clientId = socket.clientId;
    if (clientId) {
      console.log(`Client disconnected: ${clientId}`);
      const client = await Client.findOne({ id: clientId });
      if (client) {
        client.active = false;
        client.status = 'inactive';
        await client.save();

        const tasks = await Task.find({ clientId, status: 'running' });
        for (const task of tasks) {
          task.status = 'killed';
          await task.save();
          console.log(`Task ${task.id} killed (client disconnected)`);
        }

        updateClientCounts();
        updateTaskMetrics();
      }
    }
  });
});

setInterval(async () => {
  const cores = os.cpus();
  cores.forEach((core, index) => {
    let total = 0;
    for (const type in core.times) {
      total += core.times[type];
    }
    const usage = 100 - Math.round(100 * core.times.idle / total);

    // Update core usage in database
    Client.updateMany({}, { coreUsage: usage }).exec();
  });
}, 1000);

setInterval(async () => {
  // Check for task deadlines and mark tasks that exceed their allowed execution time as failed
  const tasks = await Task.find({ status: 'running' });
  for (const task of tasks) {
    if (Date.now() > task.deadline && task.status === 'running') {
      task.status = 'failed';
      await task.save();
      updateTaskMetrics();
    }
  }

  // Check for unresponsive clients
  const clients = await Client.find({ active: true });
  for (const client of clients) {
    if (Date.now() - client.lastHeartbeat > HEARTBEAT_TIMEOUT) {
      console.log(`Client ${client.id} is unresponsive`);
      client.active = false;
      client.status = 'inactive';
      await client.save();

      const tasks = await Task.find({ clientId: client.id, status: 'running' });
      for (const task of tasks) {
        task.status = 'killed';
        await task.save();
        console.log(`Task ${task.id} killed (client unresponsive)`);
      }

      updateClientCounts();
      updateTaskMetrics();
    }
  }
}, 1000);

function updateClientCounts() {
  Client.countDocuments().then(totalClients => {
    Client.countDocuments({ active: true }).then(activeClients => {
      io.emit('update-client-count', {
        totalClients,
        activeClients,
        inactiveClients: totalClients - activeClients,
      });
    });
  });
}

function updateTaskMetrics() {
  Task.countDocuments().then(submitted => {
    Task.countDocuments({ status: 'running' }).then(running => {
      Task.countDocuments({ status: 'done' }).then(done => {
        Task.countDocuments({ status: 'failed' }).then(failed => {
          Task.countDocuments({ status: 'killed' }).then(killed => {
            io.emit('task-metrics-updated', {
              submitted,
              running,
              done,
              failed,
              killed,
            });
          });
        });
      });
    });
  });
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/stats', async (req, res) => {
  const clients = await Client.find();
  const totalClients = await Client.countDocuments();
  const activeClients = await Client.countDocuments({ active: true });
  const totalVirtualCores = os.cpus().length;
  const allocatedVirtualCores = activeClients;
  const allocatedContainers = activeClients;
  const allocatedMemory = clients.reduce((sum, client) => sum + client.memoryUsage, 0);
  const taskMetrics = {
    submitted: await Task.countDocuments(),
    running: await Task.countDocuments({ status: 'running' }),
    done: await Task.countDocuments({ status: 'done' }),
    failed: await Task.countDocuments({ status: 'failed' }),
    killed: await Task.countDocuments({ status: 'killed' }),
  };
  const responseTime = clients.reduce((sum, client) => sum + client.responseTime, 0) / totalClients;

  res.json({
    clients,
    totalClients,
    activeClients,
    inactiveClients: totalClients - activeClients,
    totalVirtualCores,
    allocatedVirtualCores,
    allocatedContainers,
    allocatedMemory,
    taskMetrics,
    responseTime,
  });
});

// Endpoint to manually assign tasks to a client
app.post('/assign-task', express.json(), async (req, res) => {
  const { clientId, taskId, number } = req.body;
  const client = await Client.findOne({ id: clientId });
  if (client) {
    const task = new Task({
      id: taskId,
      number,
      startTime: Date.now(),
      deadline: Date.now() + 10000, // 10 seconds to complete the task
      status: 'running',
      clientId,
    });
    await task.save();
    client.tasks.push(task);
    await client.save();
    console.log(`Assigned task ${taskId} to client ${clientId}`);
    io.to(client.socketId).emit('new-task', task);
    updateTaskMetrics();
    res.status(200).send('Task assigned');
  } else {
    res.status(404).send('Client not found');
  }
});

app.delete('/delete-client/:id', async (req, res) => {
  const clientId = req.params.id;
  try {
    await Client.deleteOne({ id: clientId });
    await Task.deleteMany({ clientId: clientId });  // Optionally delete associated tasks
    res.status(200).send({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).send({ message: 'Error deleting client', error });
  }
});

const PORT = 5000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
function gracefulShutdown() {
  console.log('Shutting down server...');
  io.emit('shutdown'); // Emit custom shutdown event to all clients
  server.close(() => {
    console.log('Server shut down.');
    process.exit(0);
  });

  // Force close server after 5 seconds
  setTimeout(() => {
    console.error('Forcing server shut down...');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const { setupSocketHandlers } = require('./socket/handlers');

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

// Socket.IO setup
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN, methods: ['GET', 'POST'] }
});

// Routes
const boardRoutes = require('./routes/boards');
const templateRoutes = require('./routes/templates');
app.use('/api/boards', boardRoutes);
app.use('/api/templates', templateRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket handlers
setupSocketHandlers(io);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };

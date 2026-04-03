/**
 * THE GLITCH - Backend Server
 * 
 * Architecture: Express HTTP server + Socket.io WebSocket server
 * State Management: Redis (room state, player data)
 * Code Execution: Judge0 sandboxed environment
 * 
 * Security Notes:
 * - CORS currently allows all origins (restrict to Vercel domain for production)
 * - Socket.io configured with websocket+polling fallback for compatibility
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const redisClient = require('./config/redis');

const roomRoutes = require('./routes/roomRoutes');
const registerSocketHandlers = require('./sockets');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",  // SECURITY: Restrict to Vercel domain for production
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
});

const PORT = process.env.PORT || 3000;

/** Express middleware stack */
app.use(cors());
app.use(express.json());

/** REST API routes for room lifecycle management */
app.use('/room', roomRoutes);

/** Kubernetes/Docker health probe endpoint */
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/** Initialize all Socket.io event handlers */
registerSocketHandlers(io);

// Start server
async function startServer() {
  try {
    // Connect to Redis
    await redisClient.connect();
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await redisClient.quit();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

startServer();

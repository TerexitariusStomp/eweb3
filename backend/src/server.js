import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import http from 'http';

import routes from './api/routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware.js';
import { verifyContractDeployment } from './config/blockchain.config.js';
import blockchainService from './services/blockchain.service.js';
import logger from './utils/logger.js';
import { WS_EVENTS } from './utils/constants.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const WS_PORT = process.env.WS_PORT || 3001;

// Create HTTP server for WebSocket
const server = http.createServer(app);

/**
 * Middleware Configuration
 */

// Security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      body: req.body,
      query: req.query,
      params: req.params
    });
    next();
  });
}

/**
 * Routes
 */
app.use('/', routes);

// Serve static files for dashboard
app.use(express.static('public'));

/**
 * Error Handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * WebSocket Server for Real-time Updates
 */
const wss = new WebSocketServer({ 
  port: WS_PORT,
  path: '/ws'
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const clientId = req.socket.remoteAddress;
  logger.info('WebSocket client connected', { clientId });
  
  // Send welcome message
  ws.send(JSON.stringify({
    event: WS_EVENTS.CONNECTION,
    message: 'Connected to EDN Blockchain Recorder',
    timestamp: new Date().toISOString()
  }));
  
  // Heartbeat
  const heartbeat = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        event: WS_EVENTS.HEARTBEAT,
        timestamp: new Date().toISOString()
      }));
    }
  }, parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000);
  
  // Handle disconnection
  ws.on('close', () => {
    logger.info('WebSocket client disconnected', { clientId });
    clearInterval(heartbeat);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    logger.error('WebSocket error', { clientId, error: error.message });
    clearInterval(heartbeat);
  });
});

let unsubscribe = null;
// Subscribe to new blockchain transactions and broadcast via WebSocket (skip in local dev if contract not deployed)
try {
  unsubscribe = blockchainService.subscribeToNewTransactions((transaction, event) => {
    logger.info('Broadcasting new transaction via WebSocket', {
      uuid: transaction.uuid,
      clientCount: wss.clients.size
    });
    
    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify({
          event: WS_EVENTS.NEW_TRANSACTION,
          data: transaction,
          timestamp: new Date().toISOString()
        }));
      }
    });
  });
} catch (error) {
  logger.warn('Failed to subscribe to blockchain events - continuing without real-time updates', {
    error: error.message
  });
}

/**
 * Graceful Shutdown
 */
const shutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new requests
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close WebSocket server
  wss.close(() => {
    logger.info('WebSocket server closed');
  });
  
  // Unsubscribe from blockchain events
  if (unsubscribe) {
    unsubscribe();
    logger.info('Unsubscribed from blockchain events');
  }
  
  // Give ongoing requests time to complete
  setTimeout(() => {
    logger.info('Shutdown complete');
    process.exit(0);
  }, 5000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * Startup
 */
async function startServer() {
  try {
    logger.info('Starting EDN Blockchain Recorder...');
    
    // Verify contract deployment (non-fatal for local dev)
    let contractInfo = { status: 'skipped' };
    try {
      contractInfo = await verifyContractDeployment();
      logger.info('Contract verified', contractInfo);
    } catch (verificationError) {
      logger.warn('Contract verification failed - continuing in mock mode for local development', {
        error: verificationError.message,
        address: process.env.CONTRACT_ADDRESS
      });
    }
    
    // Start HTTP server
    server.listen(PORT, HOST, () => {
      logger.info(`HTTP server listening on ${HOST}:${PORT}`);
      logger.info(`Dashboard: http://${HOST}:${PORT}/`);
      logger.info(`Webhook endpoint: http://${HOST}:${PORT}/webhook/transaction`);
      logger.info(`Health check: http://${HOST}:${PORT}/health`);
    });
    
    logger.info(`WebSocket server listening on port ${WS_PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('EDN Blockchain Recorder started successfully');
    
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason,
    promise
  });
});

// Start the server
startServer();

export default app;

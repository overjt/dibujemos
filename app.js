// Load environment variables
require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const Canvas = require('canvas');

// Import custom modules
const logger = require('./utils/logger');
const SocketHandlers = require('./handlers/socketHandlers');
const indexRoutes = require('./routes/index');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Canvas
const canvasWidth = parseInt(process.env.CANVAS_WIDTH) || 3800;
const canvasHeight = parseInt(process.env.CANVAS_HEIGHT) || 2000;
const canvas = new Canvas.Canvas(canvasWidth, canvasHeight);
const ctx = canvas.getContext('2d');

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Initialize socket handlers
const socketHandlers = new SocketHandlers(io, canvas, ctx);

// Timer configuration
let timer = parseInt(process.env.TIMER) || 300;
const timerReset = timer;

// Security middleware
if (process.env.HELMET_ENABLED !== 'false') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "code.jquery.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"]
      }
    }
  }));
}

// CORS middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true
}));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Express configuration
app.set('port', process.env.PORT || 3000);
app.set('timer', timerReset);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Trust proxy (important for rate limiting behind reverse proxies)
app.set('trust proxy', 1);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files and Stylus middleware
app.use(require('stylus').middleware({
  src: path.join(__dirname, 'public'),
  compress: process.env.NODE_ENV === 'production'
}));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes
app.use('/', indexRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(500).render('error', {
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    message: 'Page not found',
    error: {}
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  try {
    socketHandlers.handleConnection(socket, timer);
  } catch (error) {
    logger.error('Error in socket connection handler', {
      error: error.message,
      socketId: socket.id
    });
  }
});

// Timer interval for canvas clearing
const timerInterval = setInterval(() => {
  try {
    timer = timer - 1;
    if (timer <= 0) {
      timer = timerReset;
      socketHandlers.clearCanvas(timer);
      logger.info('Canvas cleared by timer', { newTimer: timer });
    }
  } catch (error) {
    logger.error('Error in timer interval', {
      error: error.message
    });
  }
}, 1000);

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Clear the timer interval
  clearInterval(timerInterval);
  
  // Close the server
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err.message });
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
  process.exit(1);
});

// Start server
server.listen(app.get('port'), () => {
  logger.info(`Let'sDraw server started`, {
    port: app.get('port'),
    environment: process.env.NODE_ENV || 'development',
    timer: timerReset
  });
});

module.exports = app;
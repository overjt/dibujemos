const logger = require('../utils/logger');
const { validateMovementData } = require('../utils/validation');

class SocketHandlers {
  constructor(io, canvas, ctx) {
    this.io = io;
    this.canvas = canvas;
    this.ctx = ctx;
    this.connections = 0;
    this.clients = {};
    this.rateLimitMap = new Map(); // For rate limiting per client
  }

  /**
   * Rate limiting check for drawing events
   * @param {string} socketId - Socket ID
   * @returns {boolean} Whether the request should be allowed
   */
  checkRateLimit(socketId) {
    const now = Date.now();
    const limit = 30; // Max 30 drawing events per second
    const window = 1000; // 1 second window

    if (!this.rateLimitMap.has(socketId)) {
      this.rateLimitMap.set(socketId, { count: 1, resetTime: now + window });
      return true;
    }

    const clientData = this.rateLimitMap.get(socketId);
    
    if (now > clientData.resetTime) {
      // Reset the window
      clientData.count = 1;
      clientData.resetTime = now + window;
      return true;
    }

    if (clientData.count >= limit) {
      return false;
    }

    clientData.count++;
    return true;
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket.io socket object
   * @param {number} timer - Current timer value
   */
  handleConnection(socket, timer) {
    this.connections++;
    logger.info(`Client connected. Total connections: ${this.connections}`, {
      socketId: socket.id,
      connections: this.connections
    });

    try {
      // Send initial data to new client
      socket.emit('init', {
        connections: this.connections,
        paper: this.canvas.toDataURL(),
        timer: timer
      });

      // Broadcast connection count to all other clients
      socket.broadcast.emit('connections', {
        connections: this.connections
      });

      // Set up event handlers for this socket
      this.setupSocketEvents(socket);

    } catch (error) {
      logger.error('Error handling new connection', {
        error: error.message,
        socketId: socket.id
      });
    }
  }

  /**
   * Set up event handlers for a socket
   * @param {Object} socket - Socket.io socket object
   */
  setupSocketEvents(socket) {
    // Handle mouse movement/drawing
    socket.on('mousemove', (data) => {
      try {
        // Rate limiting check
        if (!this.checkRateLimit(socket.id)) {
          logger.warn('Rate limit exceeded for drawing events', {
            socketId: socket.id
          });
          return;
        }

        // Validate the movement data
        const validation = validateMovementData(data);
        if (!validation.isValid) {
          logger.warn('Invalid movement data received', {
            error: validation.error,
            socketId: socket.id,
            data: data
          });
          return;
        }

        // Process the validated movement
        this.handleMovement(validation.data);
        
        // Broadcast to other clients
        socket.broadcast.emit('move', validation.data);

      } catch (error) {
        logger.error('Error handling mousemove event', {
          error: error.message,
          socketId: socket.id
        });
      }
    });

    // Handle ping for latency measurement
    socket.on('ping', () => {
      try {
        socket.emit('pong');
      } catch (error) {
        logger.error('Error handling ping event', {
          error: error.message,
          socketId: socket.id
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      try {
        this.handleDisconnection(socket);
      } catch (error) {
        logger.error('Error handling disconnection', {
          error: error.message,
          socketId: socket.id
        });
      }
    });
  }

  /**
   * Handle mouse movement and drawing
   * @param {Object} data - Validated movement data
   */
  handleMovement(data) {
    try {
      if (data.drawing && this.clients[data.id]) {
        this.drawLine(
          this.clients[data.id].x,
          this.clients[data.id].y,
          data.x,
          data.y,
          data.color
        );
      }

      // Update client state
      this.clients[data.id] = data;
      this.clients[data.id].updated = Date.now();

    } catch (error) {
      logger.error('Error handling movement', {
        error: error.message,
        clientId: data.id
      });
    }
  }

  /**
   * Draw line on server canvas
   * @param {number} fromx - Start X coordinate
   * @param {number} fromy - Start Y coordinate
   * @param {number} tox - End X coordinate
   * @param {number} toy - End Y coordinate
   * @param {string} color - Line color
   */
  drawLine(fromx, fromy, tox, toy, color) {
    try {
      this.ctx.beginPath();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.moveTo(fromx, fromy);
      this.ctx.lineTo(tox, toy);
      this.ctx.stroke();
    } catch (error) {
      logger.error('Error drawing line', {
        error: error.message,
        fromx, fromy, tox, toy, color
      });
    }
  }

  /**
   * Handle client disconnection
   * @param {Object} socket - Socket.io socket object
   */
  handleDisconnection(socket) {
    this.connections--;
    
    // Clean up rate limiting data
    this.rateLimitMap.delete(socket.id);
    
    logger.info(`Client disconnected. Total connections: ${this.connections}`, {
      socketId: socket.id,
      connections: this.connections
    });

    // Broadcast updated connection count
    socket.broadcast.emit('connections', {
      connections: this.connections
    });
  }

  /**
   * Clear the canvas and notify all clients
   * @param {number} timer - New timer value
   */
  clearCanvas(timer) {
    try {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.io.sockets.emit('clear', { timer: timer });
      logger.info('Canvas cleared', { timer });
    } catch (error) {
      logger.error('Error clearing canvas', {
        error: error.message
      });
    }
  }
}

module.exports = SocketHandlers;
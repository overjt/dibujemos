#!/usr/bin/env node

const http = require('http');
const { io } = require('socket.io-client');

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3000;
const TIMEOUT = 5000;

// Health check function
async function healthCheck() {
  try {
    // Check HTTP endpoint
    await checkHTTP();
    
    // Check Socket.IO connectivity
    await checkSocketIO();
    
    console.log('Health check passed');
    process.exit(0);
  } catch (error) {
    console.error('Health check failed:', error.message);
    process.exit(1);
  }
}

// Check HTTP endpoint
function checkHTTP() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/',
      method: 'GET',
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`HTTP check failed with status code: ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(new Error(`HTTP check failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('HTTP check timed out'));
    });

    req.end();
  });
}

// Check Socket.IO connectivity
function checkSocketIO() {
  return new Promise((resolve, reject) => {
    const socket = io(`http://${HOST}:${PORT}`, {
      timeout: TIMEOUT,
      transports: ['websocket', 'polling']
    });

    const timeoutId = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket.IO check timed out'));
    }, TIMEOUT);

    socket.on('connect', () => {
      clearTimeout(timeoutId);
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeoutId);
      socket.disconnect();
      reject(new Error(`Socket.IO check failed: ${error.message}`));
    });

    socket.on('disconnect', () => {
      clearTimeout(timeoutId);
    });
  });
}

// Run health check
healthCheck();
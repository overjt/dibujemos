const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * Home route - renders the main drawing interface
 */
router.get('/', (req, res) => {
  try {
    res.render('index', {
      title: 'Let\'sDraw - Real-time Collaborative Drawing'
    });
  } catch (error) {
    logger.error('Error rendering home page', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(500).send('Internal server error');
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * API status endpoint
 */
router.get('/api/status', (req, res) => {
  try {
    res.json({
      status: 'active',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in status endpoint', {
      error: error.message
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
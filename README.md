# Let'sDraw - Collaborative Drawing Application

A real-time collaborative drawing application built with Node.js, Express, and Socket.IO. Multiple users can draw simultaneously on a shared canvas that automatically clears every 5 minutes.

## ✨ Recent Modernization (2025)

This application has been completely modernized with the following improvements:

### 🔧 Dependencies Updated
- **Node.js**: Updated to require v20.x LTS
- **Express.js**: Updated from 4.12.3 to 4.18.2
- **Socket.IO**: Updated from 1.3.5 to 4.7.4 (with breaking changes handled)
- **EJS**: Updated from 2.3.1 to 3.1.9
- **Canvas**: Updated from 1.2.2 to 2.11.2
- **Stylus**: Updated from 0.50.0 to 0.60.0

### 🛡️ Security Improvements
- Added **Helmet.js** for security headers
- Implemented **CORS** configuration
- Added **rate limiting** for API endpoints and drawing events
- Input validation and sanitization for socket events
- Secure environment variable management

### 🏗️ Code Architecture
- **Modular structure**: Separated routes, socket handlers, and utilities
- **Modern error handling**: Try-catch blocks and proper error logging
- **Structured logging**: Winston logger with different log levels
- **Input validation**: Comprehensive validation for drawing data
- **Rate limiting**: Per-client rate limiting for drawing events

### 🌐 Frontend Modernization
- **Removed jQuery**: Replaced with vanilla JavaScript
- **Socket.IO v4**: Updated client to match server version
- **Better error handling**: Improved error handling and reconnection logic
- **Mobile support**: Added touch events for mobile devices
- **Accessibility**: Improved ARIA labels and semantic HTML

### ⚙️ Configuration Management
- **Environment variables**: Configurable via `.env` file
- **Graceful shutdown**: Proper server shutdown handling
- **Health checks**: Added health check endpoints

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd letsdraw
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (optional)
   ```bash
   # Edit .env file with your preferred settings
   nano .env
   ```

5. **Start the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | Server port |
| `TIMER` | `300` | Canvas clear interval (seconds) |
| `CANVAS_WIDTH` | `3800` | Canvas width in pixels |
| `CANVAS_HEIGHT` | `2000` | Canvas height in pixels |
| `RATE_LIMIT_WINDOW_MS` | `15000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `CORS_ORIGIN` | `*` | CORS allowed origins |
| `HELMET_ENABLED` | `true` | Enable security headers |

## 🏗️ Architecture

### Directory Structure
```
letsdraw/
├── handlers/           # Socket.IO event handlers
│   └── socketHandlers.js
├── routes/            # Express routes
│   └── index.js
├── utils/             # Utility modules
│   ├── logger.js      # Winston logging configuration
│   └── validation.js  # Input validation functions
├── views/             # EJS templates
│   ├── index.ejs      # Main application page
│   └── error.ejs      # Error page template
├── public/            # Static assets
│   ├── javascripts/   # Client-side JavaScript
│   ├── stylesheets/   # CSS and Stylus files
│   └── images/        # Image assets
├── logs/              # Application logs (created automatically)
├── .env.example       # Environment variables template
├── app.js             # Main application file
└── package.json       # Dependencies and scripts
```

### Key Features

- **Real-time Drawing**: Synchronized drawing across all connected clients
- **Auto-clear Timer**: Canvas automatically clears every 5 minutes (configurable)
- **Color Selection**: Built-in color picker for brush colors
- **Connection Status**: Live display of connected users
- **Latency Display**: Network latency measurement (press Tab)
- **Mobile Support**: Touch-friendly interface
- **Rate Limiting**: Prevents spam and abuse
- **Error Handling**: Comprehensive error handling and logging

## 🔒 Security Features

- **Input Validation**: All socket events are validated and sanitized
- **Rate Limiting**: Prevents drawing spam and DoS attacks
- **CORS Protection**: Configurable cross-origin request handling
- **Security Headers**: Helmet.js provides security headers
- **Error Handling**: Secure error messages without information leakage

## 📊 Monitoring

### Health Check Endpoint
```bash
GET /health
```

### API Status Endpoint  
```bash
GET /api/status
```

### Logs
Logs are written to the `logs/` directory:
- `error.log` - Error-level logs only
- `combined.log` - All log levels

## 🚀 Deployment

### Local Development Setup

1. **Standard Installation**
   ```bash
   git clone https://github.com/your-repo/letsdraw.git
   cd letsdraw
   npm install
   cp .env.example .env
   npm run dev
   ```

2. **Docker Development**
   ```bash
   git clone https://github.com/your-repo/letsdraw.git
   cd letsdraw
   docker-compose -f docker-compose.dev.yml up
   ```

### Production Deployment Options

#### Option 1: Traditional Server Deployment

**Prerequisites:**
- Node.js 20.x or higher
- Nginx (recommended reverse proxy)
- SSL certificate
- Process manager (PM2 recommended)

**Steps:**
1. **Server Setup**
   ```bash
   # Install Node.js 20.x
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 globally
   sudo npm install -g pm2
   ```

2. **Application Deployment**
   ```bash
   git clone https://github.com/your-repo/letsdraw.git
   cd letsdraw
   npm ci --only=production
   cp .env.example .env
   ```

3. **Environment Configuration**
   ```bash
   # Edit production environment
   nano .env
   ```
   ```env
   NODE_ENV=production
   PORT=3000
   CORS_ORIGIN=https://yourdomain.com
   RATE_LIMIT_WINDOW_MS=15000
   RATE_LIMIT_MAX_REQUESTS=100
   HELMET_ENABLED=true
   ```

4. **Start with PM2**
   ```bash
   pm2 start app.js --name "letsdraw"
   pm2 startup
   pm2 save
   ```

5. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name yourdomain.com;
       
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           
           # WebSocket support
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

#### Option 2: Docker Production Deployment

**Single Container:**
```bash
# Build production image
docker build -t letsdraw:latest .

# Run container
docker run -d \
  --name letsdraw-app \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  letsdraw:latest
```

**Docker Compose (Recommended):**
```bash
# Production deployment
docker-compose -f docker-compose.yml up -d

# With monitoring and debugging tools
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### Production Checklist

**Security:**
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `CORS_ORIGIN` (no wildcards)
- [ ] Enable `HELMET_ENABLED=true`
- [ ] Set up SSL/TLS certificate
- [ ] Configure firewall rules (allow only 80, 443, 22)
- [ ] Regular security updates
- [ ] Use strong passwords and SSH keys

**Performance:**
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Configure proper caching headers
- [ ] Optimize rate limiting settings
- [ ] Monitor memory and CPU usage

**Reliability:**
- [ ] Set up process manager (PM2/Docker restart policies)
- [ ] Configure log rotation
- [ ] Set up monitoring and alerts
- [ ] Implement backup strategy
- [ ] Configure health checks
- [ ] Set up automatic deployments

**Scaling:**
- [ ] Consider persistent storage for session management in multi-instance setup
- [ ] Configure load balancer with sticky sessions
- [ ] Set up auto-scaling rules
- [ ] Monitor WebSocket connection limits
- [ ] Plan for database scaling (if implemented)

### Cloud Deployment

For cloud deployments, see the dedicated deployment guides:
- [AWS Deployment Guide](deploy/aws/README.md) - ECS Fargate, ALB
- [Azure Deployment Guide](deploy/azure/README.md) - Container Instances, Application Gateway
- [Google Cloud Deployment Guide](deploy/gcp/README.md) - Cloud Run, Load Balancing

### Performance Optimization

**Application Level:**
- Adjust rate limiting based on expected traffic
- Monitor canvas size vs. performance
- Use compression middleware
- Implement proper error handling

**Infrastructure Level:**
- Use CDN for static assets
- Configure proper caching
- Monitor and scale resources
- Use health checks and auto-restart

**WebSocket Optimization:**
- Configure proper timeout settings
- Monitor connection pool limits
- Use sticky sessions with load balancers
- Consider WebSocket clustering with session affinity

### Security Best Practices

**Application Security:**
- Input validation and sanitization
- Rate limiting and DDoS protection
- Secure headers with Helmet.js
- Regular dependency updates

**Infrastructure Security:**
- SSL/TLS encryption
- Firewall configuration
- Regular security patches
- Access logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Common Issues

1. **Canvas not loading**: Check browser compatibility and Canvas library installation
2. **Socket connection fails**: Verify firewall settings and CORS configuration
3. **High memory usage**: Monitor the number of connected clients and canvas size
4. **Drawing lag**: Check network latency and rate limiting settings

### Performance Tips

- Adjust `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` based on your needs
- Consider reducing `CANVAS_WIDTH` and `CANVAS_HEIGHT` for better performance
- Use a reverse proxy (nginx) for static asset serving in production
- Enable gzip compression for better network performance

## 📞 Support

For issues and questions, please create an issue in the repository or contact the maintainer.
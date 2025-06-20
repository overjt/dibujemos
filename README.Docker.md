# Docker Setup for Let'sDraw

This document provides comprehensive instructions for running the Let'sDraw collaborative drawing application using Docker.

## 🐳 Docker Architecture

The application uses a multi-service architecture:

- **letsdraw**: Main Node.js application with Socket.IO (uses in-memory storage)
- **nginx**: Reverse proxy and load balancer (production only)

## 🚀 Quick Start

### Development Environment

1. **Copy environment file:**
   ```bash
   cp .env.docker .env
   ```

2. **Start development environment:**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

3. **Access the application:**
   - Application: http://localhost:3000

### Production Environment

1. **Copy and configure environment:**
   ```bash
   cp .env.docker .env
   # Edit .env with your production settings
   ```

2. **Start production environment:**
   ```bash
   docker-compose up --build -d
   ```

3. **With Nginx reverse proxy:**
   ```bash
   docker-compose --profile production up --build -d
   ```

## 📋 Available Commands

### Development
```bash
# Start development with hot reload
docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Clean up volumes
docker-compose -f docker-compose.dev.yml down -v
```

### Production
```bash
# Start production services
docker-compose up --build -d

# Start with nginx reverse proxy
docker-compose --profile production up --build -d

# View logs
docker-compose logs -f letsdraw

# Scale the application
docker-compose up --scale letsdraw=3 -d

# Stop services
docker-compose down

# Complete cleanup
docker-compose down -v --rmi all
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.docker`:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Canvas and Timer
TIMER=300
CANVAS_WIDTH=3800
CANVAS_HEIGHT=2000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
CORS_ORIGIN=*
HELMET_ENABLED=true

# Nginx (production)
NGINX_PORT=80
NGINX_SSL_PORT=443
```

### Volume Persistence

The setup includes persistent volumes for:
- **app-logs**: Application logs
- **dev-logs**: Development logs

**Note**: The application uses in-memory storage for rate limiting and session management. Data is not persisted between container restarts, which is suitable for the collaborative drawing use case.

## 🔍 Health Checks

All services include comprehensive health checks:

- **Application**: HTTP endpoint + Socket.IO connectivity
- **Nginx**: HTTP health endpoint

Monitor health status:
```bash
docker-compose ps
```

## 🛡️ Security Features

### Application Security
- Non-root user execution
- Minimal Alpine-based images
- Security headers via Helmet.js
- Rate limiting
- CORS configuration

### Network Security
- Isolated Docker network
- Nginx reverse proxy
- SSL/TLS termination support
- Request rate limiting

## 📊 Monitoring and Logs

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f letsdraw

# Live tail with timestamps
docker-compose logs -f --timestamps letsdraw
```

### Performance Monitoring
```bash
# Container stats
docker stats

# Service resource usage
docker-compose top
```

## 🔧 Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Change ports in .env file
   PORT=3001
   NGINX_PORT=8080
   ```

2. **Canvas/Socket.IO issues:**
   ```bash
   # Check application logs
   docker-compose logs letsdraw
   
   # Test health endpoint
   curl http://localhost:3000/
   ```

4. **Permission issues:**
   ```bash
   # Rebuild with no cache
   docker-compose build --no-cache
   ```

### Debugging

1. **Access container shell:**
   ```bash
   docker-compose exec letsdraw sh
   ```

2. **Check running processes:**
   ```bash
   docker-compose exec letsdraw ps aux
   ```

3. **Inspect network:**
   ```bash
   docker network inspect letsdraw_letsdraw-network
   ```

## 🚀 Production Deployment

### Docker Swarm
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml letsdraw
```

### Kubernetes
```bash
# Generate Kubernetes manifests
kompose convert -f docker-compose.yml
```

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        run: |
          docker-compose -f docker-compose.yml up --build -d
```

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale application instances
docker-compose up --scale letsdraw=3 -d

# With load balancer
docker-compose --profile production up --scale letsdraw=3 -d
```

### Resource Limits
Modify `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
    reservations:
      memory: 512M
      cpus: '0.5'
```

## 🧹 Maintenance

### Regular Tasks
```bash
# Update images
docker-compose pull

# Clean unused resources
docker system prune -f

# View container sizes
docker images
```

### Backup and Restore
```bash
# Backup application logs
docker run --rm -v letsdraw_app-logs:/source -v $(pwd):/backup alpine tar czf /backup/app-logs-backup.tar.gz -C /source .

# Restore application logs
docker run --rm -v letsdraw_app-logs:/target -v $(pwd):/backup alpine tar xzf /backup/app-logs-backup.tar.gz -C /target
```

## 📝 Additional Notes

- The application uses Canvas API which requires system libraries (included in Dockerfile)
- Socket.IO requires proper WebSocket handling (configured in nginx.conf)
- Application uses in-memory storage for rate limiting and session management
- Health checks ensure proper service startup order
- Multi-stage build optimizes final image size
- Data is not persisted between container restarts, which is suitable for the collaborative drawing use case

For more information, see the main README.md file.
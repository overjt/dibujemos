# Multi-stage build for optimal image size and security
# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --only=production --silent

# Production stage
FROM node:20-alpine AS production

# Install system dependencies required for canvas package
RUN apk add --no-cache \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S letsdraw -u 1001

# Set working directory  
WORKDIR /app

# Copy production dependencies from builder stage
COPY --from=builder --chown=letsdraw:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=letsdraw:nodejs . .

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R letsdraw:nodejs logs

# Switch to non-root user
USER letsdraw

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node healthcheck.js

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
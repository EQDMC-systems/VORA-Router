# VORA Router - Docker Container for Cloud Run
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Run as non-root user for security
USER node

# Expose port (Cloud Run will set PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start server
CMD ["node", "src/server.js"]

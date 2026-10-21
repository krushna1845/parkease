FROM node:20-alpine

# Create app user to avoid running as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install dependencies from lockfile (reproducible)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code (no .env, no node_modules — handled by dockerignore)
COPY . .

# Switch to non-root user
USER appuser

EXPOSE 5000

# Health check using the /api/health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Use production start command, not dev watcher
CMD ["node", "server.js"]

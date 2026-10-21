# ───────────────────────────────────────────────
# Stage 1 – Build the React application
# ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies reproducibly from lockfile
COPY package*.json ./
RUN npm ci

# Copy source and build (VITE_API_URL is baked at build time via ARG)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ───────────────────────────────────────────────
# Stage 2 – Serve compiled assets with Nginx
# ───────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Custom nginx config: SPA fallback + proxy /api → backend
COPY nginx.conf /etc/nginx/conf.d/parkease.conf

# Copy compiled assets from build stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

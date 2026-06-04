# Use official Node.js alpine base image
FROM node:20-alpine AS base

WORKDIR /app

# Copy package config first to leverage caching
COPY package*.json ./

# Install both production and development dependencies
RUN npm install

# Copy remaining source code files
COPY . .

# Build Vite frontend assets and bundle Express backend to dist/server.cjs
RUN npm run build

# Expose primary port 3000 as routed by Cloud ingress
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start utilizing compiled production server bundle
CMD ["npm", "start"]

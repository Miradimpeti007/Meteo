FROM node:20-alpine AS builder
WORKDIR /app

# Install backend dependencies from backend/src package manifests.
COPY src/package*.json ./
RUN npm ci --omit=dev

# Copy backend source code into image.
COPY src/ ./

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./
EXPOSE 8080
CMD ["node", "server.js"]

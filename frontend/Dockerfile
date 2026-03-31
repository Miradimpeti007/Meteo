FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci 2>/dev/null || true
COPY . .
RUN npm run build 2>/dev/null || true

FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
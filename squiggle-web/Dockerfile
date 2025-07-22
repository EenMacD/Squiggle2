# Simple frontend-only Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY squiggle-ui/package*.json ./
RUN npm ci
COPY squiggle-ui/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 
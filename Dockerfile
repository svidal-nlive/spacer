# Multi-stage build for spacer (Vite static site)

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
# Install deps (prefer ci when lockfile exists)
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]

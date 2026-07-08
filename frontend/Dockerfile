# Builder stage installs dependencies and produces the production React bundle.
FROM node:22-slim AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Runtime stage serves the static build with nginx.
FROM nginx:1.27-alpine AS runtime

RUN printf '%s\n' \
    'server {' \
    '    listen 80;' \
    '    server_name _;' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
    '' \
    '    location / {' \
    '        try_files $uri $uri/ /index.html;' \
    '    }' \
    '' \
    '    location /health {' \
    '        access_log off;' \
    '        return 200 "ok";' \
    '        add_header Content-Type text/plain;' \
    '    }' \
    '}' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]

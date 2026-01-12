# Deployment Guide

This guide covers deploying Flywheel Gateway to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Manual Deployment](#manual-deployment)
6. [Reverse Proxy Setup](#reverse-proxy-setup)
7. [Monitoring](#monitoring)
8. [Backup and Recovery](#backup-and-recovery)
9. [Scaling](#scaling)

## Prerequisites

- Docker 24+ and Docker Compose 2.20+ (for containerized deployment)
- Kubernetes 1.28+ (for k8s deployment)
- PostgreSQL 15+ (for production; SQLite works for development)
- Domain with SSL certificate
- 2+ vCPU, 4GB+ RAM minimum

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | Database connection string |
| `JWT_SECRET` | Yes | - | Secret for JWT signing (32+ chars) |
| `PORT` | No | 3000 | HTTP server port |
| `NODE_ENV` | No | development | Environment mode |
| `CORS_ORIGINS` | No | * | Allowed CORS origins |
| `LOG_LEVEL` | No | info | Logging verbosity (debug, info, warn, error) |
| `WS_HEARTBEAT_INTERVAL` | No | 30000 | WebSocket heartbeat in ms |

### Optional Provider Keys

```bash
ANTHROPIC_API_KEY=""      # Claude API (fallback for BYOA)
OPENAI_API_KEY=""         # OpenAI/Codex API (fallback for BYOA)
GOOGLE_AI_API_KEY=""      # Gemini API (fallback for BYOA)
```

## Docker Deployment

### Quick Start with Docker Compose

```yaml
# docker-compose.yml
version: "3.9"

services:
  gateway:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://flywheel:secret@db:5432/flywheel"
      JWT_SECRET: "${JWT_SECRET}"
      NODE_ENV: "production"
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "5173:80"
    depends_on:
      - gateway
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: flywheel
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: flywheel
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U flywheel"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Running

```bash
# Create environment file
cp .env.example .env
# Edit .env with production values

# Start services
docker compose up -d

# View logs
docker compose logs -f gateway

# Run migrations
docker compose exec gateway bun db:migrate
```

### Dockerfile

```dockerfile
# Dockerfile
FROM oven/bun:1.3 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/gateway/package.json apps/gateway/
COPY packages/shared/package.json packages/shared/
COPY packages/flywheel-clients/package.json packages/flywheel-clients/
RUN bun install --frozen-lockfile

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production image
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/apps/gateway/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
```

## Kubernetes Deployment

### Deployment Manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flywheel-gateway
  labels:
    app: flywheel-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: flywheel-gateway
  template:
    metadata:
      labels:
        app: flywheel-gateway
    spec:
      containers:
        - name: gateway
          image: ghcr.io/dicklesworthstone/flywheel-gateway:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: flywheel-secrets
                  key: database-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: flywheel-secrets
                  key: jwt-secret
            - name: NODE_ENV
              value: "production"
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20
---
apiVersion: v1
kind: Service
metadata:
  name: flywheel-gateway
spec:
  selector:
    app: flywheel-gateway
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flywheel-gateway
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/websocket-services: "flywheel-gateway"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.flywheel.example.com
      secretName: flywheel-tls
  rules:
    - host: api.flywheel.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: flywheel-gateway
                port:
                  number: 80
```

### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: flywheel-secrets
type: Opaque
stringData:
  database-url: "postgresql://user:pass@postgres:5432/flywheel"
  jwt-secret: "your-production-jwt-secret-at-least-32-characters"
```

### Deploying

```bash
# Create namespace
kubectl create namespace flywheel

# Apply secrets
kubectl apply -f k8s/secrets.yaml -n flywheel

# Deploy application
kubectl apply -f k8s/deployment.yaml -n flywheel

# Check status
kubectl get pods -n flywheel
kubectl logs -f deployment/flywheel-gateway -n flywheel
```

## Manual Deployment

For deployments without containers:

```bash
# Clone repository
git clone https://github.com/Dicklesworthstone/flywheel_gateway.git
cd flywheel_gateway

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Build
bun run build

# Set environment variables
export DATABASE_URL="postgresql://..."
export JWT_SECRET="..."
export NODE_ENV="production"

# Run migrations
bun db:migrate

# Start server (consider using PM2 or systemd)
bun run apps/gateway/dist/index.js
```

### Systemd Service

```ini
# /etc/systemd/system/flywheel-gateway.service
[Unit]
Description=Flywheel Gateway
After=network.target postgresql.service

[Service]
Type=simple
User=flywheel
WorkingDirectory=/opt/flywheel-gateway
ExecStart=/usr/local/bin/bun run dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/flywheel-gateway/.env

[Install]
WantedBy=multi-user.target
```

## Reverse Proxy Setup

### Nginx Configuration

```nginx
upstream flywheel_gateway {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name api.flywheel.example.com;

    ssl_certificate /etc/ssl/certs/flywheel.crt;
    ssl_certificate_key /etc/ssl/private/flywheel.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # WebSocket support
    location /ws {
        proxy_pass http://flywheel_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # HTTP API
    location / {
        proxy_pass http://flywheel_gateway;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring

### Health Check

```bash
curl https://api.flywheel.example.com/health
# {"status":"healthy","version":"1.0.0","uptime":12345}
```

### Prometheus Metrics

Metrics available at `/metrics`:

| Metric | Type | Description |
|--------|------|-------------|
| `gateway_requests_total` | Counter | Total HTTP requests |
| `gateway_request_duration_seconds` | Histogram | Request latency |
| `gateway_websocket_connections` | Gauge | Active WebSocket connections |
| `gateway_agent_sessions_active` | Gauge | Active agent sessions |

### Alerting Rules

```yaml
# prometheus/alerts.yaml
groups:
  - name: flywheel
    rules:
      - alert: HighErrorRate
        expr: rate(gateway_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High error rate on Flywheel Gateway

      - alert: HighLatency
        expr: histogram_quantile(0.95, gateway_request_duration_seconds_bucket) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: High P95 latency on Flywheel Gateway
```

## Backup and Recovery

### Database Backup

```bash
# PostgreSQL backup (daily cron)
0 3 * * * pg_dump $DATABASE_URL | gzip > /backups/flywheel-$(date +\%Y\%m\%d).sql.gz

# SQLite backup
0 3 * * * sqlite3 /data/gateway.db ".backup /backups/gateway-$(date +\%Y\%m\%d).db"
```

### Recovery Procedure

1. Stop the gateway service
2. Restore database from backup
3. Verify data integrity
4. Start the gateway service
5. Verify health check passes

```bash
# PostgreSQL restore
gunzip < /backups/flywheel-20260112.sql.gz | psql $DATABASE_URL

# SQLite restore
cp /backups/gateway-20260112.db /data/gateway.db
```

## Scaling

### Horizontal Scaling

1. Use PostgreSQL instead of SQLite
2. Configure sticky sessions for WebSocket connections
3. Deploy multiple gateway instances behind load balancer

### Performance Tuning

```bash
# Increase connection pool size
DATABASE_POOL_SIZE=20

# Increase WebSocket buffer size
WS_MAX_PAYLOAD=16777216

# Enable HTTP keep-alive
HTTP_KEEPALIVE_TIMEOUT=65000
```

### Load Balancer Configuration

- Use sticky sessions for WebSocket connections (cookie or IP hash)
- Configure health check on `/health`
- Set connection timeout to 60s+ for WebSocket
- Enable WebSocket protocol upgrade

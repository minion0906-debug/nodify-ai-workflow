# 🐳 Nodify Docker Deployment Guide

This guide explains how to deploy Nodify using Docker and Docker Compose.

---

## Prerequisites

- **Docker** 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose** 1.29+ (included with Docker Desktop)
- **2GB RAM minimum** (4GB recommended)
- **5GB disk space**

---

## Quick Start

### 1. Prepare Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your Firebase credentials
nano .env.local
```

**Minimum required variables:**
- `NEXT_PUBLIC_FIREBASE_*` (all Firebase client config)
- `FIREBASE_SERVICE_ACCOUNT_BASE64` (server-side Firebase)
- `GEMINI_API_KEY` (for AI features)
- `WEBHOOK_SECRET_TOKEN` (generate with: `openssl rand -base64 32`)
- `CRON_SECRET` (generate with: `openssl rand -base64 32`)

### 2. Build and Start

```bash
# Build and start in background
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Access Application

Open your browser: **http://localhost:9003**

---

## Docker Commands

### Basic Operations

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f nodify

# View status
docker-compose ps
```

### Build & Rebuild

```bash
# Build image
docker-compose build

# Rebuild and restart
docker-compose up -d --build

# Force rebuild (no cache)
docker-compose build --no-cache
```

### Data Management

```bash
# View volumes
docker volume ls

# Backup database
docker cp nodify-app:/app/data ./backup

# Restore database
docker cp ./backup nodify-app:/app/data
```

### Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes (⚠️ deletes data)
docker-compose down -v

# Remove unused images
docker image prune -a
```

---

## Production Deployment

### 1. Optimize for Production

Update `docker-compose.yml`:

```yaml
services:
  nodify:
    # ... existing config ...

    # Add production environment variables
    environment:
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 1G

    # Restart policy
    restart: always
```

### 2. Use External Database (Optional)

For high-traffic deployments, consider using external PostgreSQL instead of SQLite:

```yaml
services:
  nodify:
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/nodify

  db:
    image: postgres:15-alpine
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=nodify
      - POSTGRES_PASSWORD=secure_password
      - POSTGRES_DB=nodify
```

### 3. Add Redis for Rate Limiting

Uncomment Redis service in `docker-compose.yml`:

```yaml
  redis:
    image: redis:7-alpine
    container_name: nodify-redis
    restart: unless-stopped
    volumes:
      - nodify-redis-data:/data
```

Update `.env.local`:
```env
REDIS_URL=redis://redis:6379
```

### 4. Use Nginx Reverse Proxy

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://nodify:9003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Add to `docker-compose.yml`:

```yaml
  nginx:
    image: nginx:alpine
    container_name: nodify-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - nodify
```

---

## SSL/HTTPS Setup

### Option 1: Let's Encrypt (Certbot)

```bash
# Install certbot
docker run -it --rm -v ./certbot:/etc/letsencrypt certbot/certbot \
  certonly --standalone -d your-domain.com

# Update nginx.conf with SSL
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    # ... rest of config
}
```

### Option 2: Cloudflare Tunnel

```bash
# No SSL needed - Cloudflare handles it
cloudflared tunnel --url http://localhost:9003
```

---

## Monitoring

### Health Check

```bash
# Check if container is healthy
docker inspect --format='{{.State.Health.Status}}' nodify-app

# View health check logs
docker inspect nodify-app | grep -A 10 Health
```

### Resource Usage

```bash
# Monitor resource usage
docker stats nodify-app

# View container details
docker inspect nodify-app
```

### Logs

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Save logs to file
docker-compose logs > nodify.log
```

---

## Backup & Restore

### Automated Backup Script

Create `backup.sh`:

```bash
#!/bin/bash

# Backup directory
BACKUP_DIR="./backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup database
docker cp nodify-app:/app/data "$BACKUP_DIR/data"

# Backup uploads
docker cp nodify-app:/app/public/uploads "$BACKUP_DIR/uploads"

# Backup .env.local
cp .env.local "$BACKUP_DIR/.env.local"

echo "Backup completed: $BACKUP_DIR"
```

### Restore from Backup

```bash
#!/bin/bash

BACKUP_DIR="./backups/20251209-120000"

# Stop container
docker-compose down

# Restore data
docker cp "$BACKUP_DIR/data" nodify-app:/app/

# Restore uploads
docker cp "$BACKUP_DIR/uploads" nodify-app:/app/public/

# Restart
docker-compose up -d
```

---

## Troubleshooting

### Container Won't Start

```bash
# View error logs
docker-compose logs nodify

# Check if port is in use
netstat -ano | findstr :9003  # Windows
lsof -i :9003                 # Mac/Linux

# Start with fresh build
docker-compose down -v
docker-compose up --build
```

### Database Issues

```bash
# Reset database (⚠️ deletes all data)
docker-compose down -v
docker volume rm nodify-data
docker-compose up -d
```

### Environment Variables Not Working

```bash
# Verify .env.local is loaded
docker-compose config

# Rebuild with new environment
docker-compose up -d --force-recreate
```

### Permission Issues

```bash
# Fix volume permissions
docker-compose exec nodify chown -R nextjs:nodejs /app/data
docker-compose restart
```

---

## Multi-Environment Setup

### Development

`docker-compose.dev.yml`:
```yaml
services:
  nodify:
    build:
      target: builder
    volumes:
      - ./src:/app/src
    environment:
      - NODE_ENV=development
    command: npm run dev
```

Run: `docker-compose -f docker-compose.dev.yml up`

### Staging

`docker-compose.staging.yml`:
```yaml
services:
  nodify:
    image: nodify:staging
    env_file:
      - .env.staging
```

Run: `docker-compose -f docker-compose.staging.yml up`

### Production

`docker-compose.prod.yml`:
```yaml
services:
  nodify:
    image: nodify:latest
    env_file:
      - .env.production
    restart: always
```

Run: `docker-compose -f docker-compose.prod.yml up -d`

---

## Scaling

### Multiple Instances (Load Balancing)

```yaml
services:
  nodify:
    # ... existing config ...
    deploy:
      replicas: 3

  nginx:
    # Load balancer configuration
    depends_on:
      - nodify
```

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml nodify

# Scale service
docker service scale nodify_nodify=3

# View services
docker service ls
```

---

## Best Practices

1. **Use .env.local** - Never commit secrets
2. **Regular backups** - Automate with cron jobs
3. **Resource limits** - Set CPU/memory limits
4. **Health checks** - Monitor container health
5. **Logging** - Rotate logs to prevent disk fill
6. **Updates** - Regularly update base images
7. **Security** - Run as non-root user (already configured)

---

## Support

For Docker-specific issues:
- Docker Documentation: https://docs.docker.com/
- Docker Compose Docs: https://docs.docker.com/compose/

For Nodify issues:
- See `DEPLOYMENT.md`
- See `TROUBLESHOOTING.md`

---

Generated by Nodify Setup Tools

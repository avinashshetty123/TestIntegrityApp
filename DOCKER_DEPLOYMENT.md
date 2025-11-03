# 🐳 Docker Deployment Guide

## Quick Start

### Windows:
```bash
deploy.bat
```

### Linux/Mac:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Manual Deployment

### 1. Stop existing containers
```bash
docker-compose -f fix-video-call.yml down
```

### 2. Build and start all services
```bash
docker-compose -f fix-video-call.yml up --build -d
```

### 3. Check status
```bash
docker-compose -f fix-video-call.yml ps
```

## Services

| Service | Container | Port | URL |
|---------|-----------|------|-----|
| Frontend | test-integrity-frontend | 3000 | http://localhost:3000 |
| Backend | test-integrity-backend | 4000 | http://localhost:4000 |
| LiveKit | livekit-server | 7880 | ws://localhost:7880 |
| Database | test-integrity-postgres | 5433 | localhost:5433 |
| Redis | livekit-redis | 6379 | localhost:6379 |
| TURN | coturn-server | 3478 | localhost:3478 |

## Health Checks

All services include health checks:
- **Backend**: `GET /health`
- **Database**: `pg_isready`
- **Redis**: `redis-cli ping`
- **LiveKit**: HTTP check on port 7880

## Logs

View logs for specific service:
```bash
docker logs test-integrity-frontend
docker logs test-integrity-backend
docker logs livekit-server
```

View all logs:
```bash
docker-compose -f fix-video-call.yml logs -f
```

## Troubleshooting

### Port conflicts:
```bash
netstat -ano | findstr :3000
netstat -ano | findstr :4000
```

### Restart specific service:
```bash
docker-compose -f fix-video-call.yml restart backend
```

### Clean rebuild:
```bash
docker-compose -f fix-video-call.yml down -v
docker system prune -f
docker-compose -f fix-video-call.yml up --build -d
```

## Environment Variables

Backend uses `.env.docker`:
```env
DATABASE_HOST=test-integrity-postgres
LIVEKIT_SERVER_URL=ws://livekit-server:7880
LIVEKIT_CLIENT_URL=ws://localhost:7880
```

Frontend environment:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
```
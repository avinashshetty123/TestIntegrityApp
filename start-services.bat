@echo off
echo Starting Test Integrity App Services...

echo.
echo 1. Starting Docker services...
docker-compose up -d

echo.
echo 2. Waiting for services to be ready...
timeout /t 10

echo.
echo 3. Checking service status...
docker-compose ps

echo.
echo Services started! Access points:
echo - LiveKit Server: http://localhost:7880
echo - PostgreSQL: localhost:5432
echo - PgAdmin: http://localhost:5050
echo - Redis: localhost:6379
echo - Deepfake API: http://localhost:8000
echo.
echo To start the backend, run: cd backend/backend && npm run start:dev
echo To start the frontend, run: cd appfrontend && npm run dev
echo.
echo To stop all services, run: docker-compose down
pause
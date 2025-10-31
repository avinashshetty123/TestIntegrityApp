@echo off
echo Starting Test Integrity App with Video Call Support...
echo.

echo Stopping and removing existing containers...
docker-compose down --remove-orphans

echo.
echo Building and starting services...
docker-compose up --build -d postgres pgadmin redis livekit

echo.
echo Waiting for services to be ready...
timeout /t 10

echo.
echo Starting backend and deepfake services...
docker-compose up --build -d backend deepfake-service

echo.
echo Services started successfully!
echo.
echo Available services:
echo - PostgreSQL: localhost:5432
echo - PgAdmin: http://localhost:5050
echo - LiveKit Server: ws://localhost:7880
echo - Backend API: http://localhost:4000
echo - Deepfake Service: http://localhost:8000
echo.
echo To view logs: docker-compose logs -f [service-name]
echo To stop all: docker-compose down
echo.
pause
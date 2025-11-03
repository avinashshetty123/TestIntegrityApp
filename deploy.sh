#!/bin/bash

echo "Starting TestIntegrity Docker Deployment..."

echo "Stopping existing containers..."
docker-compose -f fix-video-call.yml down

echo "Building and starting all services..."
docker-compose -f fix-video-call.yml up --build -d

echo "Waiting for services to be ready..."
sleep 30

echo "Checking service status..."
docker-compose -f fix-video-call.yml ps

echo ""
echo "========================================"
echo "   TestIntegrity is now running!"
echo "========================================"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:4000"
echo "LiveKit:  http://localhost:7880"
echo "Database: localhost:5433"
echo "========================================"
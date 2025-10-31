@echo off
echo LiveKit Debug Information
echo ========================

echo.
echo 1. Checking Docker containers...
docker ps --filter "name=livekit"

echo.
echo 2. Checking LiveKit logs...
docker logs livekit-server --tail 50

echo.
echo 3. Testing LiveKit connectivity...
curl -f http://localhost:7880 || echo "LiveKit server not responding on port 7880"

echo.
echo 4. Checking Redis connectivity...
docker logs livekit-redis --tail 20

echo.
echo 5. Network information...
docker network ls
docker inspect test-integrity-app_app-network

echo.
echo 6. Port usage...
netstat -an | findstr ":7880"
netstat -an | findstr ":7881"

pause
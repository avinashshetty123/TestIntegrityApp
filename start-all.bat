@echo off
echo Starting TestIntegrity Application...
echo.

echo [1/3] Starting Docker services...
docker-compose -f fix-video-call.yml up -d

echo.
echo [2/3] Waiting for services to be ready...
timeout /t 30 /nobreak > nul

echo.
echo [3/3] Services started successfully!
echo.
echo Access the application at:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:4000
echo - LiveKit Server: http://localhost:7880
echo.
echo To start the frontend, run:
echo   cd appfrontend
echo   npm install
echo   npm run dev
echo.
echo Press any key to view container status...
pause > nul

docker ps
echo.
echo All services are running!
pause
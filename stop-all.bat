@echo off
echo Stopping TestIntegrity Application...
echo.

docker-compose -f fix-video-call.yml down

echo.
echo All services stopped successfully!
pause
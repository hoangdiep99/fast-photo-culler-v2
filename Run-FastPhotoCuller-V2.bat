@echo off
title Fast Photo Culler AI Ver 2.0 (digiKam Powered)
echo ===================================================
echo   Fast Photo Culler AI Ver 2.0 - digiKam Core
echo ===================================================
echo.
echo Dang don dep cac tien trinh Electron cu bi ket...
taskkill /f /im electron.exe >nul 2>&1
taskkill /f /im "Fast Photo Culler AI Ver 2.0 (digiKam Powered).exe" >nul 2>&1
echo.
echo Dang khoi chay Fast Photo Culler AI Ver 2.0...
cd /d "%~dp0"
npx electron .

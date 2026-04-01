@echo off
echo =========================================
echo Redemarrage du serveur backend
echo =========================================
echo.

echo Arret des processus Node.js en cours...
taskkill /F /IM node.exe /T >nul 2>&1

echo Attente de 2 secondes...
timeout /t 2 /nobreak >nul

echo Demarrage du serveur backend...
cd %~dp0
start cmd /k "node server.js"

echo.
echo =========================================
echo Serveur redemarre avec succes!
echo Rafraichissez votre navigateur (Ctrl+F5)
echo =========================================
pause



















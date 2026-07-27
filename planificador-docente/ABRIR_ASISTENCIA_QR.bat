@echo off
cd /d "%~dp0"
title AMINA - ASISTENCIA QR
color 0A
echo =====================================================
echo        AMINA - ASISTENCIA QR PARA CELULARES
echo =====================================================
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: Node.js no esta instalado.
  echo Instale Node.js desde https://nodejs.org/
  echo Luego vuelva a abrir este archivo.
  echo.
  pause
  exit /b 1
)
echo.
echo Iniciando el servidor...
echo Se abrira automaticamente la pagina correcta.
echo NO abra asistencia.html ni index.html con doble clic.
echo NO cierre esta ventana durante la clase.
echo.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:8787/asistencia.html'"
node server.mjs
echo.
echo El servidor se detuvo. El QR ya no esta disponible.
pause

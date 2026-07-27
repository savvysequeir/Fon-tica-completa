@echo off
cd /d "%~dp0"
title Planificador de clases con Amina
echo =====================================================
echo       PLANIFICADOR DE CLASES CON AMINA
echo =====================================================
echo La clave de OpenAI es opcional para la asistencia.
set /p OPENAI_API_KEY=Pegue su clave o presione Enter para continuar sin Amina: 
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado. Visite https://nodejs.org/
  pause
  exit /b 1
)
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:8787'"
node server.mjs
pause

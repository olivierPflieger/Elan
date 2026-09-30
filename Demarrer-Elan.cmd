@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js est requis pour lancer Elan.
  pause
  exit /b 1
)
echo Ouvre http://127.0.0.1:4174 dans ton navigateur.
echo Garde cette fenetre ouverte pendant l'utilisation. Ctrl+C pour arreter.
node server.cjs
pause

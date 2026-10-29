@echo off
setlocal
cd /d "%~dp0"

set "NODE_CMD=C:\Users\Scraxis\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
where node >nul 2>nul
if not errorlevel 1 set "NODE_CMD=node"

if not exist "%NODE_CMD%" (
  if /i not "%NODE_CMD%"=="node" (
    echo ERROR: Node.js could not be found.
    echo Install Node.js or launch this project from Codex.
    pause
    exit /b 1
  )
)

if not exist "node_modules\vite\bin\vite.js" (
  echo ERROR: Project dependencies are missing.
  echo Run pnpm install in this project folder first.
  pause
  exit /b 1
)

echo Starting Pokemon Survivors...
echo Vite will select a free port and open the game automatically.
echo Close this window when you are finished testing.
echo.

"%NODE_CMD%" "node_modules\vite\bin\vite.js" --host 127.0.0.1 --open "/?fast=1"

if errorlevel 1 (
  echo.
  echo The game server stopped with an error.
  pause
)

@echo off
setlocal EnableExtensions EnableDelayedExpansion

echo [0/5] Checking Node.js version...
set "NODE_MAJOR="
for /f %%a in ('node -p "process.versions.node.split('.')[0]" 2^>nul') do set "NODE_MAJOR=%%a"

if not defined NODE_MAJOR (
  echo Node.js is not installed or not available in PATH.
  echo Please install Node.js LTS manually: https://nodejs.org
  pause
  exit /b 1
) else (
  echo Detected Node.js major version: !NODE_MAJOR!
  if !NODE_MAJOR! LSS 16 (
    echo WARNING: Node.js is too old. Recommended: v20 LTS.
    echo Current version may fail with modern dependencies.
    pause
  )
)

echo [1/5] Preparing environment...
if not exist .env (
  copy .env.example .env >nul
  echo .env file created from template. Fill TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
)

echo [2/5] Installing dependencies...
call npm install
if errorlevel 1 (
  echo npm install failed
  pause
  exit /b 1
)

echo [2b/5] Playwright: downloading Chromium (required for site fallback)...
call npx playwright install chromium
if errorlevel 1 (
  echo Playwright browser install failed. Run manually: npx playwright install chromium
  pause
  exit /b 1
)

echo [3/5] Initializing database...
call npm run db:init
if errorlevel 1 (
  echo DB initialization failed
  pause
  exit /b 1
)

echo [4/5] Starting monitor in dev mode...
call npm run dev
exit /b %errorlevel%

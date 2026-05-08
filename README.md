# Tennis News Monitor

Production-ready monitoring service for tennis news that detects high-impact events (injuries, withdrawals, fitness issues, etc.), scores them with weighted keywords, stores history, and sends filtered Telegram alerts.

## Architecture

- `src/scrapers` - modular scraper layer with source configs and Playwright fallback.
- `src/analyzers` - weighted keyword engine + entity extraction (player/tournament/rank).
- `src/database` - SQLite schema, init, repository, dedupe and history tracking.
- `src/telegram` - Telegram notifier (HTML mode, anti-spam via thresholds and dedupe).
- `src/engine` - async queue orchestration, cron cycles every 1-3 minutes.
- `src/api` - operational REST API (`/health`, `/admin/stats`, `/alerts`).
- `src/config` - env config, source registry, JSON keyword weights.
- `src/utils` - logger and resilient HTTP client (retry, rate limit, user-agent rotation).

## Main Features

- Polling every 1-3 minutes (`node-cron`).
- Weighted scoring with configurable JSON keywords.
- URL + title duplicate prevention.
- Player/tournament mute support.
- 24h repeated-player mention tracking.
- Telegram alert levels: `RED`, `YELLOW`, `BLUE`.
- Retry, rate limiting, queue concurrency, Playwright fallback.
- Easy scaling to other sports by adding source configs and entity extractors.

## REST Endpoints

- `GET /health` - liveness probe.
- `GET /admin/stats` - total articles, alerts, processed URLs.
- `GET /alerts?limit=20` - latest sent alerts.

## Quick Start (Windows)

1. Copy env template:
   - `.env.example` -> `.env`
2. Set values in `.env`:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
3. Start everything:
   - `start-all.bat`

## Docker Start

```bash
cp .env.example .env
# edit .env values
docker compose up --build -d
```

## Deploy on VPS (git + Docker)

**One-time on the server:**

```bash
sudo apt update && sudo apt install -y git docker.io docker-compose-plugin
sudo usermod -aG docker "$USER"
# log out and SSH back in so the docker group applies

git clone https://github.com/meghryan2014-source/tennis.git
cd tennis
cp .env.example .env
nano .env   # TELEGRAM_*, PORT, etc. — never commit .env
chmod +x scripts/vps-deploy.sh
docker compose up -d --build
```

**Each update** (after `git push` from your PC):

```bash
cd ~/tennis
./scripts/vps-deploy.sh
```

The script runs `git pull` then `docker compose up -d --build`. Keep `.env` only on the server (or use a secrets manager); it is listed in `.gitignore`.

## Important Security Note

Never commit real Telegram bot tokens into Git. Keep secrets only in `.env` and rotate token immediately if it was shared publicly.

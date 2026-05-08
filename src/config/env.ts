import dotenv from "dotenv";

dotenv.config();

const asNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: asNumber(process.env.PORT, 8080),
  pollIntervalMinutes: asNumber(process.env.POLL_INTERVAL_MINUTES, 1),
  alertScoreThreshold: asNumber(process.env.ALERT_SCORE_THRESHOLD, 8),
  databaseUrl: process.env.DATABASE_URL ?? "./data/monitor.sqlite",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",
  telegramParseMode: process.env.TELEGRAM_PARSE_MODE ?? "HTML",
  enableSentiment: asBoolean(process.env.ENABLE_SENTIMENT, false),
  enablePlaywrightFallback: asBoolean(process.env.ENABLE_PLAYWRIGHT_FALLBACK, true),
  fetchConcurrency: asNumber(process.env.FETCH_CONCURRENCY, 6),
  requestTimeoutMs: asNumber(process.env.REQUEST_TIMEOUT_MS, 12000),
  requestRetryCount: asNumber(process.env.REQUEST_RETRY_COUNT, 3),
  rateLimitPerSecond: asNumber(process.env.RATE_LIMIT_PER_SECOND, 2),
  userAgents: (() => {
    try {
      return JSON.parse(process.env.USER_AGENTS_JSON ?? "[]") as string[];
    } catch {
      return [];
    }
  })(),
  proxy: {
    http: process.env.HTTP_PROXY,
    https: process.env.HTTPS_PROXY
  }
};

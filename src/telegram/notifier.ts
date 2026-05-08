import axios from "axios";
import { env } from "../config/env";
import { AnalyzedArticle } from "../types";
import { logger } from "../utils/logger";

/** Numeric id of the bot is the part of the token before ":" — cannot be used as chat_id. */
const botUserIdFromToken = (token: string): string | null => {
  const id = token.split(":")[0]?.trim();
  return id && /^\d+$/.test(id) ? id : null;
};

const levelEmoji: Record<string, string> = {
  RED: "🔴",
  YELLOW: "🟡",
  BLUE: "🔵"
};

const escapeHtml = (input: string): string =>
  input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export class TelegramNotifier {
  private readonly enabled: boolean;

  constructor() {
    this.enabled = Boolean(env.telegramBotToken && env.telegramChatId);
  }

  async sendAlert(article: AnalyzedArticle, playerMentions24h: number): Promise<boolean> {
    if (!this.enabled) return false;

    const chatId = String(env.telegramChatId).trim();
    const botId = botUserIdFromToken(env.telegramBotToken);
    if (botId && chatId === botId) {
      logger.error(
        {
          hint: "TELEGRAM_CHAT_ID must be your personal user id (from @userinfobot), or a group/channel id — not the bot id from the token."
        },
        "Invalid TELEGRAM_CHAT_ID: matches bot id; Telegram forbids a bot messaging itself"
      );
      return false;
    }

    const message = [
      `🚨 <b>Tennis Alert</b>`,
      `${levelEmoji[article.alertLevel]} <b>Alert Type:</b> ${article.alertLevel}`,
      `<b>Impact Score:</b> ${article.score}`,
      `<b>Player:</b> ${escapeHtml(article.playerNames.join(", ") || "Unknown")}`,
      `<b>Rank:</b> ${article.playerRank ?? "N/A"}`,
      `<b>24h Mentions:</b> ${playerMentions24h}`,
      `<b>Keywords:</b> ${escapeHtml(article.matchedKeywords.join(", ") || "None")}`,
      `<b>Source:</b> ${escapeHtml(article.source)}`,
      `<b>Title:</b> ${escapeHtml(article.title)}`,
      `<b>Summary:</b> Potentially match/odds impacting information detected.`,
      `<a href="${article.url}">Open article</a>`
    ].join("\n");

    const url = `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`;
    try {
      await axios.post(url, {
        chat_id: env.telegramChatId,
        text: message,
        parse_mode: env.telegramParseMode,
        disable_web_page_preview: false
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        logger.error(
          { status: err.response.status, data: err.response.data },
          "Telegram sendMessage failed"
        );
      } else {
        logger.error({ err }, "Telegram sendMessage failed");
      }
      return false;
    }

    return true;
  }
}

import axios from "axios";
import { env } from "../config/env";
import { repository } from "../database/repository";
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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class TelegramNotifier {
  private readonly enabled: boolean;

  constructor() {
    this.enabled = Boolean(env.telegramBotToken);
  }

  async sendAlert(article: AnalyzedArticle, playerMentions24h: number): Promise<boolean> {
    if (!this.enabled) return false;

    const subscriberIds = await repository.listTelegramSubscriberChatIds();
    const legacyId = env.telegramChatId?.trim();
    const recipientSet = new Set<string>(subscriberIds);
    if (legacyId) recipientSet.add(legacyId);
    const recipients = [...recipientSet];

    if (recipients.length === 0) {
      logger.warn(
        "No Telegram recipients: users must send /start to the bot, or set TELEGRAM_CHAT_ID in .env"
      );
      return false;
    }

    const botId = botUserIdFromToken(env.telegramBotToken);
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

    const sendUrl = `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`;
    const payload = {
      text: message,
      parse_mode: env.telegramParseMode,
      disable_web_page_preview: false
    };

    const validRecipients = recipients.filter((chatId) => {
      if (botId && chatId === botId) {
        logger.error(
          { hint: "Recipient chat_id must not be the bot id from the token." },
          "Skipping invalid Telegram recipient: matches bot id"
        );
        return false;
      }
      return true;
    });

    if (validRecipients.length === 0) return false;

    // Dedupe in the engine is per URL, not per chat: one processArticle → one broadcast.
    // Retry only failed chats (multi-round) so one user's success does not "consume" the article for others.
    const maxRounds = 5;
    let pending = [...validRecipients];

    for (let round = 0; round < maxRounds && pending.length > 0; round += 1) {
      if (round > 0) {
        await sleep(800 * round);
      }
      const stillFailed: string[] = [];
      for (const chatId of pending) {
        try {
          await axios.post(sendUrl, { ...payload, chat_id: chatId });
        } catch (err: unknown) {
          if (axios.isAxiosError(err) && err.response?.data) {
            logger.error(
              { status: err.response.status, data: err.response.data, chatId, round },
              "Telegram sendMessage failed"
            );
          } else {
            logger.error({ err, chatId, round }, "Telegram sendMessage failed");
          }
          stillFailed.push(chatId);
        }
      }
      pending = stillFailed;
    }

    if (pending.length > 0) {
      logger.error(
        { chatIds: pending, articleUrl: article.url },
        "Telegram broadcast incomplete: some recipients failed after retries"
      );
      return false;
    }

    return true;
  }
}

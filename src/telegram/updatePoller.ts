import axios from "axios";
import { env } from "../config/env";
import { repository } from "../database/repository";
import { logger } from "../utils/logger";

type TgChat = { id: number };
type TgUser = { id: number; username?: string };
type TgMessage = { message_id: number; chat: TgChat; from?: TgUser; text?: string };

type GetUpdatesResult = {
  ok: boolean;
  result?: Array<{ update_id: number; message?: TgMessage; edited_message?: TgMessage }>;
};

let updateOffset = 0;
let pollInFlight = false;

const firstCommandToken = (text: string): string => text.trim().split(/\s+/)[0] ?? "";

const isStartCommand = (token: string): boolean =>
  token === "/start" || token.startsWith("/start@");

const isStopCommand = (token: string): boolean =>
  token === "/stop" || token.startsWith("/stop@");

const sendPlainReply = async (chatId: string, text: string): Promise<void> => {
  await axios.post(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
    chat_id: chatId,
    text,
    disable_web_page_preview: true
  });
};

const pollOnce = async (): Promise<void> => {
  if (pollInFlight) return;
  pollInFlight = true;
  try {
    const { data } = await axios.get<GetUpdatesResult>(
      `https://api.telegram.org/bot${env.telegramBotToken}/getUpdates`,
      {
        params: {
          offset: updateOffset,
          timeout: 0,
          allowed_updates: JSON.stringify(["message", "edited_message"])
        },
        timeout: 20000
      }
    );

    if (!data.ok || !data.result) {
      logger.warn({ data }, "Telegram getUpdates returned not ok");
      return;
    }

    for (const u of data.result) {
      updateOffset = u.update_id + 1;
      const msg = u.message ?? u.edited_message;
      if (!msg?.text) continue;

      const chatId = String(msg.chat.id);
      const cmd = firstCommandToken(msg.text);

      if (isStartCommand(cmd)) {
        await repository.upsertTelegramSubscriber(chatId, msg.from?.username ?? null);
        try {
          await sendPlainReply(
            chatId,
            "Subscribed to Tennis alerts. Send /stop to unsubscribe."
          );
        } catch (err: unknown) {
          logger.error({ err, chatId }, "Failed to send /start confirmation");
        }
        logger.info({ chatId, username: msg.from?.username }, "Telegram subscriber added");
      } else if (isStopCommand(cmd)) {
        await repository.removeTelegramSubscriber(chatId);
        try {
          await sendPlainReply(chatId, "Unsubscribed. Send /start to subscribe again.");
        } catch (err: unknown) {
          logger.error({ err, chatId }, "Failed to send /stop confirmation");
        }
        logger.info({ chatId }, "Telegram subscriber removed");
      }
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data) {
      logger.error(
        { status: err.response.status, data: err.response.data },
        "Telegram getUpdates failed"
      );
    } else {
      logger.error({ err }, "Telegram getUpdates failed");
    }
  } finally {
    pollInFlight = false;
  }
};

/** Long-polls Telegram updates so /start and /stop can manage broadcast recipients. Only one process should poll the same bot token. */
export const startTelegramUpdatePoller = (): void => {
  if (!env.telegramBotToken) {
    logger.warn("Telegram update poller not started: missing TELEGRAM_BOT_TOKEN");
    return;
  }

  void pollOnce();
  setInterval(() => void pollOnce(), 2500);
  logger.info("Telegram /start /stop poller started");
};

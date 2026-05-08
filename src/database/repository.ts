import { all, get, run } from "./db";
import { AnalyzedArticle, ScrapedArticle } from "../types";

export interface AlertRow {
  id: number;
  source: string;
  url: string;
  title: string;
  score: number;
  alert_level: string;
  player_names: string | null;
  matched_keywords: string | null;
  created_at: string;
}

export const repository = {
  async isProcessed(url: string): Promise<boolean> {
    const row = await get<{ id: number }>("SELECT id FROM processed_urls WHERE url = ?", [url]);
    return Boolean(row);
  },

  async markProcessed(url: string, source: string): Promise<void> {
    await run("INSERT OR IGNORE INTO processed_urls (url, source) VALUES (?, ?)", [url, source]);
  },

  async saveArticle(article: AnalyzedArticle, notified: boolean): Promise<void> {
    await run(
      `
      INSERT OR REPLACE INTO articles (
        source, url, title, content, published_at, player_names, tournament_names, player_rank,
        score, matched_keywords, alert_level, sentiment, notified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        article.source,
        article.url,
        article.title,
        article.content,
        article.publishedAt ?? null,
        JSON.stringify(article.playerNames),
        JSON.stringify(article.tournamentNames),
        article.playerRank ?? null,
        article.score,
        JSON.stringify(article.matchedKeywords),
        article.alertLevel,
        article.sentiment ?? null,
        notified ? 1 : 0
      ]
    );
  },

  async playerMentions24h(playerName: string): Promise<number> {
    const row = await get<{ cnt: number }>(
      `
      SELECT COUNT(*) as cnt
      FROM articles
      WHERE player_names LIKE ?
      AND datetime(created_at) >= datetime('now', '-24 hours')
      `,
      [`%${playerName}%`]
    );
    return row?.cnt ?? 0;
  },

  async isMuted(entityType: "player" | "tournament", entityValue: string): Promise<boolean> {
    const row = await get<{ id: number }>(
      "SELECT id FROM muted_entities WHERE entity_type = ? AND lower(entity_value) = lower(?)",
      [entityType, entityValue]
    );
    return Boolean(row);
  },

  async getLatestAlerts(limit = 20): Promise<AlertRow[]> {
    return all<AlertRow>(
      `
      SELECT id, source, url, title, score, alert_level, player_names, matched_keywords, created_at
      FROM articles
      WHERE notified = 1
      ORDER BY datetime(created_at) DESC
      LIMIT ?
      `,
      [limit]
    );
  },

  async getStats(): Promise<{
    articles: number;
    alerts: number;
    processedUrls: number;
    telegramSubscribers: number;
  }> {
    const [articles, alerts, processedUrls, telegramSubscribers] = await Promise.all([
      get<{ cnt: number }>("SELECT COUNT(*) as cnt FROM articles"),
      get<{ cnt: number }>("SELECT COUNT(*) as cnt FROM articles WHERE notified = 1"),
      get<{ cnt: number }>("SELECT COUNT(*) as cnt FROM processed_urls"),
      get<{ cnt: number }>("SELECT COUNT(*) as cnt FROM telegram_subscribers")
    ]);

    return {
      articles: articles?.cnt ?? 0,
      alerts: alerts?.cnt ?? 0,
      processedUrls: processedUrls?.cnt ?? 0,
      telegramSubscribers: telegramSubscribers?.cnt ?? 0
    };
  },

  async listTelegramSubscriberChatIds(): Promise<string[]> {
    const rows = await all<{ chat_id: string }>(
      "SELECT chat_id FROM telegram_subscribers ORDER BY datetime(subscribed_at) ASC"
    );
    return rows.map((r) => r.chat_id);
  },

  async upsertTelegramSubscriber(chatId: string, username: string | null): Promise<void> {
    await run(
      `
      INSERT INTO telegram_subscribers (chat_id, username, subscribed_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(chat_id) DO UPDATE SET
        username = excluded.username,
        subscribed_at = datetime('now')
      `,
      [chatId, username]
    );
  },

  async removeTelegramSubscriber(chatId: string): Promise<void> {
    await run("DELETE FROM telegram_subscribers WHERE chat_id = ?", [chatId]);
  },

  async dedupeByTitleAndSource(item: ScrapedArticle): Promise<boolean> {
    const row = await get<{ id: number }>(
      "SELECT id FROM articles WHERE source = ? AND lower(title) = lower(?)",
      [item.source, item.title]
    );
    return Boolean(row);
  }
};

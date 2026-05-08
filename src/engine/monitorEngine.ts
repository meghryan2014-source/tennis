import cron from "node-cron";
import PQueue from "p-queue";
import { analyzeArticle } from "../analyzers/keywordEngine";
import { env } from "../config/env";
import { repository } from "../database/repository";
import { buildScrapers } from "../scrapers/scraperFactory";
import { TelegramNotifier } from "../telegram/notifier";
import { logger } from "../utils/logger";

export class MonitorEngine {
  private readonly scrapers = buildScrapers();
  private readonly notifier = new TelegramNotifier();
  private readonly queue = new PQueue({ concurrency: env.fetchConcurrency });
  private isRunning = false;

  start(): void {
    const expression = `*/${Math.max(1, Math.min(3, env.pollIntervalMinutes))} * * * *`;
    cron.schedule(expression, () => {
      void this.runCycle();
    });
    logger.info({ cron: expression }, "Monitor cron scheduled");
    void this.runCycle();
  }

  async runCycle(): Promise<void> {
    if (this.isRunning) {
      logger.debug("Skipping cycle: previous cycle still running");
      return;
    }
    this.isRunning = true;
    try {
      for (const scraper of this.scrapers) {
        this.queue.add(async () => {
          const articles = await scraper.fetchFreshArticles();
          for (const article of articles) {
            await this.processArticle(article);
          }
        });
      }
      await this.queue.onIdle();
    } catch (error) {
      logger.error({ err: error }, "Cycle failed");
    } finally {
      this.isRunning = false;
    }
  }

  private async processArticle(article: {
    source: string;
    url: string;
    title: string;
    content: string;
    publishedAt?: string | null;
  }): Promise<void> {
    // URL/history dedupe avoids repeated processing and Telegram spam.
    if (await repository.isProcessed(article.url)) return;
    if (await repository.dedupeByTitleAndSource(article)) {
      await repository.markProcessed(article.url, article.source);
      return;
    }

    const analyzed = analyzeArticle(article);
    await repository.markProcessed(article.url, article.source);

    if (analyzed.score < env.alertScoreThreshold) {
      await repository.saveArticle(analyzed, false);
      return;
    }

    if (await this.isMuted(analyzed.playerNames, analyzed.tournamentNames)) {
      await repository.saveArticle(analyzed, false);
      return;
    }

    const mentions24h = analyzed.playerNames[0]
      ? await repository.playerMentions24h(analyzed.playerNames[0])
      : 0;

    const sent = await this.notifier.sendAlert(analyzed, mentions24h);
    await repository.saveArticle(analyzed, sent);
  }

  private async isMuted(players: string[], tournaments: string[]): Promise<boolean> {
    for (const player of players) {
      if (await repository.isMuted("player", player)) return true;
    }
    for (const tournament of tournaments) {
      if (await repository.isMuted("tournament", tournament)) return true;
    }
    return false;
  }
}

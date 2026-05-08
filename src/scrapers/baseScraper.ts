import * as cheerio from "cheerio";
import { chromium } from "playwright";
import { env } from "../config/env";
import { fetchWithRetry } from "../utils/httpClient";
import { logger } from "../utils/logger";
import { ScrapedArticle, SourceConfig } from "../types";

export class BaseScraper {
  constructor(private readonly source: SourceConfig) {}

  async fetchFreshArticles(limit = 8): Promise<ScrapedArticle[]> {
    const listingUrl = `${this.source.baseUrl}${this.source.listingPath}`;
    let listingHtml = "";

    try {
      listingHtml = await fetchWithRetry(listingUrl);
    } catch (error) {
      if (!env.enablePlaywrightFallback || !this.source.fallbackToPlaywright) {
        throw error;
      }
      logger.warn({ source: this.source.name, listingUrl }, "HTTP failed, switching to Playwright");
      listingHtml = await this.fetchWithPlaywright(listingUrl);
    }

    const $ = cheerio.load(listingHtml);
    const links = new Set<string>();
    $(this.source.articleLinkSelector).each((_index, element) => {
      const href = $(element).attr("href");
      if (!href) return;
      const absolute = href.startsWith("http") ? href : `${this.source.baseUrl}${href}`;
      links.add(absolute);
    });

    const selectedLinks = [...links].slice(0, limit);
    const articles: ScrapedArticle[] = [];

    for (const url of selectedLinks) {
      try {
        const article = await this.fetchSingleArticle(url);
        if (article.content.length > 80) {
          articles.push(article);
        }
      } catch (error) {
        logger.warn({ err: error, url, source: this.source.name }, "Failed to parse article");
      }
    }

    return articles;
  }

  /** Article pages often block plain HTTP even when the listing was loaded via Playwright. */
  private async fetchArticleHtml(url: string): Promise<string> {
    try {
      return await fetchWithRetry(url);
    } catch (error) {
      if (!env.enablePlaywrightFallback || !this.source.fallbackToPlaywright) {
        throw error;
      }
      logger.debug({ source: this.source.name, url }, "HTTP failed for article, switching to Playwright");
      return await this.fetchWithPlaywright(url);
    }
  }

  private async fetchSingleArticle(url: string): Promise<ScrapedArticle> {
    const html = await this.fetchArticleHtml(url);
    const $ = cheerio.load(html);

    const title = $(this.source.titleSelector).first().text().trim();
    const content = $(this.source.contentSelector).text().replace(/\s+/g, " ").trim();
    const publishedAt = this.source.timeSelector ? $(this.source.timeSelector).first().attr("datetime") ?? null : null;

    return {
      source: this.source.name,
      url,
      title: title || "Untitled",
      content,
      publishedAt
    };
  }

  private async fetchWithPlaywright(url: string): Promise<string> {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: env.requestTimeoutMs });
      return await page.content();
    } finally {
      await browser.close();
    }
  }
}

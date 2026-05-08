export type AlertLevel = "RED" | "YELLOW" | "BLUE";

export interface ScrapedArticle {
  source: string;
  url: string;
  title: string;
  content: string;
  publishedAt?: string | null;
}

export interface AnalyzedArticle extends ScrapedArticle {
  playerNames: string[];
  tournamentNames: string[];
  playerRank?: number | null;
  score: number;
  matchedKeywords: string[];
  alertLevel: AlertLevel;
  sentiment?: "negative" | "neutral" | "positive";
}

export interface SourceConfig {
  name: string;
  baseUrl: string;
  listingPath: string;
  articleLinkSelector: string;
  titleSelector: string;
  contentSelector: string;
  timeSelector?: string;
  fallbackToPlaywright?: boolean;
}

export interface KeywordWeightMap {
  [keyword: string]: number;
}

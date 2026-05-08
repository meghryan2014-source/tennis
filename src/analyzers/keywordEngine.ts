import keywordConfig from "../config/keywords.json";
import { env } from "../config/env";
import { AnalyzedArticle, AlertLevel, KeywordWeightMap, ScrapedArticle } from "../types";
import { extractPlayerNames, extractPlayerRank, extractTournamentNames } from "./entityExtractor";

const highPriority = keywordConfig.highPriority as KeywordWeightMap;
const mediumPriority = keywordConfig.mediumPriority as KeywordWeightMap;
const allWeights: KeywordWeightMap = { ...highPriority, ...mediumPriority };

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const classifyLevel = (score: number): AlertLevel => {
  if (score >= 14) return "RED";
  if (score >= env.alertScoreThreshold) return "YELLOW";
  return "BLUE";
};

const optionalSentiment = (text: string): "negative" | "neutral" | "positive" => {
  const negativeSignals = ["injury", "withdraw", "pain", "illness", "surgery", "fatigue"];
  const positiveSignals = ["recovered", "fit", "ready", "confident", "improved"];
  const normalized = text.toLowerCase();
  const negative = negativeSignals.filter((s) => normalized.includes(s)).length;
  const positive = positiveSignals.filter((s) => normalized.includes(s)).length;
  if (negative > positive) return "negative";
  if (positive > negative) return "positive";
  return "neutral";
};

export const analyzeArticle = (article: ScrapedArticle): AnalyzedArticle => {
  const corpus = `${article.title} ${article.content}`.toLowerCase();
  const matchedKeywords: string[] = [];
  let score = 0;

  // Weighted keyword scan allows clear tuning by changing JSON weights only.
  for (const [keyword, weight] of Object.entries(allWeights)) {
    const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "gi");
    const matchCount = [...corpus.matchAll(regex)].length;
    if (matchCount > 0) {
      matchedKeywords.push(keyword);
      score += weight * matchCount;
    }
  }

  // Repeated mentions of the same impacted player usually increase actionable value.
  const players = extractPlayerNames(`${article.title}. ${article.content}`);
  if (players.length > 0) {
    score += Math.min(players.length, 3);
  }

  return {
    ...article,
    playerNames: players,
    tournamentNames: extractTournamentNames(`${article.title}. ${article.content}`),
    playerRank: extractPlayerRank(`${article.title}. ${article.content}`),
    score,
    matchedKeywords,
    alertLevel: classifyLevel(score),
    sentiment: env.enableSentiment ? optionalSentiment(corpus) : undefined
  };
};

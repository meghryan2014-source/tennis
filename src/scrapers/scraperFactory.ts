import { sources } from "../config/sources";
import { BaseScraper } from "./baseScraper";

export const buildScrapers = (): BaseScraper[] => sources.map((source) => new BaseScraper(source));

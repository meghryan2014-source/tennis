import { SourceConfig } from "../types";

export const sources: SourceConfig[] = [
  {
    name: "ATP Tour",
    baseUrl: "https://www.atptour.com",
    listingPath: "/en/news",
    articleLinkSelector: "a[href*='/en/news/']",
    titleSelector: "h1",
    contentSelector: "article, .article-content, .content-section",
    timeSelector: "time",
    fallbackToPlaywright: true
  },
  {
    name: "WTA Tennis",
    baseUrl: "https://www.wtatennis.com",
    listingPath: "/news",
    articleLinkSelector: "a[href*='/news/']",
    titleSelector: "h1",
    contentSelector: "article, .article__content, .rich-text",
    timeSelector: "time",
    fallbackToPlaywright: true
  },
  {
    name: "Tennis TV",
    baseUrl: "https://www.tennistv.com",
    listingPath: "/news",
    articleLinkSelector: "a[href*='/news/']",
    titleSelector: "h1",
    contentSelector: "article, .article-body, .rich-text",
    timeSelector: "time",
    fallbackToPlaywright: true
  },
  {
    name: "ESPN Tennis",
    baseUrl: "https://www.espn.com",
    listingPath: "/tennis/",
    articleLinkSelector: "a[href*='/tennis/story/'], a[href*='/story/_/id/']",
    titleSelector: "h1",
    contentSelector: "article, .article-body, .Story__Body",
    timeSelector: "time",
    fallbackToPlaywright: true
  }
];

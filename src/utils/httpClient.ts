import axios, { AxiosInstance } from "axios";
import Bottleneck from "bottleneck";
import { env } from "../config/env";

const defaultUserAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"
];

const userAgents = env.userAgents.length ? env.userAgents : defaultUserAgents;

const pickUserAgent = (): string => userAgents[Math.floor(Math.random() * userAgents.length)];

export const limiter = new Bottleneck({
  minTime: Math.ceil(1000 / Math.max(1, env.rateLimitPerSecond))
});

export const httpClient: AxiosInstance = axios.create({
  timeout: env.requestTimeoutMs,
  headers: {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
  }
});

httpClient.interceptors.request.use((config) => {
  config.headers["User-Agent"] = pickUserAgent();
  return config;
});

export const fetchWithRetry = async (url: string, retries = env.requestRetryCount): Promise<string> => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await limiter.schedule(async () => {
        const response = await httpClient.get<string>(url, {
          proxy: false
        });
        return response.data;
      });
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw new Error("Unreachable retry state");
};

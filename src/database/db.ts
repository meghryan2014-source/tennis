import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const dbDir = path.dirname(env.databaseUrl);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(env.databaseUrl, (err) => {
  if (err) {
    logger.error({ err }, "Failed to open database");
  } else {
    logger.info({ database: env.databaseUrl }, "Database initialized");
  }
});

export const run = (sql: string, params: unknown[] = []): Promise<void> =>
  new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });

export const get = <T>(sql: string, params: unknown[] = []): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T | undefined)));
  });

export const all = <T>(sql: string, params: unknown[] = []): Promise<T[]> =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
  });

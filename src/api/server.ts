import express from "express";
import { repository } from "../database/repository";

export const createApiServer = () => {
  const app = express();
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/admin/stats", async (_req, res) => {
    const stats = await repository.getStats();
    res.json(stats);
  });

  app.get("/alerts", async (req, res) => {
    const limit = Number(req.query.limit ?? 20);
    const alerts = await repository.getLatestAlerts(Math.max(1, Math.min(200, limit)));
    res.json(alerts);
  });

  return app;
};

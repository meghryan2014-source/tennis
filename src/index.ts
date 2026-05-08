import "./utils/polyfills";
import { env } from "./config/env";
import "./database/db";
import { createApiServer } from "./api/server";
import { ensureSchema } from "./database/schema";
import { MonitorEngine } from "./engine/monitorEngine";
import { startTelegramUpdatePoller } from "./telegram/updatePoller";
import { logger } from "./utils/logger";

const bootstrap = async (): Promise<void> => {
  await ensureSchema();
  const app = createApiServer();
  startTelegramUpdatePoller();
  const engine = new MonitorEngine();
  engine.start();

  app.listen(env.port, () => {
    logger.info({ port: env.port }, "API server started");
  });
};

bootstrap().catch((error) => {
  logger.error({ err: error }, "Fatal startup error");
  process.exit(1);
});

import "../utils/polyfills";
import { ensureSchema } from "./schema";

const init = async (): Promise<void> => {
  await ensureSchema();
};

init()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Database initialized");
    process.exit(0);
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });

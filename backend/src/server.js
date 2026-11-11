import "dotenv/config";
import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { validateJwtConfiguration } from "./utils/jwt.js";

validateJwtConfiguration();
await connectDatabase();

const port = Number.parseInt(process.env.PORT || "5000", 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port between 1 and 65535.");
}

const server = app.listen(port, () => {
  console.info(`LearnSpace backend is running at http://localhost:${port}`);
});

server.on("error", (error) => {
  console.error("LearnSpace backend failed to start:", error);
  process.exitCode = 1;
});

async function shutdown(signal) {
  console.info(`Received ${signal}; closing the server.`);
  server.close(async (error) => {
    if (error) {
      console.error(`HTTP server shutdown failed (${error.name}).`);
      process.exitCode = 1;
    }
    try {
      await disconnectDatabase();
    } catch (disconnectError) {
      console.error(`MongoDB shutdown failed (${disconnectError.name}).`);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

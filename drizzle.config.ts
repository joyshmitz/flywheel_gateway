import { defineConfig } from "drizzle-kit";

const dbFile = process.env["DB_FILE_NAME"] ?? "./data/gateway.db";

export default defineConfig({
  schema: "./apps/gateway/src/db/schema.ts",
  out: "./apps/gateway/src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: dbFile,
  },
});

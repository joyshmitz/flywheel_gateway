import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

export default app;

if (import.meta.main) {
  const port = Number(process.env["PORT"]) || 3000;
  Bun.serve({
    fetch: app.fetch,
    port,
  });
}

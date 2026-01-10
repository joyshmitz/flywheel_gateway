/**
 * Routes Index - Aggregates all route handlers.
 */

import { Hono } from "hono";
import { agents } from "./agents";
import { alerts } from "./alerts";
import { context } from "./context";
import { health } from "./health";
import { metrics } from "./metrics";

const routes = new Hono();

// Mount route groups
routes.route("/agents", agents);
routes.route("/alerts", alerts);
routes.route("/health", health);
routes.route("/metrics", metrics);
routes.route("/sessions", context);

export { routes };

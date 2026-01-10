import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import { Shell } from "./components/layout/Shell";
import { DashboardPage } from "./pages/Dashboard";
import { AgentsPage } from "./pages/Agents";
import { BeadsPage } from "./pages/Beads";
import { SettingsPage } from "./pages/Settings";
import { NotFoundPage } from "./pages/NotFound";

const rootRoute = createRootRoute({
  component: Shell,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/agents",
  component: AgentsPage,
});

const beadsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/beads",
  component: BeadsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: NotFoundPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  agentsRoute,
  beadsRoute,
  settingsRoute,
  notFoundRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

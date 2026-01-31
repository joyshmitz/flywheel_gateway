import { logger } from "./services/logger";

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function logStartupSecurityWarnings(options: {
  host: string;
  port: number;
}): void {
  const hostIsLocal = isLocalHost(options.host);

  if (process.env["ENABLE_SETUP_INSTALL_UNAUTH"] === "true") {
    logger.warn(
      {
        host: options.host,
        port: options.port,
        hostIsLocal,
        enableSetupInstallUnauth: true,
      },
      "SECURITY WARNING: ENABLE_SETUP_INSTALL_UNAUTH=true allows unauthenticated tool installs via /setup/install. Use only for local development.",
    );
  }

  const adminKey = process.env["GATEWAY_ADMIN_KEY"]?.trim();
  const jwtSecret = process.env["JWT_SECRET"]?.trim();
  const authEnabled = Boolean(adminKey || jwtSecret);

  if (!authEnabled) {
    logger.warn(
      { host: options.host, port: options.port, hostIsLocal, authEnabled },
      "SECURITY WARNING: Authentication is disabled (GATEWAY_ADMIN_KEY and JWT_SECRET are unset). All API endpoints are accessible without authentication. Use only for local development.",
    );
  }
}

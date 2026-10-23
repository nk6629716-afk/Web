/**
 * Relay Server CORS Configuration
 * Dynamically validates origins for Netlify deployments, local development,
 * and user-configured FRONTEND_URL environments.
 */

export function isOriginAllowed(origin: string | undefined): boolean {
  // Allow non-browser agents (curl, server-to-server proxies, mobile apps)
  if (!origin) {
    return true;
  }

  const cleanOrigin = origin.replace(/\/$/, '');

  // Check FRONTEND_URL environment variable (supports comma-separated list)
  const rawEnv = process.env.FRONTEND_URL || '';
  const configuredOrigins = rawEnv
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (configuredOrigins.some((allowed) => allowed === '*' || allowed === cleanOrigin)) {
    return true;
  }

  // Allow any Netlify preview or production deployment (*.netlify.app)
  if (/^https:\/\/([a-zA-Z0-9_-]+\.)?netlify\.app$/.test(cleanOrigin)) {
    return true;
  }

  // Allow local development on localhost or 127.0.0.1 on any port
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
    return true;
  }

  // If no FRONTEND_URL was configured, allow by default
  if (configuredOrigins.length === 0) {
    return true;
  }

  return false;
}

export function corsOriginCallback(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean | string) => void
): void {
  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    callback(null, false);
  }
}

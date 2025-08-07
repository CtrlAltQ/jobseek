import * as Sentry from "@sentry/nextjs";
import { getEnvironmentConfig } from "./config/environments";

const config = getEnvironmentConfig();

if (config.enableSentry && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.name,
    tracesSampleRate: config.name === 'production' ? 0.1 : 1.0,
    debug: config.name === 'development',
  });
}
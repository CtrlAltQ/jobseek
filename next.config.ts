import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Remove deprecated instrumentationHook - it's enabled by default in Next.js 15
  experimental: {
    // Add any other experimental features here if needed
  },
};

// Wrap with Sentry configuration
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  sourcemaps: {
    disable: true,
  },
  disableLogger: true,
});

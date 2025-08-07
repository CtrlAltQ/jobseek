import * as Sentry from "@sentry/nextjs";
import { getEnvironmentConfig } from "../../config/environments";

const config = getEnvironmentConfig();

export class MonitoringService {
  static captureException(error: Error, context?: Record<string, any>) {
    if (config.enableSentry) {
      Sentry.captureException(error, {
        tags: {
          component: context?.component || 'unknown',
          environment: config.name,
        },
        extra: context,
      });
    }
    
    // Always log to console in development
    if (config.name === 'development') {
      console.error('Error captured:', error, context);
    }
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    if (config.enableSentry) {
      Sentry.captureMessage(message, {
        level: level as any,
        tags: {
          component: context?.component || 'unknown',
          environment: config.name,
        },
        extra: context,
      });
    }
    
    if (config.name === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, context);
    }
  }

  static addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    if (config.enableSentry) {
      Sentry.addBreadcrumb({
        message,
        category,
        data,
        timestamp: Date.now() / 1000,
      });
    }
  }

  static setUser(user: { id: string; email?: string; username?: string }) {
    if (config.enableSentry) {
      Sentry.setUser(user);
    }
  }

  static setTag(key: string, value: string) {
    if (config.enableSentry) {
      Sentry.setTag(key, value);
    }
  }

  static startTransaction(name: string, op: string) {
    if (config.enableSentry) {
      return Sentry.startSpan({ name, op }, () => {});
    }
    return null;
  }

  static async withMonitoring<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      this.addBreadcrumb(`Starting ${operationName}`, 'operation', context);
      const result = await operation();
      this.addBreadcrumb(`Completed ${operationName}`, 'operation', context);
      return result;
    } catch (error) {
      this.captureException(error as Error, {
        operation: operationName,
        ...context,
      });
      throw error;
    }
  }
}
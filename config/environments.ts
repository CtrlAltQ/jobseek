export interface EnvironmentConfig {
  name: string;
  apiUrl: string;
  mongodbUri: string;
  enableAnalytics: boolean;
  enableSentry: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  agentSchedule: {
    enabled: boolean;
    frequency: string;
  };
}

const environments: Record<string, EnvironmentConfig> = {
  development: {
    name: 'development',
    apiUrl: 'http://localhost:3000',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-job-finder-dev',
    enableAnalytics: false,
    enableSentry: false,
    logLevel: 'debug',
    agentSchedule: {
      enabled: false,
      frequency: 'manual'
    }
  },
  staging: {
    name: 'staging',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://ai-job-finder-staging.vercel.app',
    mongodbUri: process.env.MONGODB_URI!,
    enableAnalytics: true,
    enableSentry: true,
    logLevel: 'info',
    agentSchedule: {
      enabled: true,
      frequency: '0 */6 * * *' // Every 6 hours
    }
  },
  production: {
    name: 'production',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://ai-job-finder.vercel.app',
    mongodbUri: process.env.MONGODB_URI!,
    enableAnalytics: true,
    enableSentry: true,
    logLevel: 'warn',
    agentSchedule: {
      enabled: true,
      frequency: '0 */4 * * *' // Every 4 hours
    }
  }
};

export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.NODE_ENV || 'development';
  const config = environments[env];
  
  if (!config) {
    throw new Error(`Unknown environment: ${env}`);
  }
  
  return config;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isStaging(): boolean {
  return (process.env.NODE_ENV as string) === 'staging' || process.env.ENVIRONMENT === 'staging';
}
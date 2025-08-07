import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getEnvironmentConfig } from '../../../../../config/environments';
import { MonitoringService } from '@/lib/monitoring';

interface HealthStatus {
  success: boolean;
  message: string;
  timestamp: string;
  environment: string;
  version: string;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
      error?: string;
    };
    agents: {
      status: 'active' | 'inactive' | 'unknown';
      lastRun?: string;
      error?: string;
    };
  };
  uptime: number;
}

const startTime = Date.now();

export async function GET() {
  const config = getEnvironmentConfig();
  const healthStatus: HealthStatus = {
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    environment: config.name,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: {
        status: 'disconnected'
      },
      agents: {
        status: 'unknown'
      }
    },
    uptime: Date.now() - startTime
  };

  try {
    // Test database connection with timing
    const dbStart = Date.now();
    const db = await getDatabase();
    await db.admin().ping();
    const dbResponseTime = Date.now() - dbStart;
    
    healthStatus.services.database = {
      status: 'connected',
      responseTime: dbResponseTime
    };

    // Check agent status
    try {
      const agentLogs = db.collection('agent_logs');
      const lastLog = await agentLogs.findOne(
        {},
        { sort: { createdAt: -1 } }
      );
      
      if (lastLog) {
        const lastRunTime = new Date(lastLog.createdAt);
        const timeSinceLastRun = Date.now() - lastRunTime.getTime();
        const hoursAgo = timeSinceLastRun / (1000 * 60 * 60);
        
        healthStatus.services.agents = {
          status: hoursAgo < 6 ? 'active' : 'inactive',
          lastRun: lastRunTime.toISOString()
        };
      }
    } catch (agentError) {
      healthStatus.services.agents = {
        status: 'unknown',
        error: agentError instanceof Error ? agentError.message : 'Unknown error'
      };
    }

    // Determine overall health
    const isHealthy = 
      healthStatus.services.database.status === 'connected' &&
      healthStatus.services.agents.status !== 'unknown';

    if (!isHealthy) {
      healthStatus.success = false;
      healthStatus.message = 'Some services are unhealthy';
    }

    MonitoringService.addBreadcrumb('Health check completed', 'health', {
      success: healthStatus.success,
      dbResponseTime: healthStatus.services.database.responseTime
    });

    return NextResponse.json(healthStatus, {
      status: healthStatus.success ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    healthStatus.success = false;
    healthStatus.message = 'API health check failed';
    healthStatus.services.database = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    MonitoringService.captureException(error as Error, {
      component: 'health-check',
      environment: config.name
    });

    return NextResponse.json(healthStatus, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
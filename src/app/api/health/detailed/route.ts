import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getEnvironmentConfig } from '../../../../../config/environments';
import { MonitoringService } from '@/lib/monitoring';

export async function GET() {
  const config = getEnvironmentConfig();
  
  try {
    const db = await getDatabase();
    
    // Collect detailed system information
    const [
      dbStats,
      jobsCount,
      agentLogsCount,
      recentJobs,
      recentAgentActivity
    ] = await Promise.all([
      db.admin().serverStatus(),
      db.collection('jobs').countDocuments(),
      db.collection('agent_logs').countDocuments(),
      db.collection('jobs').find({}).sort({ discoveredDate: -1 }).limit(5).toArray(),
      db.collection('agent_logs').find({}).sort({ createdAt: -1 }).limit(10).toArray()
    ]);

    const detailedHealth = {
      timestamp: new Date().toISOString(),
      environment: config.name,
      version: process.env.npm_package_version || '1.0.0',
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
      database: {
        status: 'connected',
        version: dbStats.version,
        uptime: dbStats.uptime,
        connections: dbStats.connections,
        collections: {
          jobs: jobsCount,
          agentLogs: agentLogsCount
        }
      },
      application: {
        recentJobsCount: recentJobs.length,
        lastJobDiscovered: recentJobs[0]?.discoveredDate || null,
        agentActivity: {
          totalRuns: agentLogsCount,
          recentRuns: recentAgentActivity.length,
          lastRun: recentAgentActivity[0]?.createdAt || null,
          lastStatus: recentAgentActivity[0]?.status || null
        }
      },
      configuration: {
        enableAnalytics: config.enableAnalytics,
        enableSentry: config.enableSentry,
        logLevel: config.logLevel,
        agentScheduleEnabled: config.agentSchedule.enabled
      }
    };

    return NextResponse.json(detailedHealth, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Detailed health check failed:', error);
    
    MonitoringService.captureException(error as Error, {
      component: 'detailed-health-check',
      environment: config.name
    });

    return NextResponse.json({
      success: false,
      message: 'Detailed health check failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
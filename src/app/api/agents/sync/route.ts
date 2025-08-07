import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { JobPosting, AgentLog, ApiResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify API key for agent authentication
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.AGENT_API_KEY;
    
    if (!authHeader || !expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { jobs, execution_stats, timestamp, agent_version } = body;

    if (!jobs || !Array.isArray(jobs)) {
      return NextResponse.json(
        { success: false, error: 'Invalid jobs data' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const jobsCollection = db.collection<JobPosting>('jobs');
    const logsCollection = db.collection<AgentLog>('agent_logs');

    // Process and insert jobs
    const processedJobs = jobs.map(job => ({
      ...job,
      postedDate: new Date(job.postedDate),
      discoveredDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'new' as const
    }));

    // Use upsert to avoid duplicates based on sourceUrl
    const bulkOps = processedJobs.map(job => ({
      updateOne: {
        filter: { sourceUrl: job.sourceUrl },
        update: { 
          $set: {
            ...job,
            updatedAt: new Date()
          },
          $setOnInsert: { 
            createdAt: new Date(),
            status: 'new' as const
          }
        },
        upsert: true
      }
    }));

    const jobResult = bulkOps.length > 0 ? await jobsCollection.bulkWrite(bulkOps) : { upsertedCount: 0, modifiedCount: 0 };

    // Log agent execution
    let logsCreated = 0;
    if (execution_stats) {
      const agentLogs = Object.entries(execution_stats).map(([agentId, stats]: [string, any]) => ({
        agentId,
        source: agentId,
        startTime: new Date(timestamp),
        endTime: new Date(),
        jobsFound: stats.jobs_found || 0,
        jobsProcessed: stats.jobs_found || 0,
        errors: stats.error ? [stats.error] : [],
        status: stats.status === 'failed' ? 'failed' as const : 'success' as const,
        createdAt: new Date()
      }));

      if (agentLogs.length > 0) {
        await logsCollection.insertMany(agentLogs);
        logsCreated = agentLogs.length;
      }
    }

    const response: ApiResponse<{
      jobsProcessed: number;
      jobsInserted: number;
      jobsUpdated: number;
      logsCreated: number;
      timestamp: string;
    }> = {
      success: true,
      data: {
        jobsProcessed: jobs.length,
        jobsInserted: jobResult.upsertedCount,
        jobsUpdated: jobResult.modifiedCount,
        logsCreated,
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error syncing agent data:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to sync agent data'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}
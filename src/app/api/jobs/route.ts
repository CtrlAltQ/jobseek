import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { JobPosting, ApiResponse } from '@/lib/types';
import { broadcastJobUpdate } from '@/lib/realtime-server';

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
    const logsCollection = db.collection('agent_logs');

    // Process and insert jobs
    const processedJobs = jobs.map(job => ({
      ...job,
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
          $set: job,
          $setOnInsert: { createdAt: new Date() }
        },
        upsert: true
      }
    }));

    const jobResult = await jobsCollection.bulkWrite(bulkOps);

    // Broadcast real-time update if new jobs were added
    if (jobResult.upsertedCount > 0) {
      const newJobs = processedJobs.filter((_, index) => 
        jobResult.upsertedIds[index] !== undefined
      );
      broadcastJobUpdate({
        count: jobResult.upsertedCount,
        newJobs
      });
    }

    // Log agent execution
    if (execution_stats) {
      const agentLogs = Object.entries(execution_stats).map(([agentId, stats]: [string, any]) => ({
        agentId,
        source: agentId,
        startTime: new Date(timestamp),
        endTime: new Date(),
        jobsFound: stats.jobs_found || 0,
        jobsProcessed: stats.jobs_found || 0,
        errors: stats.error ? [stats.error] : [],
        status: stats.status === 'failed' ? 'failed' : 'success',
        createdAt: new Date()
      }));

      if (agentLogs.length > 0) {
        await logsCollection.insertMany(agentLogs);
      }
    }

    const response: ApiResponse<{
      jobsProcessed: number;
      jobsInserted: number;
      jobsUpdated: number;
      logsCreated: number;
    }> = {
      success: true,
      data: {
        jobsProcessed: jobs.length,
        jobsInserted: jobResult.upsertedCount,
        jobsUpdated: jobResult.modifiedCount,
        logsCreated: Object.keys(execution_stats || {}).length
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing agent data:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to process agent data'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const location = searchParams.get('location');
    const company = searchParams.get('company');
    const minSalary = searchParams.get('minSalary');
    const maxSalary = searchParams.get('maxSalary');
    
    const db = await getDatabase();
    const collection = db.collection<JobPosting>('jobs');
    
    // Build filter
    const filter: any = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (company) filter.company = { $regex: company, $options: 'i' };
    if (minSalary || maxSalary) {
      filter['salary.min'] = {};
      if (minSalary) filter['salary.min'].$gte = parseInt(minSalary);
      if (maxSalary) filter['salary.max'] = { $lte: parseInt(maxSalary) };
    }
    
    // Get jobs with pagination
    const jobs = await collection
      .find(filter)
      .sort({ discoveredDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();
    
    const total = await collection.countDocuments(filter);
    
    const response: ApiResponse<{
      jobs: JobPosting[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        jobs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch jobs'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}
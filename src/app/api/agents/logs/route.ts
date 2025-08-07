import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { AgentLog, ApiResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const agentId = searchParams.get('agentId');
    const source = searchParams.get('source');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const db = await getDatabase();
    const collection = db.collection<AgentLog>('agent_logs');

    // Build filter
    const filter: any = {};
    if (agentId) filter.agentId = agentId;
    if (source) filter.source = source;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Get logs with pagination
    const logs = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments(filter);

    // Get summary statistics for the filtered logs
    const stats = await collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: 1 },
          successfulRuns: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failedRuns: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          totalJobsFound: { $sum: '$jobsFound' },
          totalJobsProcessed: { $sum: '$jobsProcessed' },
          averageJobsPerRun: { $avg: '$jobsFound' }
        }
      }
    ]).toArray();

    const summary = stats[0] || {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalJobsFound: 0,
      totalJobsProcessed: 0,
      averageJobsPerRun: 0
    };

    const response: ApiResponse<{
      logs: AgentLog[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
      summary: {
        totalRuns: number;
        successfulRuns: number;
        failedRuns: number;
        totalJobsFound: number;
        totalJobsProcessed: number;
        averageJobsPerRun: number;
        successRate: number;
      };
    }> = {
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalRuns: summary.totalRuns,
          successfulRuns: summary.successfulRuns,
          failedRuns: summary.failedRuns,
          totalJobsFound: summary.totalJobsFound,
          totalJobsProcessed: summary.totalJobsProcessed,
          averageJobsPerRun: summary.averageJobsPerRun,
          successRate: summary.totalRuns > 0 ? 
            (summary.successfulRuns / summary.totalRuns) * 100 : 0
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching agent logs:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch agent logs'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/schemas';
import { JobPosting, AgentLog } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Skip database operations during build time
    if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured'
      }, { status: 503 });
    }
    
    const db = await getDatabase();
    const jobsCollection = db.collection<JobPosting>(COLLECTIONS.JOBS);
    const agentLogsCollection = db.collection<AgentLog>(COLLECTIONS.AGENT_LOGS);

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Job statistics
    const totalJobs = await jobsCollection.countDocuments({
      discoveredDate: { $gte: startDate }
    });

    const jobsByStatus = await jobsCollection.aggregate([
      { $match: { discoveredDate: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();

    const statusCounts = {
      new: 0,
      viewed: 0,
      applied: 0,
      dismissed: 0
    };

    jobsByStatus.forEach(item => {
      statusCounts[item._id as keyof typeof statusCounts] = item.count;
    });

    // Average relevance score
    const relevanceStats = await jobsCollection.aggregate([
      { $match: { discoveredDate: { $gte: startDate } } },
      { $group: { _id: null, avgScore: { $avg: '$relevanceScore' } } }
    ]).toArray();

    const averageRelevanceScore = relevanceStats[0]?.avgScore || 0;

    // Jobs discovered over time (last 7 days)
    const jobsOverTime = await jobsCollection.aggregate([
      { 
        $match: { 
          discoveredDate: { 
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
          } 
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$discoveredDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Agent activity statistics
    const agentStats = await agentLogsCollection.aggregate([
      { $match: { startTime: { $gte: startDate } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalJobsFound: { $sum: '$jobsFound' },
          totalJobsProcessed: { $sum: '$jobsProcessed' }
        }
      }
    ]).toArray();

    const agentActivity = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalJobsFound: 0,
      totalJobsProcessed: 0
    };

    agentStats.forEach(stat => {
      agentActivity.totalRuns += stat.count;
      agentActivity.totalJobsFound += stat.totalJobsFound;
      agentActivity.totalJobsProcessed += stat.totalJobsProcessed;
      
      if (stat._id === 'success') {
        agentActivity.successfulRuns = stat.count;
      } else if (stat._id === 'failed') {
        agentActivity.failedRuns = stat.count;
      }
    });

    const successRate = agentActivity.totalRuns > 0 
      ? (agentActivity.successfulRuns / agentActivity.totalRuns) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        jobStats: {
          totalJobs,
          ...statusCounts,
          averageRelevanceScore: Math.round(averageRelevanceScore * 100) / 100
        },
        jobsOverTime: jobsOverTime.map(item => ({
          date: item._id,
          count: item.count
        })),
        agentActivity: {
          ...agentActivity,
          successRate: Math.round(successRate * 100) / 100
        }
      }
    });

  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics stats' },
      { status: 500 }
    );
  }
}
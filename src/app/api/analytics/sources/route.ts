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

    // Job source performance
    const sourceStats = await jobsCollection.aggregate([
      { $match: { discoveredDate: { $gte: startDate } } },
      {
        $group: {
          _id: '$source',
          jobsFound: { $sum: 1 },
          avgRelevanceScore: { $avg: '$relevanceScore' },
          appliedJobs: {
            $sum: { $cond: [{ $eq: ['$status', 'applied'] }, 1, 0] }
          }
        }
      },
      { $sort: { jobsFound: -1 } }
    ]).toArray();

    // Agent source performance
    const agentSourceStats = await agentLogsCollection.aggregate([
      { $match: { startTime: { $gte: startDate } } },
      {
        $group: {
          _id: '$source',
          totalRuns: { $sum: 1 },
          successfulRuns: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          totalJobsFound: { $sum: '$jobsFound' },
          totalJobsProcessed: { $sum: '$jobsProcessed' },
          totalErrors: { $sum: { $size: '$errors' } },
          lastRun: { $max: '$startTime' }
        }
      }
    ]).toArray();

    // Combine job and agent statistics
    const combinedStats = sourceStats.map(jobStat => {
      const agentStat = agentSourceStats.find(a => a._id === jobStat._id);
      
      const successRate = agentStat && agentStat.totalRuns > 0
        ? (agentStat.successfulRuns / agentStat.totalRuns) * 100
        : 0;

      const applicationRate = jobStat.jobsFound > 0
        ? (jobStat.appliedJobs / jobStat.jobsFound) * 100
        : 0;

      return {
        source: jobStat._id,
        jobsFound: jobStat.jobsFound,
        averageRelevanceScore: Math.round(jobStat.avgRelevanceScore * 100) / 100,
        appliedJobs: jobStat.appliedJobs,
        applicationRate: Math.round(applicationRate * 100) / 100,
        totalRuns: agentStat?.totalRuns || 0,
        successfulRuns: agentStat?.successfulRuns || 0,
        successRate: Math.round(successRate * 100) / 100,
        totalErrors: agentStat?.totalErrors || 0,
        lastRun: agentStat?.lastRun || null,
        efficiency: agentStat && agentStat.totalRuns > 0
          ? Math.round((jobStat.jobsFound / agentStat.totalRuns) * 100) / 100
          : 0
      };
    });

    // Add sources that have agent activity but no jobs found
    agentSourceStats.forEach(agentStat => {
      if (!combinedStats.find(s => s.source === agentStat._id)) {
        const successRate = agentStat.totalRuns > 0
          ? (agentStat.successfulRuns / agentStat.totalRuns) * 100
          : 0;

        combinedStats.push({
          source: agentStat._id,
          jobsFound: 0,
          averageRelevanceScore: 0,
          appliedJobs: 0,
          applicationRate: 0,
          totalRuns: agentStat.totalRuns,
          successfulRuns: agentStat.successfulRuns,
          successRate: Math.round(successRate * 100) / 100,
          totalErrors: agentStat.totalErrors,
          lastRun: agentStat.lastRun,
          efficiency: 0
        });
      }
    });

    // Sort by jobs found descending
    combinedStats.sort((a, b) => b.jobsFound - a.jobsFound);

    return NextResponse.json({
      success: true,
      data: combinedStats
    });

  } catch (error) {
    console.error('Analytics sources error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch source analytics' },
      { status: 500 }
    );
  }
}
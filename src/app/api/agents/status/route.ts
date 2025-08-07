import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { AgentLog, ApiResponse } from '@/lib/types';

export async function GET() {
  try {
    const db = await getDatabase();
    const collection = db.collection<AgentLog>('agent_logs');

    // Get the latest status for each agent/source combination
    const pipeline = [
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: { agentId: '$agentId', source: '$source' },
          latestLog: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$latestLog' }
      },
      {
        $sort: { createdAt: -1 }
      }
    ];

    const latestLogs = await collection.aggregate(pipeline).toArray() as AgentLog[];

    // Get overall system status
    const runningAgents = latestLogs.filter(log => log.status === 'running').length;
    const totalAgents = latestLogs.length;
    const lastActivity = latestLogs.length > 0 ? latestLogs[0].createdAt : null;

    // Get recent activity summary (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentActivity = await collection
      .find({ createdAt: { $gte: yesterday } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray() as AgentLog[];

    const response: ApiResponse<{
      systemStatus: {
        runningAgents: number;
        totalAgents: number;
        lastActivity: Date | null;
        overallStatus: 'active' | 'idle' | 'error';
      };
      agentStatuses: AgentLog[];
      recentActivity: AgentLog[];
    }> = {
      success: true,
      data: {
        systemStatus: {
          runningAgents,
          totalAgents,
          lastActivity,
          overallStatus: runningAgents > 0 ? 'active' : 
                        latestLogs.some(log => log.status === 'failed') ? 'error' : 'idle'
        },
        agentStatuses: latestLogs,
        recentActivity
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching agent status:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch agent status'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}
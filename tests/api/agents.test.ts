import { NextRequest } from 'next/server';
import { GET as getStatus } from '@/app/api/agents/status/route';
import { GET as getLogs } from '@/app/api/agents/logs/route';
import { getDatabase } from '@/lib/mongodb';
import { AgentLog } from '@/lib/types';

// Mock the database
jest.mock('@/lib/mongodb');
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('/api/agents', () => {
  const mockCollection = {
    aggregate: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockDb = {
    collection: jest.fn(() => mockCollection),
  };

  const mockAgentLogs: AgentLog[] = [
    {
      _id: '507f1f77bcf86cd799439011',
      agentId: 'indeed-scraper',
      source: 'indeed',
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T10:05:00Z'),
      jobsFound: 25,
      jobsProcessed: 20,
      errors: [],
      status: 'success',
      createdAt: new Date('2024-01-01T10:05:00Z'),
    },
    {
      _id: '507f1f77bcf86cd799439012',
      agentId: 'linkedin-scraper',
      source: 'linkedin',
      startTime: new Date('2024-01-01T10:10:00Z'),
      endTime: new Date('2024-01-01T10:12:00Z'),
      jobsFound: 15,
      jobsProcessed: 15,
      errors: ['Rate limit warning'],
      status: 'partial',
      createdAt: new Date('2024-01-01T10:12:00Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabase.mockResolvedValue(mockDb as any);
  });

  describe('GET /api/agents/status', () => {
    it('should return agent status overview', async () => {
      // Mock aggregation pipeline for latest logs
      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockAgentLogs),
      });

      // Mock recent activity query
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockAgentLogs.slice(0, 1)),
      };
      mockCollection.find.mockReturnValue(mockFind);

      const response = await getStatus();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.systemStatus).toEqual({
        runningAgents: 0,
        totalAgents: 2,
        lastActivity: mockAgentLogs[0].createdAt,
        overallStatus: 'error', // Because one agent has 'partial' status
      });
      expect(data.data.agentStatuses).toEqual(mockAgentLogs);
      expect(data.data.recentActivity).toEqual([mockAgentLogs[0]]);
    });

    it('should handle running agents', async () => {
      const runningLogs = [
        { ...mockAgentLogs[0], status: 'running' },
        { ...mockAgentLogs[1], status: 'success' },
      ];

      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(runningLogs),
      });

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockCollection.find.mockReturnValue(mockFind);

      const response = await getStatus();
      const data = await response.json();

      expect(data.data.systemStatus.runningAgents).toBe(1);
      expect(data.data.systemStatus.overallStatus).toBe('active');
    });

    it('should handle no agents', async () => {
      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockCollection.find.mockReturnValue(mockFind);

      const response = await getStatus();
      const data = await response.json();

      expect(data.data.systemStatus).toEqual({
        runningAgents: 0,
        totalAgents: 0,
        lastActivity: null,
        overallStatus: 'idle',
      });
    });

    it('should handle database errors', async () => {
      mockCollection.aggregate.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await getStatus();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch agent status');
    });
  });

  describe('GET /api/agents/logs', () => {
    it('should return paginated agent logs', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockAgentLogs),
      };

      mockCollection.find.mockReturnValue(mockFind);
      mockCollection.countDocuments.mockResolvedValue(2);

      // Mock aggregation for stats
      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{
          totalRuns: 2,
          successfulRuns: 1,
          failedRuns: 0,
          totalJobsFound: 40,
          totalJobsProcessed: 35,
          averageJobsPerRun: 20,
        }]),
      });

      const request = new NextRequest('http://localhost:3000/api/agents/logs?page=1&limit=50');
      const response = await getLogs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.logs).toEqual(mockAgentLogs);
      expect(data.data.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        pages: 1,
      });
      expect(data.data.summary.successRate).toBe(50); // 1/2 * 100
    });

    it('should filter logs by agent ID', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([mockAgentLogs[0]]),
      };

      mockCollection.find.mockReturnValue(mockFind);
      mockCollection.countDocuments.mockResolvedValue(1);
      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{
          totalRuns: 1,
          successfulRuns: 1,
          failedRuns: 0,
          totalJobsFound: 25,
          totalJobsProcessed: 20,
          averageJobsPerRun: 25,
        }]),
      });

      const request = new NextRequest('http://localhost:3000/api/agents/logs?agentId=indeed-scraper');
      await getLogs(request);

      expect(mockCollection.find).toHaveBeenCalledWith({ agentId: 'indeed-scraper' });
    });

    it('should filter logs by date range', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockAgentLogs),
      };

      mockCollection.find.mockReturnValue(mockFind);
      mockCollection.countDocuments.mockResolvedValue(2);
      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{}]),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/agents/logs?startDate=2024-01-01&endDate=2024-01-02'
      );
      await getLogs(request);

      expect(mockCollection.find).toHaveBeenCalledWith({
        createdAt: {
          $gte: new Date('2024-01-01'),
          $lte: new Date('2024-01-02'),
        },
      });
    });

    it('should handle multiple filters', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };

      mockCollection.find.mockReturnValue(mockFind);
      mockCollection.countDocuments.mockResolvedValue(0);
      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/agents/logs?agentId=indeed-scraper&source=indeed&status=success'
      );
      await getLogs(request);

      expect(mockCollection.find).toHaveBeenCalledWith({
        agentId: 'indeed-scraper',
        source: 'indeed',
        status: 'success',
      });
    });

    it('should handle empty stats', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };

      mockCollection.find.mockReturnValue(mockFind);
      mockCollection.countDocuments.mockResolvedValue(0);
      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      const request = new NextRequest('http://localhost:3000/api/agents/logs');
      const response = await getLogs(request);
      const data = await response.json();

      expect(data.data.summary).toEqual({
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        totalJobsFound: 0,
        totalJobsProcessed: 0,
        averageJobsPerRun: 0,
        successRate: 0,
      });
    });

    it('should handle database errors', async () => {
      mockCollection.find.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost:3000/api/agents/logs');
      const response = await getLogs(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch agent logs');
    });
  });
});
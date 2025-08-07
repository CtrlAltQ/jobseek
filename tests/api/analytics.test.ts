/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as getStats } from '@/app/api/analytics/stats/route';
import { GET as getSources } from '@/app/api/analytics/sources/route';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the database
jest.mock('@/lib/mongodb', () => ({
  getDatabase: jest.fn()
}));

// Mock MongoDB client
jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    db: jest.fn(),
    close: jest.fn()
  }))
}));

jest.mock('@/lib/schemas', () => ({
  COLLECTIONS: {
    JOBS: 'jobs',
    AGENT_LOGS: 'agentLogs'
  }
}));

const mockDb = {
  collection: jest.fn()
};

const mockJobsCollection = {
  countDocuments: jest.fn(),
  aggregate: jest.fn().mockReturnValue({
    toArray: jest.fn()
  })
};

const mockAgentLogsCollection = {
  aggregate: jest.fn().mockReturnValue({
    toArray: jest.fn()
  })
};

describe('/api/analytics/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    const { getDatabase } = require('@/lib/mongodb');
    getDatabase.mockResolvedValue(mockDb);
    
    mockDb.collection.mockImplementation((name) => {
      if (name === 'jobs') return mockJobsCollection;
      if (name === 'agentLogs') return mockAgentLogsCollection;
      return {};
    });
  });

  it('returns analytics stats successfully', async () => {
    // Mock job statistics
    mockJobsCollection.countDocuments.mockResolvedValue(150);
    
    mockJobsCollection.aggregate
      .mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValue([
          { _id: 'new', count: 25 },
          { _id: 'viewed', count: 50 },
          { _id: 'applied', count: 30 },
          { _id: 'dismissed', count: 45 }
        ])
      })
      .mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValue([
          { _id: null, avgScore: 78.5 }
        ])
      })
      .mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValue([
          { _id: '2024-01-01', count: 10 },
          { _id: '2024-01-02', count: 15 },
          { _id: '2024-01-03', count: 8 }
        ])
      });

    // Mock agent statistics
    mockAgentLogsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        { _id: 'success', count: 18, totalJobsFound: 140, totalJobsProcessed: 135 },
        { _id: 'failed', count: 2, totalJobsFound: 10, totalJobsProcessed: 10 }
      ])
    });

    const request = new NextRequest('http://localhost/api/analytics/stats?days=30');
    const response = await getStats(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      jobStats: {
        totalJobs: 150,
        new: 25,
        viewed: 50,
        applied: 30,
        dismissed: 45,
        averageRelevanceScore: 78.5
      },
      jobsOverTime: [
        { date: '2024-01-01', count: 10 },
        { date: '2024-01-02', count: 15 },
        { date: '2024-01-03', count: 8 }
      ],
      agentActivity: {
        totalRuns: 20,
        successfulRuns: 18,
        failedRuns: 2,
        totalJobsFound: 150,
        totalJobsProcessed: 145,
        successRate: 90
      }
    });
  });

  it('handles custom time range parameter', async () => {
    mockJobsCollection.countDocuments.mockResolvedValue(50);
    mockJobsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([])
    });
    mockAgentLogsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([])
    });

    const request = new NextRequest('http://localhost/api/analytics/stats?days=7');
    await getStats(request);

    // Verify that the date filter was applied correctly
    const expectedStartDate = new Date();
    expectedStartDate.setDate(expectedStartDate.getDate() - 7);

    expect(mockJobsCollection.countDocuments).toHaveBeenCalledWith({
      discoveredDate: { $gte: expect.any(Date) }
    });
  });

  it('handles missing status data gracefully', async () => {
    mockJobsCollection.countDocuments.mockResolvedValue(100);
    mockJobsCollection.aggregate
      .mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValue([]) // Empty status data
      })
      .mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValue([{ _id: null, avgScore: 75 }])
      })
      .mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValue([])
      });
    mockAgentLogsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([])
    });

    const request = new NextRequest('http://localhost/api/analytics/stats?days=30');
    const response = await getStats(request);
    const data = await response.json();

    expect(data.data.jobStats).toEqual({
      totalJobs: 100,
      new: 0,
      viewed: 0,
      applied: 0,
      dismissed: 0,
      averageRelevanceScore: 75
    });
  });

  it('handles database errors', async () => {
    const { getDatabase } = require('@/lib/mongodb');
    getDatabase.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost/api/analytics/stats?days=30');
    const response = await getStats(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to fetch analytics stats');
  });

  it('calculates success rate correctly with zero runs', async () => {
    mockJobsCollection.countDocuments.mockResolvedValue(0);
    mockJobsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([])
    });
    mockAgentLogsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([]) // No agent runs
    });

    const request = new NextRequest('http://localhost/api/analytics/stats?days=30');
    const response = await getStats(request);
    const data = await response.json();

    expect(data.data.agentActivity.successRate).toBe(0);
  });
});

describe('/api/analytics/sources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    const { getDatabase } = require('@/lib/mongodb');
    getDatabase.mockResolvedValue(mockDb);
    
    mockDb.collection.mockImplementation((name) => {
      if (name === 'jobs') return mockJobsCollection;
      if (name === 'agentLogs') return mockAgentLogsCollection;
      return {};
    });
  });

  it('returns source performance data successfully', async () => {
    // Mock job source statistics
    mockJobsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        {
          _id: 'indeed',
          jobsFound: 75,
          avgRelevanceScore: 80,
          appliedJobs: 15
        },
        {
          _id: 'linkedin',
          jobsFound: 50,
          avgRelevanceScore: 85,
          appliedJobs: 10
        }
      ])
    });

    // Mock agent source statistics
    mockAgentLogsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        {
          _id: 'indeed',
          totalRuns: 10,
          successfulRuns: 9,
          totalJobsFound: 75,
          totalJobsProcessed: 73,
          totalErrors: 1,
          lastRun: new Date('2024-01-03T10:00:00Z')
        },
        {
          _id: 'linkedin',
          totalRuns: 8,
          successfulRuns: 7,
          totalJobsFound: 50,
          totalJobsProcessed: 50,
          totalErrors: 2,
          lastRun: new Date('2024-01-03T09:00:00Z')
        }
      ])
    });

    const request = new NextRequest('http://localhost/api/analytics/sources?days=30');
    const response = await getSources(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    
    const indeedData = data.data.find((s: any) => s.source === 'indeed');
    expect(indeedData).toEqual({
      source: 'indeed',
      jobsFound: 75,
      averageRelevanceScore: 80,
      appliedJobs: 15,
      applicationRate: 20,
      totalRuns: 10,
      successfulRuns: 9,
      successRate: 90,
      totalErrors: 1,
      lastRun: new Date('2024-01-03T10:00:00Z'),
      efficiency: 7.5
    });
  });

  it('handles sources with no jobs found', async () => {
    mockJobsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([])
    });
    
    mockAgentLogsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        {
          _id: 'failed-source',
          totalRuns: 5,
          successfulRuns: 0,
          totalJobsFound: 0,
          totalJobsProcessed: 0,
          totalErrors: 10,
          lastRun: new Date('2024-01-03T08:00:00Z')
        }
      ])
    });

    const request = new NextRequest('http://localhost/api/analytics/sources?days=30');
    const response = await getSources(request);
    const data = await response.json();

    expect(data.data).toHaveLength(1);
    expect(data.data[0]).toEqual({
      source: 'failed-source',
      jobsFound: 0,
      averageRelevanceScore: 0,
      appliedJobs: 0,
      applicationRate: 0,
      totalRuns: 5,
      successfulRuns: 0,
      successRate: 0,
      totalErrors: 10,
      lastRun: new Date('2024-01-03T08:00:00Z'),
      efficiency: 0
    });
  });

  it('sorts sources by jobs found descending', async () => {
    mockJobsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        { _id: 'source-a', jobsFound: 25, avgRelevanceScore: 75, appliedJobs: 5 },
        { _id: 'source-b', jobsFound: 75, avgRelevanceScore: 80, appliedJobs: 15 },
        { _id: 'source-c', jobsFound: 50, avgRelevanceScore: 85, appliedJobs: 10 }
      ])
    });

    mockAgentLogsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([])
    });

    const request = new NextRequest('http://localhost/api/analytics/sources?days=30');
    const response = await getSources(request);
    const data = await response.json();

    expect(data.data[0].source).toBe('source-b'); // 75 jobs
    expect(data.data[1].source).toBe('source-c'); // 50 jobs
    expect(data.data[2].source).toBe('source-a'); // 25 jobs
  });

  it('calculates application rate correctly', async () => {
    mockJobsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        { _id: 'test-source', jobsFound: 100, avgRelevanceScore: 80, appliedJobs: 25 }
      ])
    });
    mockAgentLogsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([])
    });

    const request = new NextRequest('http://localhost/api/analytics/sources?days=30');
    const response = await getSources(request);
    const data = await response.json();

    expect(data.data[0].applicationRate).toBe(25);
  });

  it('handles zero division gracefully', async () => {
    mockJobsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        { _id: 'test-source', jobsFound: 0, avgRelevanceScore: 0, appliedJobs: 0 }
      ])
    });
    mockAgentLogsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        { _id: 'test-source', totalRuns: 0, successfulRuns: 0, totalJobsFound: 0, totalJobsProcessed: 0, totalErrors: 0, lastRun: null }
      ])
    });

    const request = new NextRequest('http://localhost/api/analytics/sources?days=30');
    const response = await getSources(request);
    const data = await response.json();

    expect(data.data[0].applicationRate).toBe(0);
    expect(data.data[0].successRate).toBe(0);
    expect(data.data[0].efficiency).toBe(0);
  });

  it('handles database errors', async () => {
    const { getDatabase } = require('@/lib/mongodb');
    getDatabase.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost/api/analytics/sources?days=30');
    const response = await getSources(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to fetch source analytics');
  });

  it('rounds percentage values correctly', async () => {
    mockJobsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        { _id: 'test-source', jobsFound: 3, avgRelevanceScore: 78.567, appliedJobs: 1 }
      ])
    });
    mockAgentLogsCollection.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([
        { _id: 'test-source', totalRuns: 3, successfulRuns: 2, totalJobsFound: 3, totalJobsProcessed: 3, totalErrors: 0, lastRun: null }
      ])
    });

    const request = new NextRequest('http://localhost/api/analytics/sources?days=30');
    const response = await getSources(request);
    const data = await response.json();

    expect(data.data[0].averageRelevanceScore).toBe(78.57); // Rounded to 2 decimal places
    expect(data.data[0].applicationRate).toBe(33.33); // 1/3 * 100 rounded
    expect(data.data[0].successRate).toBe(66.67); // 2/3 * 100 rounded
  });
});
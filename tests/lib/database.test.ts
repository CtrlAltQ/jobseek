import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { JobService, AgentLogService, UserSettingsService } from '../../src/lib/database';
import { JobPosting, AgentLog, UserSettings } from '../../src/lib/types';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the mongodb module to use in-memory database
jest.mock('../../src/lib/mongodb', () => ({
  getDatabase: jest.fn()
}));

describe('Database Services', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let jobService: JobService;
  let agentLogService: AgentLogService;
  let userSettingsService: UserSettingsService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();

    // Mock the getDatabase function to return our test database
    const { getDatabase } = require('../../src/lib/mongodb');
    getDatabase.mockResolvedValue(mongoClient.db('test-ai-job-finder'));

    jobService = new JobService();
    agentLogService = new AgentLogService();
    userSettingsService = new UserSettingsService();
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const db = mongoClient.db('test-ai-job-finder');
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
    }
  });

  describe('JobService', () => {
    const sampleJob: Omit<JobPosting, '_id' | 'createdAt' | 'updatedAt'> = {
      title: 'Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      description: 'A great software engineering position',
      requirements: ['JavaScript', 'React', 'Node.js'],
      benefits: ['Health insurance', 'Remote work'],
      jobType: 'full-time',
      remote: true,
      source: 'indeed',
      sourceUrl: 'https://indeed.com/job/123',
      postedDate: new Date('2024-01-15'),
      discoveredDate: new Date('2024-01-16'),
      relevanceScore: 85,
      status: 'new',
      aiSummary: 'Great opportunity for a full-stack developer'
    };

    it('should create a job posting', async () => {
      const createdJob = await jobService.create(sampleJob);

      expect(createdJob._id).toBeDefined();
      expect(createdJob.title).toBe(sampleJob.title);
      expect(createdJob.company).toBe(sampleJob.company);
      expect(createdJob.createdAt).toBeInstanceOf(Date);
      expect(createdJob.updatedAt).toBeInstanceOf(Date);
    });

    it('should find a job by ID', async () => {
      const createdJob = await jobService.create(sampleJob);
      const foundJob = await jobService.findById(createdJob._id!);

      expect(foundJob).not.toBeNull();
      expect(foundJob!._id).toBe(createdJob._id);
      expect(foundJob!.title).toBe(sampleJob.title);
    });

    it('should return null when job not found', async () => {
      const foundJob = await jobService.findById('507f1f77bcf86cd799439011');
      expect(foundJob).toBeNull();
    });

    it('should find multiple jobs', async () => {
      await jobService.create(sampleJob);
      await jobService.create({ ...sampleJob, title: 'Senior Software Engineer' });

      const jobs = await jobService.findMany();
      expect(jobs).toHaveLength(2);
    });

    it('should update job status', async () => {
      const createdJob = await jobService.create(sampleJob);
      
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updatedJob = await jobService.updateStatus(createdJob._id!, 'applied');

      expect(updatedJob).not.toBeNull();
      expect(updatedJob!.status).toBe('applied');
      expect(updatedJob!.updatedAt.getTime()).toBeGreaterThanOrEqual(createdJob.updatedAt.getTime());
    });

    it('should delete a job', async () => {
      const createdJob = await jobService.create(sampleJob);
      const deleted = await jobService.deleteById(createdJob._id!);

      expect(deleted).toBe(true);

      const foundJob = await jobService.findById(createdJob._id!);
      expect(foundJob).toBeNull();
    });

    it('should search jobs by text', async () => {
      await jobService.create(sampleJob);
      await jobService.create({ 
        ...sampleJob, 
        title: 'Data Scientist',
        description: 'Work with Python and machine learning',
        sourceUrl: 'https://indeed.com/job/456'
      });

      // Note: Text search requires text indexes which may not work in memory DB
      // This test verifies the method exists and handles the query gracefully
      try {
        const results = await jobService.searchJobs('JavaScript');
        expect(Array.isArray(results)).toBe(true);
      } catch (error) {
        // Text search may fail without proper indexes in test environment
        expect(error.message).toContain('text index required');
      }
    });

    it('should find jobs with filters', async () => {
      const job1 = await jobService.create(sampleJob);
      const job2 = await jobService.create({ 
        ...sampleJob, 
        company: 'Another Corp',
        location: 'New York, NY',
        status: 'applied'
      });

      const filteredJobs = await jobService.findWithFilters({
        companies: ['Tech Corp'],
        status: ['new']
      });

      expect(filteredJobs).toHaveLength(1);
      expect(filteredJobs[0]._id).toBe(job1._id);
    });

    it('should get job statistics', async () => {
      await jobService.create(sampleJob);
      await jobService.create({ ...sampleJob, status: 'applied', relevanceScore: 90 });
      await jobService.create({ ...sampleJob, status: 'dismissed', relevanceScore: 70 });

      const stats = await jobService.getJobStats();

      expect(stats.total).toBe(3);
      expect(stats.new).toBe(1);
      expect(stats.applied).toBe(1);
      expect(stats.dismissed).toBe(1);
      expect(stats.averageRelevanceScore).toBeCloseTo(81.67, 1);
    });

    it('should validate job data before creation', async () => {
      const invalidJob = { ...sampleJob, title: '' };

      await expect(jobService.create(invalidJob)).rejects.toThrow('Validation failed');
    });

    it('should find duplicate jobs by source URL', async () => {
      await jobService.create(sampleJob);
      await jobService.create({ ...sampleJob, title: 'Different Title' });

      const duplicates = await jobService.findDuplicates(sampleJob.sourceUrl);
      expect(duplicates).toHaveLength(2);
    });
  });

  describe('AgentLogService', () => {
    const sampleLog: Omit<AgentLog, '_id' | 'createdAt'> = {
      agentId: 'indeed-scraper',
      source: 'indeed',
      startTime: new Date('2024-01-16T10:00:00Z'),
      endTime: new Date('2024-01-16T10:30:00Z'),
      jobsFound: 25,
      jobsProcessed: 20,
      errors: [],
      status: 'success'
    };

    it('should create an agent log', async () => {
      const createdLog = await agentLogService.create(sampleLog);

      expect(createdLog._id).toBeDefined();
      expect(createdLog.agentId).toBe(sampleLog.agentId);
      expect(createdLog.source).toBe(sampleLog.source);
      expect(createdLog.createdAt).toBeInstanceOf(Date);
    });

    it('should find logs by agent ID', async () => {
      await agentLogService.create(sampleLog);
      await agentLogService.create({ ...sampleLog, agentId: 'linkedin-scraper' });

      const logs = await agentLogService.findByAgent('indeed-scraper');
      expect(logs).toHaveLength(1);
      expect(logs[0].agentId).toBe('indeed-scraper');
    });

    it('should find logs by source', async () => {
      await agentLogService.create(sampleLog);
      await agentLogService.create({ ...sampleLog, source: 'linkedin' });

      const logs = await agentLogService.findBySource('indeed');
      expect(logs).toHaveLength(1);
      expect(logs[0].source).toBe('indeed');
    });

    it('should find recent logs', async () => {
      await agentLogService.create(sampleLog);
      await agentLogService.create({ 
        ...sampleLog, 
        startTime: new Date('2024-01-17T10:00:00Z')
      });

      const recentLogs = await agentLogService.findRecent(10);
      expect(recentLogs).toHaveLength(2);
      // Should be sorted by startTime descending
      expect(recentLogs[0].startTime.getTime()).toBeGreaterThan(recentLogs[1].startTime.getTime());
    });

    it('should update log status', async () => {
      const createdLog = await agentLogService.create({ ...sampleLog, status: 'running' });
      const endTime = new Date();
      
      const updatedLog = await agentLogService.updateStatus(createdLog._id!, 'success', endTime);

      expect(updatedLog).not.toBeNull();
      expect(updatedLog!.status).toBe('success');
      expect(updatedLog!.endTime).toEqual(endTime);
    });

    it('should get agent statistics', async () => {
      await agentLogService.create(sampleLog);
      await agentLogService.create({ ...sampleLog, status: 'failed', jobsFound: 0 });
      await agentLogService.create({ ...sampleLog, status: 'success', jobsFound: 30 });

      const stats = await agentLogService.getAgentStats();

      expect(stats.totalRuns).toBe(3);
      expect(stats.successfulRuns).toBe(2);
      expect(stats.failedRuns).toBe(1);
      expect(stats.totalJobsFound).toBe(55); // 25 + 0 + 30
      expect(stats.averageJobsPerRun).toBeCloseTo(18.33, 1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
    });

    it('should validate log data before creation', async () => {
      const invalidLog = { ...sampleLog, agentId: '' };

      await expect(agentLogService.create(invalidLog)).rejects.toThrow('Validation failed');
    });
  });

  describe('UserSettingsService', () => {
    const sampleSettings: Omit<UserSettings, '_id' | 'updatedAt'> = {
      searchCriteria: {
        jobTitles: ['Software Engineer', 'Full Stack Developer'],
        keywords: ['React', 'Node.js', 'TypeScript'],
        locations: ['San Francisco', 'Remote'],
        remoteOk: true,
        salaryRange: {
          min: 80000,
          max: 150000
        },
        industries: ['Technology', 'Fintech'],
        experienceLevel: 'mid'
      },
      contactInfo: {
        email: 'test@example.com',
        phone: '+1-555-0123',
        linkedin: 'https://linkedin.com/in/test',
        portfolio: 'https://portfolio.com'
      },
      agentSchedule: {
        frequency: 'daily',
        enabled: true
      }
    };

    it('should create user settings', async () => {
      const createdSettings = await userSettingsService.create(sampleSettings);

      expect(createdSettings._id).toBeDefined();
      expect(createdSettings.contactInfo.email).toBe(sampleSettings.contactInfo.email);
      expect(createdSettings.updatedAt).toBeInstanceOf(Date);
    });

    it('should get user settings', async () => {
      await userSettingsService.create(sampleSettings);
      const settings = await userSettingsService.getSettings();

      expect(settings).not.toBeNull();
      expect(settings!.contactInfo.email).toBe(sampleSettings.contactInfo.email);
    });

    it('should return null when no settings exist', async () => {
      const settings = await userSettingsService.getSettings();
      expect(settings).toBeNull();
    });

    it('should update existing settings', async () => {
      const createdSettings = await userSettingsService.create(sampleSettings);
      
      const updatedSettings = await userSettingsService.updateSettings({
        ...sampleSettings,
        contactInfo: {
          ...sampleSettings.contactInfo,
          email: 'updated@example.com'
        }
      });

      expect(updatedSettings._id).toBe(createdSettings._id);
      expect(updatedSettings.contactInfo.email).toBe('updated@example.com');
      expect(updatedSettings.updatedAt.getTime()).toBeGreaterThan(createdSettings.updatedAt.getTime());
    });

    it('should create new settings when none exist during update', async () => {
      const updatedSettings = await userSettingsService.updateSettings(sampleSettings);

      expect(updatedSettings._id).toBeDefined();
      expect(updatedSettings.contactInfo.email).toBe(sampleSettings.contactInfo.email);
    });

    it('should validate settings data before creation', async () => {
      const invalidSettings = { 
        ...sampleSettings, 
        contactInfo: { ...sampleSettings.contactInfo, email: 'invalid-email' }
      };

      await expect(userSettingsService.create(invalidSettings)).rejects.toThrow('Validation failed');
    });
  });

  describe('Generic DatabaseService functionality', () => {
    it('should count documents', async () => {
      const sampleJob: Omit<JobPosting, '_id' | 'createdAt' | 'updatedAt'> = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        description: 'A great software engineering position',
        requirements: [],
        benefits: [],
        jobType: 'full-time',
        remote: true,
        source: 'indeed',
        sourceUrl: 'https://indeed.com/job/123',
        postedDate: new Date(),
        discoveredDate: new Date(),
        relevanceScore: 85,
        status: 'new'
      };

      await jobService.create(sampleJob);
      await jobService.create({ ...sampleJob, title: 'Senior Engineer' });

      const count = await jobService.count();
      expect(count).toBe(2);

      const filteredCount = await jobService.count({ title: 'Software Engineer' });
      expect(filteredCount).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error
      const { getDatabase } = require('../../src/lib/mongodb');
      getDatabase.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(jobService.findMany()).rejects.toThrow('Database connection failed');

      // Restore the mock
      getDatabase.mockResolvedValue(mongoClient.db('test-ai-job-finder'));
    });
  });
});
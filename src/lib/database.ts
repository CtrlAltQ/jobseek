import { Collection, ObjectId, Filter, UpdateFilter, FindOptions } from 'mongodb';
import { getDatabase } from './mongodb';
import { JobPosting, AgentLog, UserSettings, FilterOptions } from './types';
import { COLLECTIONS, validateJobPosting, validateAgentLog, validateUserSettings } from './schemas';

// Generic Database Operations
class DatabaseService<T extends { _id?: string }> {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected async getCollection(): Promise<Collection<T>> {
    const db = await getDatabase();
    return db.collection<T>(this.collectionName);
  }

  async create(document: Omit<T, '_id'>): Promise<T> {
    const collection = await this.getCollection();
    const now = new Date();
    
    const docWithTimestamps = {
      ...document,
      createdAt: now,
      updatedAt: now
    } as unknown as T;

    const result = await collection.insertOne(docWithTimestamps as any);
    
    return {
      ...docWithTimestamps,
      _id: result.insertedId.toString()
    };
  }

  async findById(id: string): Promise<T | null> {
    const collection = await this.getCollection();
    const result = await collection.findOne({ _id: new ObjectId(id) } as Filter<T>);
    
    if (result) {
      return {
        ...result,
        _id: result._id.toString()
      } as T;
    }
    
    return null;
  }

  async findMany(filter: Filter<T> = {}, options: FindOptions<T> = {}): Promise<T[]> {
    const collection = await this.getCollection();
    const cursor = collection.find(filter, options);
    const results = await cursor.toArray();
    
    return results.map(doc => ({
      ...doc,
      _id: doc._id.toString()
    })) as T[];
  }

  async updateById(id: string, update: UpdateFilter<T>): Promise<T | null> {
    const collection = await this.getCollection();
    const updateDoc = {
      ...update,
      $set: {
        ...update.$set,
        updatedAt: new Date()
      }
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) } as Filter<T>,
      updateDoc,
      { returnDocument: 'after' }
    );

    if (result) {
      return {
        ...result,
        _id: result._id.toString()
      } as T;
    }

    return null;
  }

  async deleteById(id: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) } as Filter<T>);
    return result.deletedCount === 1;
  }

  async count(filter: Filter<T> = {}): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments(filter);
  }
}

// Job Posting Service
export class JobService extends DatabaseService<JobPosting> {
  constructor() {
    super(COLLECTIONS.JOBS);
  }

  async create(job: Omit<JobPosting, '_id' | 'createdAt' | 'updatedAt'>): Promise<JobPosting> {
    const errors = validateJobPosting(job);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const now = new Date();
    const jobWithDefaults = {
      ...job,
      requirements: job.requirements || [],
      benefits: job.benefits || [],
      status: job.status || 'new' as const,
      discoveredDate: job.discoveredDate || now,
      createdAt: now,
      updatedAt: now
    };

    return super.create(jobWithDefaults);
  }

  async findWithFilters(filters: FilterOptions, options: FindOptions<JobPosting> = {}): Promise<JobPosting[]> {
    const mongoFilter: Filter<JobPosting> = {};

    if (filters.dateRange) {
      mongoFilter.discoveredDate = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      };
    }

    if (filters.locations && filters.locations.length > 0) {
      mongoFilter.location = { $in: filters.locations };
    }

    if (filters.salaryRange) {
      mongoFilter.$or = [
        { 'salary.min': { $gte: filters.salaryRange.min } },
        { 'salary.max': { $lte: filters.salaryRange.max } }
      ];
    }

    if (filters.companies && filters.companies.length > 0) {
      mongoFilter.company = { $in: filters.companies };
    }

    if (filters.sources && filters.sources.length > 0) {
      mongoFilter.source = { $in: filters.sources };
    }

    if (filters.status && filters.status.length > 0) {
      mongoFilter.status = { $in: filters.status };
    }

    return this.findMany(mongoFilter, options);
  }

  async updateStatus(id: string, status: JobPosting['status']): Promise<JobPosting | null> {
    return this.updateById(id, { $set: { status } });
  }

  async searchJobs(query: string, options: FindOptions<JobPosting> = {}): Promise<JobPosting[]> {
    const searchFilter: Filter<JobPosting> = {
      $text: { $search: query }
    };

    return this.findMany(searchFilter, {
      ...options,
      sort: { score: { $meta: 'textScore' } }
    });
  }

  async findDuplicates(sourceUrl: string): Promise<JobPosting[]> {
    return this.findMany({ sourceUrl });
  }

  async getJobStats(): Promise<{
    total: number;
    new: number;
    viewed: number;
    applied: number;
    dismissed: number;
    averageRelevanceScore: number;
  }> {
    const collection = await this.getCollection();
    
    const [stats] = await collection.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          viewed: { $sum: { $cond: [{ $eq: ['$status', 'viewed'] }, 1, 0] } },
          applied: { $sum: { $cond: [{ $eq: ['$status', 'applied'] }, 1, 0] } },
          dismissed: { $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] } },
          averageRelevanceScore: { $avg: '$relevanceScore' }
        }
      }
    ]).toArray();

    return (stats as any) || {
      total: 0,
      new: 0,
      viewed: 0,
      applied: 0,
      dismissed: 0,
      averageRelevanceScore: 0
    };
  }
}

// Agent Log Service
export class AgentLogService extends DatabaseService<AgentLog> {
  constructor() {
    super(COLLECTIONS.AGENT_LOGS);
  }

  async create(log: Omit<AgentLog, '_id' | 'createdAt'>): Promise<AgentLog> {
    const errors = validateAgentLog(log);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const now = new Date();
    const logWithDefaults = {
      ...log,
      errors: log.errors || [],
      createdAt: now
    };

    return super.create(logWithDefaults);
  }

  async findByAgent(agentId: string, options: FindOptions<AgentLog> = {}): Promise<AgentLog[]> {
    return this.findMany({ agentId }, {
      ...options,
      sort: { startTime: -1 }
    });
  }

  async findBySource(source: string, options: FindOptions<AgentLog> = {}): Promise<AgentLog[]> {
    return this.findMany({ source }, {
      ...options,
      sort: { startTime: -1 }
    });
  }

  async findRecent(limit: number = 50): Promise<AgentLog[]> {
    return this.findMany({}, {
      sort: { startTime: -1 },
      limit
    });
  }

  async updateStatus(id: string, status: AgentLog['status'], endTime?: Date): Promise<AgentLog | null> {
    const updateData: any = { status };
    if (endTime) {
      updateData.endTime = endTime;
    }

    return this.updateById(id, { $set: updateData });
  }

  async getAgentStats(agentId?: string): Promise<{
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    totalJobsFound: number;
    totalJobsProcessed: number;
    averageJobsPerRun: number;
    successRate: number;
  }> {
    const collection = await this.getCollection();
    const matchFilter = agentId ? { agentId } : {};
    
    const [stats] = await collection.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: 1 },
          successfulRuns: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failedRuns: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          totalJobsFound: { $sum: '$jobsFound' },
          totalJobsProcessed: { $sum: '$jobsProcessed' },
          averageJobsPerRun: { $avg: '$jobsFound' }
        }
      },
      {
        $addFields: {
          successRate: {
            $cond: [
              { $eq: ['$totalRuns', 0] },
              0,
              { $multiply: [{ $divide: ['$successfulRuns', '$totalRuns'] }, 100] }
            ]
          }
        }
      }
    ]).toArray();

    return (stats as any) || {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalJobsFound: 0,
      totalJobsProcessed: 0,
      averageJobsPerRun: 0,
      successRate: 0
    };
  }
}

// User Settings Service
export class UserSettingsService extends DatabaseService<UserSettings> {
  constructor() {
    super(COLLECTIONS.USER_SETTINGS);
  }

  async create(settings: Omit<UserSettings, '_id' | 'updatedAt'>): Promise<UserSettings> {
    const errors = validateUserSettings(settings);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const now = new Date();
    const settingsWithDefaults = {
      ...settings,
      updatedAt: now
    };

    return super.create(settingsWithDefaults);
  }

  async getSettings(): Promise<UserSettings | null> {
    const settings = await this.findMany({}, { limit: 1 });
    return settings.length > 0 ? settings[0] : null;
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const errors = validateUserSettings(settings);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const existingSettings = await this.getSettings();
    
    if (existingSettings) {
      const updated = await this.updateById(existingSettings._id!, { $set: settings });
      if (!updated) {
        throw new Error('Failed to update settings');
      }
      return updated;
    } else {
      // Create new settings if none exist
      return this.create(settings as Omit<UserSettings, '_id' | 'updatedAt'>);
    }
  }
}

// Service Instances
export const jobService = new JobService();
export const agentLogService = new AgentLogService();
export const userSettingsService = new UserSettingsService();

// Utility Functions
export async function initializeServices(): Promise<void> {
  try {
    // Test database connection
    await getDatabase();
    console.log('Database services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database services:', error);
    throw error;
  }
}

export { DatabaseService };
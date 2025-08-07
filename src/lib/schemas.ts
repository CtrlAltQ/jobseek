import { Collection, CreateIndexesOptions, IndexSpecification } from 'mongodb';
import { getDatabase } from './mongodb';
import { JobPosting, AgentLog, UserSettings } from './types';

// MongoDB Schema Validation Rules
export const jobPostingSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['title', 'company', 'location', 'description', 'jobType', 'remote', 'source', 'sourceUrl', 'postedDate', 'discoveredDate', 'relevanceScore', 'status', 'createdAt', 'updatedAt'],
    properties: {
      title: { bsonType: 'string', minLength: 1, maxLength: 200 },
      company: { bsonType: 'string', minLength: 1, maxLength: 100 },
      location: { bsonType: 'string', minLength: 1, maxLength: 100 },
      salary: {
        bsonType: 'object',
        properties: {
          min: { bsonType: 'number', minimum: 0 },
          max: { bsonType: 'number', minimum: 0 },
          currency: { bsonType: 'string', minLength: 3, maxLength: 3 }
        },
        additionalProperties: false
      },
      description: { bsonType: 'string', minLength: 1 },
      requirements: { bsonType: 'array', items: { bsonType: 'string' } },
      benefits: { bsonType: 'array', items: { bsonType: 'string' } },
      jobType: { enum: ['full-time', 'part-time', 'contract', 'internship'] },
      remote: { bsonType: 'bool' },
      source: { bsonType: 'string', minLength: 1, maxLength: 50 },
      sourceUrl: { bsonType: 'string', minLength: 1 },
      postedDate: { bsonType: 'date' },
      discoveredDate: { bsonType: 'date' },
      relevanceScore: { bsonType: 'number', minimum: 0, maximum: 100 },
      status: { enum: ['new', 'viewed', 'applied', 'dismissed'] },
      aiSummary: { bsonType: 'string' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' }
    },
    additionalProperties: false
  }
};

export const agentLogSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['agentId', 'source', 'startTime', 'jobsFound', 'jobsProcessed', 'errors', 'status', 'createdAt'],
    properties: {
      agentId: { bsonType: 'string', minLength: 1, maxLength: 50 },
      source: { bsonType: 'string', minLength: 1, maxLength: 50 },
      startTime: { bsonType: 'date' },
      endTime: { bsonType: 'date' },
      jobsFound: { bsonType: 'number', minimum: 0 },
      jobsProcessed: { bsonType: 'number', minimum: 0 },
      errors: { bsonType: 'array', items: { bsonType: 'string' } },
      status: { enum: ['running', 'success', 'partial', 'failed'] },
      createdAt: { bsonType: 'date' }
    },
    additionalProperties: false
  }
};

export const userSettingsSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['searchCriteria', 'contactInfo', 'agentSchedule', 'updatedAt'],
    properties: {
      searchCriteria: {
        bsonType: 'object',
        required: ['jobTitles', 'keywords', 'locations', 'remoteOk', 'salaryRange', 'industries', 'experienceLevel'],
        properties: {
          jobTitles: { bsonType: 'array', items: { bsonType: 'string' } },
          keywords: { bsonType: 'array', items: { bsonType: 'string' } },
          locations: { bsonType: 'array', items: { bsonType: 'string' } },
          remoteOk: { bsonType: 'bool' },
          salaryRange: {
            bsonType: 'object',
            required: ['min', 'max'],
            properties: {
              min: { bsonType: 'number', minimum: 0 },
              max: { bsonType: 'number', minimum: 0 }
            },
            additionalProperties: false
          },
          industries: { bsonType: 'array', items: { bsonType: 'string' } },
          experienceLevel: { enum: ['entry', 'mid', 'senior', 'executive'] }
        },
        additionalProperties: false
      },
      contactInfo: {
        bsonType: 'object',
        required: ['email'],
        properties: {
          email: { bsonType: 'string', pattern: '^[^@]+@[^@]+\.[^@]+$' },
          phone: { bsonType: 'string' },
          linkedin: { bsonType: 'string' },
          portfolio: { bsonType: 'string' }
        },
        additionalProperties: false
      },
      agentSchedule: {
        bsonType: 'object',
        required: ['frequency', 'enabled'],
        properties: {
          frequency: { enum: ['hourly', 'daily', 'weekly'] },
          enabled: { bsonType: 'bool' }
        },
        additionalProperties: false
      },
      updatedAt: { bsonType: 'date' }
    },
    additionalProperties: false
  }
};

// Index Specifications
export const jobPostingIndexes: IndexSpecification[] = [
  { title: 'text', company: 'text', description: 'text' }, // Text search
  { company: 1 }, // Company lookup
  { location: 1 }, // Location filtering
  { source: 1 }, // Source filtering
  { status: 1 }, // Status filtering
  { relevanceScore: -1 }, // Sort by relevance
  { discoveredDate: -1 }, // Sort by discovery date
  { postedDate: -1 }, // Sort by posting date
  { 'salary.min': 1, 'salary.max': 1 }, // Salary range queries
  { remote: 1 }, // Remote job filtering
  { jobType: 1 }, // Job type filtering
  { sourceUrl: 1 }, // Unique constraint on source URL
];

export const agentLogIndexes: IndexSpecification[] = [
  { agentId: 1 }, // Agent lookup
  { source: 1 }, // Source filtering
  { startTime: -1 }, // Sort by start time
  { status: 1 }, // Status filtering
  { createdAt: -1 }, // Sort by creation date
  { agentId: 1, startTime: -1 }, // Compound index for agent activity
];

export const userSettingsIndexes: IndexSpecification[] = [
  { updatedAt: -1 }, // Sort by update time
  { 'contactInfo.email': 1 }, // Email lookup
];

// Collection Names
export const COLLECTIONS = {
  JOBS: 'jobs',
  AGENT_LOGS: 'agentLogs',
  USER_SETTINGS: 'userSettings'
} as const;

// Initialize Database Schema and Indexes
export async function initializeDatabase(): Promise<void> {
  try {
    const db = await getDatabase();
    
    // Create collections with schema validation
    await createCollectionWithSchema(db, COLLECTIONS.JOBS, jobPostingSchema, jobPostingIndexes);
    await createCollectionWithSchema(db, COLLECTIONS.AGENT_LOGS, agentLogSchema, agentLogIndexes);
    await createCollectionWithSchema(db, COLLECTIONS.USER_SETTINGS, userSettingsSchema, userSettingsIndexes);
    
    console.log('Database schema and indexes initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

async function createCollectionWithSchema(
  db: any,
  collectionName: string,
  schema: any,
  indexes: IndexSpecification[]
): Promise<void> {
  try {
    // Check if collection exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    
    if (collections.length === 0) {
      // Create collection with schema validation
      await db.createCollection(collectionName, {
        validator: schema
      });
      console.log(`Created collection: ${collectionName}`);
    } else {
      // Update existing collection with schema validation
      await db.command({
        collMod: collectionName,
        validator: schema
      });
      console.log(`Updated schema for collection: ${collectionName}`);
    }
    
    // Create indexes
    const collection = db.collection(collectionName);
    
    // Create indexes with proper options
    for (const indexSpec of indexes) {
      const options: CreateIndexesOptions = {};
      
      // Add unique constraint for sourceUrl in jobs collection
      if (collectionName === COLLECTIONS.JOBS && typeof indexSpec === 'object' && 'sourceUrl' in indexSpec) {
        options.unique = true;
        options.sparse = true; // Allow multiple documents without sourceUrl
      }
      
      await collection.createIndex(indexSpec, options);
    }
    
    console.log(`Created indexes for collection: ${collectionName}`);
  } catch (error) {
    console.error(`Failed to create collection ${collectionName}:`, error);
    throw error;
  }
}

// Validation Functions
export function validateJobPosting(job: Partial<JobPosting>): string[] {
  const errors: string[] = [];
  
  if (!job.title || job.title.trim().length === 0) {
    errors.push('Title is required');
  }
  if (!job.company || job.company.trim().length === 0) {
    errors.push('Company is required');
  }
  if (!job.location || job.location.trim().length === 0) {
    errors.push('Location is required');
  }
  if (!job.description || job.description.trim().length === 0) {
    errors.push('Description is required');
  }
  if (!job.jobType || !['full-time', 'part-time', 'contract', 'internship'].includes(job.jobType)) {
    errors.push('Valid job type is required');
  }
  if (job.remote === undefined || job.remote === null) {
    errors.push('Remote status is required');
  }
  if (!job.source || job.source.trim().length === 0) {
    errors.push('Source is required');
  }
  if (!job.sourceUrl || job.sourceUrl.trim().length === 0) {
    errors.push('Source URL is required');
  }
  if (!job.relevanceScore || job.relevanceScore < 0 || job.relevanceScore > 100) {
    errors.push('Relevance score must be between 0 and 100');
  }
  if (!job.status || !['new', 'viewed', 'applied', 'dismissed'].includes(job.status)) {
    errors.push('Valid status is required');
  }
  
  // Validate salary if provided
  if (job.salary) {
    if (job.salary.min && job.salary.max && job.salary.min > job.salary.max) {
      errors.push('Minimum salary cannot be greater than maximum salary');
    }
    if (!job.salary.currency || job.salary.currency.length !== 3) {
      errors.push('Valid currency code is required');
    }
  }
  
  return errors;
}

export function validateAgentLog(log: Partial<AgentLog>): string[] {
  const errors: string[] = [];
  
  if (!log.agentId || log.agentId.trim().length === 0) {
    errors.push('Agent ID is required');
  }
  if (!log.source || log.source.trim().length === 0) {
    errors.push('Source is required');
  }
  if (!log.startTime) {
    errors.push('Start time is required');
  }
  if (log.jobsFound === undefined || log.jobsFound < 0) {
    errors.push('Jobs found must be a non-negative number');
  }
  if (log.jobsProcessed === undefined || log.jobsProcessed < 0) {
    errors.push('Jobs processed must be a non-negative number');
  }
  if (!log.status || !['running', 'success', 'partial', 'failed'].includes(log.status)) {
    errors.push('Valid status is required');
  }
  if (!Array.isArray(log.errors)) {
    errors.push('Errors must be an array');
  }
  
  return errors;
}

export function validateUserSettings(settings: Partial<UserSettings>): string[] {
  const errors: string[] = [];
  
  if (!settings.searchCriteria) {
    errors.push('Search criteria is required');
    return errors;
  }
  
  const { searchCriteria } = settings;
  
  if (!Array.isArray(searchCriteria.jobTitles)) {
    errors.push('Job titles must be an array');
  }
  if (!Array.isArray(searchCriteria.keywords)) {
    errors.push('Keywords must be an array');
  }
  if (!Array.isArray(searchCriteria.locations)) {
    errors.push('Locations must be an array');
  }
  if (searchCriteria.remoteOk === undefined || searchCriteria.remoteOk === null) {
    errors.push('Remote OK status is required');
  }
  if (!searchCriteria.salaryRange || 
      searchCriteria.salaryRange.min === undefined || 
      searchCriteria.salaryRange.max === undefined) {
    errors.push('Salary range with min and max is required');
  }
  if (searchCriteria.salaryRange && 
      searchCriteria.salaryRange.min > searchCriteria.salaryRange.max) {
    errors.push('Minimum salary cannot be greater than maximum salary');
  }
  if (!Array.isArray(searchCriteria.industries)) {
    errors.push('Industries must be an array');
  }
  if (!searchCriteria.experienceLevel || 
      !['entry', 'mid', 'senior', 'executive'].includes(searchCriteria.experienceLevel)) {
    errors.push('Valid experience level is required');
  }
  
  if (!settings.contactInfo) {
    errors.push('Contact info is required');
  } else {
    const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
    if (!settings.contactInfo.email || !emailRegex.test(settings.contactInfo.email)) {
      errors.push('Valid email is required');
    }
  }
  
  if (!settings.agentSchedule) {
    errors.push('Agent schedule is required');
  } else {
    if (!settings.agentSchedule.frequency || 
        !['hourly', 'daily', 'weekly'].includes(settings.agentSchedule.frequency)) {
      errors.push('Valid schedule frequency is required');
    }
    if (settings.agentSchedule.enabled === undefined || settings.agentSchedule.enabled === null) {
      errors.push('Agent schedule enabled status is required');
    }
  }
  
  return errors;
}
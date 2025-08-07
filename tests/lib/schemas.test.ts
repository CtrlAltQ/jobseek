// Mock the mongodb module to avoid connection issues in tests
jest.mock('../../src/lib/mongodb', () => ({
  getDatabase: jest.fn().mockResolvedValue({})
}));

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
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { validateJobPosting, validateAgentLog, validateUserSettings } from '../../src/lib/schemas';
import { JobPosting, AgentLog, UserSettings } from '../../src/lib/types';

describe('Schema Validation', () => {
  describe('validateJobPosting', () => {
    const validJob: Partial<JobPosting> = {
      title: 'Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      description: 'A great software engineering position',
      jobType: 'full-time',
      remote: true,
      source: 'indeed',
      sourceUrl: 'https://indeed.com/job/123',
      relevanceScore: 85,
      status: 'new',
      salary: {
        min: 80000,
        max: 120000,
        currency: 'USD'
      }
    };

    it('should pass validation for a valid job posting', () => {
      const errors = validateJobPosting(validJob);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when title is missing', () => {
      const invalidJob = { ...validJob };
      delete invalidJob.title;
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Title is required');
    });

    it('should fail validation when title is empty string', () => {
      const invalidJob = { ...validJob, title: '   ' };
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Title is required');
    });

    it('should fail validation when company is missing', () => {
      const invalidJob = { ...validJob };
      delete invalidJob.company;
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Company is required');
    });

    it('should fail validation when location is missing', () => {
      const invalidJob = { ...validJob };
      delete invalidJob.location;
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Location is required');
    });

    it('should fail validation when description is missing', () => {
      const invalidJob = { ...validJob };
      delete invalidJob.description;
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Description is required');
    });

    it('should fail validation for invalid job type', () => {
      const invalidJob = { ...validJob, jobType: 'invalid' as any };
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Valid job type is required');
    });

    it('should fail validation when remote status is missing', () => {
      const invalidJob = { ...validJob };
      delete invalidJob.remote;
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Remote status is required');
    });

    it('should fail validation when source is missing', () => {
      const invalidJob = { ...validJob };
      delete invalidJob.source;
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Source is required');
    });

    it('should fail validation when sourceUrl is missing', () => {
      const invalidJob = { ...validJob };
      delete invalidJob.sourceUrl;
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Source URL is required');
    });

    it('should fail validation for invalid relevance score', () => {
      const invalidJob = { ...validJob, relevanceScore: 150 };
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Relevance score must be between 0 and 100');
    });

    it('should fail validation for negative relevance score', () => {
      const invalidJob = { ...validJob, relevanceScore: -10 };
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Relevance score must be between 0 and 100');
    });

    it('should fail validation for invalid status', () => {
      const invalidJob = { ...validJob, status: 'invalid' as any };
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Valid status is required');
    });

    it('should fail validation when min salary is greater than max salary', () => {
      const invalidJob = {
        ...validJob,
        salary: {
          min: 120000,
          max: 80000,
          currency: 'USD'
        }
      };
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Minimum salary cannot be greater than maximum salary');
    });

    it('should fail validation for invalid currency code', () => {
      const invalidJob = {
        ...validJob,
        salary: {
          min: 80000,
          max: 120000,
          currency: 'INVALID'
        }
      };
      
      const errors = validateJobPosting(invalidJob);
      expect(errors).toContain('Valid currency code is required');
    });

    it('should collect multiple validation errors', () => {
      const invalidJob = {
        title: '',
        company: '',
        relevanceScore: 150,
        status: 'invalid' as any
      };
      
      const errors = validateJobPosting(invalidJob);
      expect(errors.length).toBeGreaterThan(1);
      expect(errors).toContain('Title is required');
      expect(errors).toContain('Company is required');
      expect(errors).toContain('Relevance score must be between 0 and 100');
      expect(errors).toContain('Valid status is required');
    });
  });

  describe('validateAgentLog', () => {
    const validLog: Partial<AgentLog> = {
      agentId: 'indeed-scraper',
      source: 'indeed',
      startTime: new Date(),
      jobsFound: 25,
      jobsProcessed: 20,
      errors: [],
      status: 'success'
    };

    it('should pass validation for a valid agent log', () => {
      const errors = validateAgentLog(validLog);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when agentId is missing', () => {
      const invalidLog = { ...validLog };
      delete invalidLog.agentId;
      
      const errors = validateAgentLog(invalidLog);
      expect(errors).toContain('Agent ID is required');
    });

    it('should fail validation when source is missing', () => {
      const invalidLog = { ...validLog };
      delete invalidLog.source;
      
      const errors = validateAgentLog(invalidLog);
      expect(errors).toContain('Source is required');
    });

    it('should fail validation when startTime is missing', () => {
      const invalidLog = { ...validLog };
      delete invalidLog.startTime;
      
      const errors = validateAgentLog(invalidLog);
      expect(errors).toContain('Start time is required');
    });

    it('should fail validation for negative jobsFound', () => {
      const invalidLog = { ...validLog, jobsFound: -5 };
      
      const errors = validateAgentLog(invalidLog);
      expect(errors).toContain('Jobs found must be a non-negative number');
    });

    it('should fail validation for negative jobsProcessed', () => {
      const invalidLog = { ...validLog, jobsProcessed: -3 };
      
      const errors = validateAgentLog(invalidLog);
      expect(errors).toContain('Jobs processed must be a non-negative number');
    });

    it('should fail validation for invalid status', () => {
      const invalidLog = { ...validLog, status: 'invalid' as any };
      
      const errors = validateAgentLog(invalidLog);
      expect(errors).toContain('Valid status is required');
    });

    it('should fail validation when errors is not an array', () => {
      const invalidLog = { ...validLog, errors: 'not an array' as any };
      
      const errors = validateAgentLog(invalidLog);
      expect(errors).toContain('Errors must be an array');
    });
  });

  describe('validateUserSettings', () => {
    const validSettings: Partial<UserSettings> = {
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

    it('should pass validation for valid user settings', () => {
      const errors = validateUserSettings(validSettings);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when searchCriteria is missing', () => {
      const invalidSettings = { ...validSettings };
      delete invalidSettings.searchCriteria;
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Search criteria is required');
    });

    it('should fail validation when jobTitles is not an array', () => {
      const invalidSettings = {
        ...validSettings,
        searchCriteria: {
          ...validSettings.searchCriteria!,
          jobTitles: 'not an array' as any
        }
      };
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Job titles must be an array');
    });

    it('should fail validation when keywords is not an array', () => {
      const invalidSettings = {
        ...validSettings,
        searchCriteria: {
          ...validSettings.searchCriteria!,
          keywords: 'not an array' as any
        }
      };
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Keywords must be an array');
    });

    it('should fail validation when locations is not an array', () => {
      const invalidSettings = {
        ...validSettings,
        searchCriteria: {
          ...validSettings.searchCriteria!,
          locations: 'not an array' as any
        }
      };
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Locations must be an array');
    });

    it('should fail validation when remoteOk is missing', () => {
      const invalidSettings = {
        ...validSettings,
        searchCriteria: {
          ...validSettings.searchCriteria!,
          remoteOk: undefined as any
        }
      };
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Remote OK status is required');
    });

    it('should fail validation when salaryRange is missing', () => {
      const invalidSettings = {
        ...validSettings,
        searchCriteria: {
          ...validSettings.searchCriteria!,
          salaryRange: undefined as any
        }
      };
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Salary range with min and max is required');
    });

    it('should fail validation when min salary is greater than max salary', () => {
      const invalidSettings = {
        ...validSettings,
        searchCriteria: {
          ...validSettings.searchCriteria!,
          salaryRange: {
            min: 150000,
            max: 80000
          }
        }
      };
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Minimum salary cannot be greater than maximum salary');
    });

    it('should fail validation for invalid experience level', () => {
      const invalidSettings = {
        ...validSettings,
        searchCriteria: {
          ...validSettings.searchCriteria!,
          experienceLevel: 'invalid' as any
        }
      };
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Valid experience level is required');
    });

    it('should fail validation when contactInfo is missing', () => {
      const invalidSettings = { ...validSettings };
      delete invalidSettings.contactInfo;
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Contact info is required');
    });

    it('should fail validation for invalid email', () => {
      const invalidSettings = {
        ...validSettings,
        contactInfo: {
          ...validSettings.contactInfo!,
          email: 'invalid-email'
        }
      };
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Valid email is required');
    });

    it('should fail validation when agentSchedule is missing', () => {
      const invalidSettings = { ...validSettings };
      delete invalidSettings.agentSchedule;
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Agent schedule is required');
    });

    it('should fail validation for invalid schedule frequency', () => {
      const invalidSettings = {
        ...validSettings,
        agentSchedule: {
          ...validSettings.agentSchedule!,
          frequency: 'invalid' as any
        }
      };
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Valid schedule frequency is required');
    });

    it('should fail validation when enabled status is missing', () => {
      const invalidSettings = {
        ...validSettings,
        agentSchedule: {
          ...validSettings.agentSchedule!,
          enabled: undefined as any
        }
      };
      
      const errors = validateUserSettings(invalidSettings);
      expect(errors).toContain('Agent schedule enabled status is required');
    });
  });
});
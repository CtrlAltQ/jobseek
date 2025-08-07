// Job Posting Types
export interface JobPosting {
  _id?: string;
  title: string;
  company: string;
  location: string;
  salary?: {
    min?: number;
    max?: number;
    currency: string;
  };
  description: string;
  requirements: string[];
  benefits: string[];
  jobType: 'full-time' | 'part-time' | 'contract' | 'internship';
  remote: boolean;
  source: string;
  sourceUrl: string;
  postedDate: Date;
  discoveredDate: Date;
  relevanceScore: number; // 0-100
  status: 'new' | 'viewed' | 'applied' | 'dismissed';
  aiSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Agent Activity Log Types
export interface AgentLog {
  _id?: string;
  agentId: string;
  source: string;
  startTime: Date;
  endTime?: Date;
  jobsFound: number;
  jobsProcessed: number;
  errors: string[];
  status: 'running' | 'success' | 'partial' | 'failed';
  createdAt: Date;
}

// User Settings Types
export interface UserSettings {
  _id?: string;
  searchCriteria: {
    jobTitles: string[];
    keywords: string[];
    locations: string[];
    remoteOk: boolean;
    salaryRange: {
      min: number;
      max: number;
    };
    industries: string[];
    experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  };
  contactInfo: {
    email: string;
    phone?: string;
    linkedin?: string;
    portfolio?: string;
  };
  agentSchedule: {
    frequency: 'hourly' | 'daily' | 'weekly';
    enabled: boolean;
  };
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Analytics Types
export interface JobStats {
  totalJobs: number;
  newJobs: number;
  appliedJobs: number;
  dismissedJobs: number;
  averageRelevanceScore: number;
}

export interface SourceStats {
  source: string;
  jobsFound: number;
  successRate: number;
  lastRun: Date;
}

// Component Props Types
export interface JobCardProps {
  job: JobPosting;
  onStatusChange: (jobId: string, status: JobPosting['status']) => void;
  onViewDetails: (job: JobPosting) => void;
}

export interface FilterOptions {
  dateRange?: {
    start: Date;
    end: Date;
  };
  locations?: string[];
  salaryRange?: {
    min: number;
    max: number;
  };
  companies?: string[];
  sources?: string[];
  status?: JobPosting['status'][];
}
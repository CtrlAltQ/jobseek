import { JobPosting, UserSettings, AgentLog, ApiResponse, JobStats, SourceStats } from './types';

// API Client Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : '';
const DEFAULT_TIMEOUT = 10000; // 10 seconds

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic API request function with error handling and timeout
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const data: ApiResponse<T> = await response.json();
    
    if (!data.success) {
      throw new ApiError(data.error || 'API request failed', response.status);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'TIMEOUT');
      }
      throw new ApiError(error.message, undefined, 'NETWORK_ERROR');
    }
    
    throw new ApiError('Unknown error occurred');
  }
}

// Jobs API
export const jobsApi = {
  // Get jobs with filtering and pagination
  async getJobs(params: {
    page?: number;
    limit?: number;
    status?: string;
    source?: string;
    location?: string;
    company?: string;
    minSalary?: number;
    maxSalary?: number;
  } = {}): Promise<{
    jobs: JobPosting[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const endpoint = `/api/jobs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await apiRequest<{
      jobs: JobPosting[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(endpoint);

    return response.data!;
  },

  // Update job status
  async updateJobStatus(jobId: string, status: JobPosting['status']): Promise<void> {
    await apiRequest(`/api/jobs/${jobId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  // Delete job
  async deleteJob(jobId: string): Promise<void> {
    await apiRequest(`/api/jobs/${jobId}`, {
      method: 'DELETE',
    });
  },
};

// Settings API
export const settingsApi = {
  // Get user settings
  async getSettings(): Promise<UserSettings | null> {
    const response = await apiRequest<UserSettings | null>('/api/settings');
    return response.data!;
  },

  // Update user settings
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const response = await apiRequest<UserSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return response.data!;
  },
};

// Agents API
export const agentsApi = {
  // Get agent status
  async getStatus(): Promise<{
    systemStatus: {
      runningAgents: number;
      totalAgents: number;
      lastActivity: Date | null;
      overallStatus: 'active' | 'idle' | 'error';
    };
    agentStatuses: AgentLog[];
    recentActivity: AgentLog[];
  }> {
    const response = await apiRequest<{
      systemStatus: {
        runningAgents: number;
        totalAgents: number;
        lastActivity: Date | null;
        overallStatus: 'active' | 'idle' | 'error';
      };
      agentStatuses: AgentLog[];
      recentActivity: AgentLog[];
    }>('/api/agents/status');
    return response.data!;
  },

  // Get agent logs
  async getLogs(params: {
    page?: number;
    limit?: number;
    agentId?: string;
    status?: string;
  } = {}): Promise<{
    logs: AgentLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const endpoint = `/api/agents/logs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await apiRequest<{
      logs: AgentLog[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(endpoint);

    return response.data!;
  },

  // Trigger manual agent sync
  async triggerSync(): Promise<void> {
    await apiRequest('/api/agents/sync', {
      method: 'POST',
    });
  },
};

// Analytics API
export const analyticsApi = {
  // Get job statistics
  async getStats(): Promise<JobStats> {
    const response = await apiRequest<JobStats>('/api/analytics/stats');
    return response.data!;
  },

  // Get source performance
  async getSourceStats(): Promise<SourceStats[]> {
    const response = await apiRequest<SourceStats[]>('/api/analytics/sources');
    return response.data!;
  },
};

// Contact API
export const contactApi = {
  // Send contact form
  async sendMessage(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
    await apiRequest('/api/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Health check API
export const healthApi = {
  // Check API health
  async check(): Promise<{ status: string; timestamp: Date }> {
    const response = await apiRequest<{ status: string; timestamp: Date }>('/api/health');
    return response.data!;
  },
};

// Retry utility for failed requests
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError!;
}

// Batch request utility
export async function batchRequests<T>(
  requests: (() => Promise<T>)[],
  batchSize = 5
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(request => request()));
    results.push(...batchResults);
  }
  
  return results;
}
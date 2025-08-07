import { JobPosting, UserSettings, AgentLog } from './types';

// Cache configuration
const CACHE_KEYS = {
  JOBS: 'jobs_cache',
  SETTINGS: 'settings_cache',
  AGENT_STATUS: 'agent_status_cache',
  AGENT_LOGS: 'agent_logs_cache',
  ANALYTICS_STATS: 'analytics_stats_cache',
  SOURCE_STATS: 'source_stats_cache',
} as const;

const CACHE_EXPIRY = {
  JOBS: 5 * 60 * 1000, // 5 minutes
  SETTINGS: 30 * 60 * 1000, // 30 minutes
  AGENT_STATUS: 2 * 60 * 1000, // 2 minutes
  AGENT_LOGS: 5 * 60 * 1000, // 5 minutes
  ANALYTICS_STATS: 10 * 60 * 1000, // 10 minutes
  SOURCE_STATS: 15 * 60 * 1000, // 15 minutes
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// In-memory cache for runtime performance
const memoryCache = new Map<string, CacheEntry<any>>();

// Local storage cache for persistence
class CacheManager {
  private isClient = typeof window !== 'undefined';

  // Get from cache with fallback chain: memory -> localStorage -> null
  get<T>(key: string): T | null {
    // Check memory cache first
    const memoryEntry = memoryCache.get(key);
    if (memoryEntry && Date.now() < memoryEntry.expiry) {
      return memoryEntry.data;
    }

    // Check localStorage if available
    if (this.isClient) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (Date.now() < entry.expiry) {
            // Restore to memory cache
            memoryCache.set(key, entry);
            return entry.data;
          } else {
            // Remove expired entry
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.warn('Cache read error:', error);
      }
    }

    return null;
  }

  // Set in both memory and localStorage
  set<T>(key: string, data: T, expiry: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + expiry,
    };

    // Set in memory cache
    memoryCache.set(key, entry);

    // Set in localStorage if available
    if (this.isClient) {
      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch (error) {
        console.warn('Cache write error:', error);
        // If localStorage is full, try to clear old entries
        this.clearExpired();
        try {
          localStorage.setItem(key, JSON.stringify(entry));
        } catch (retryError) {
          console.warn('Cache write retry failed:', retryError);
        }
      }
    }
  }

  // Remove from both caches
  remove(key: string): void {
    memoryCache.delete(key);
    if (this.isClient) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Cache remove error:', error);
      }
    }
  }

  // Clear expired entries
  clearExpired(): void {
    const now = Date.now();

    // Clear memory cache
    for (const [key, entry] of memoryCache.entries()) {
      if (now >= entry.expiry) {
        memoryCache.delete(key);
      }
    }

    // Clear localStorage
    if (this.isClient) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && Object.values(CACHE_KEYS).includes(key as any)) {
            try {
              const stored = localStorage.getItem(key);
              if (stored) {
                const entry = JSON.parse(stored);
                if (now >= entry.expiry) {
                  keysToRemove.push(key);
                }
              }
            } catch (error) {
              // Remove corrupted entries
              keysToRemove.push(key);
            }
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.warn('Cache cleanup error:', error);
      }
    }
  }

  // Clear all cache
  clear(): void {
    memoryCache.clear();
    if (this.isClient) {
      try {
        Object.values(CACHE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
      } catch (error) {
        console.warn('Cache clear error:', error);
      }
    }
  }

  // Get cache statistics
  getStats(): {
    memoryEntries: number;
    localStorageEntries: number;
    totalSize: number;
  } {
    let localStorageEntries = 0;
    let totalSize = 0;

    if (this.isClient) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && Object.values(CACHE_KEYS).includes(key as any)) {
            localStorageEntries++;
            const value = localStorage.getItem(key);
            if (value) {
              totalSize += value.length;
            }
          }
        }
      } catch (error) {
        console.warn('Cache stats error:', error);
      }
    }

    return {
      memoryEntries: memoryCache.size,
      localStorageEntries,
      totalSize,
    };
  }
}

export const cache = new CacheManager();

// Typed cache helpers for specific data types
export const jobsCache = {
  get: (): JobPosting[] | null => cache.get<JobPosting[]>(CACHE_KEYS.JOBS),
  set: (jobs: JobPosting[]) => cache.set(CACHE_KEYS.JOBS, jobs, CACHE_EXPIRY.JOBS),
  remove: () => cache.remove(CACHE_KEYS.JOBS),
};

export const settingsCache = {
  get: (): UserSettings | null => cache.get<UserSettings>(CACHE_KEYS.SETTINGS),
  set: (settings: UserSettings) => cache.set(CACHE_KEYS.SETTINGS, settings, CACHE_EXPIRY.SETTINGS),
  remove: () => cache.remove(CACHE_KEYS.SETTINGS),
};

export const agentStatusCache = {
  get: () => cache.get<{
    systemStatus: {
      runningAgents: number;
      totalAgents: number;
      lastActivity: Date | null;
      overallStatus: 'active' | 'idle' | 'error';
    };
    agentStatuses: AgentLog[];
    recentActivity: AgentLog[];
  }>(CACHE_KEYS.AGENT_STATUS),
  set: (status: {
    systemStatus: {
      runningAgents: number;
      totalAgents: number;
      lastActivity: Date | null;
      overallStatus: 'active' | 'idle' | 'error';
    };
    agentStatuses: AgentLog[];
    recentActivity: AgentLog[];
  }) => cache.set(CACHE_KEYS.AGENT_STATUS, status, CACHE_EXPIRY.AGENT_STATUS),
  remove: () => cache.remove(CACHE_KEYS.AGENT_STATUS),
};

// Cache invalidation helpers
export const invalidateCache = {
  jobs: () => jobsCache.remove(),
  settings: () => settingsCache.remove(),
  agentStatus: () => agentStatusCache.remove(),
  all: () => cache.clear(),
};

// Auto cleanup on page load
if (typeof window !== 'undefined') {
  // Clean up expired entries on load
  cache.clearExpired();
  
  // Set up periodic cleanup
  setInterval(() => {
    cache.clearExpired();
  }, 5 * 60 * 1000); // Every 5 minutes
}
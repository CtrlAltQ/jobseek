import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError, withRetry } from '@/lib/api-client';
import { cache } from '@/lib/cache';
import { realtimeManager, RealtimeEvent } from '@/lib/realtime';

interface UseApiDataOptions<T> {
  cacheKey?: string;
  cacheDuration?: number;
  enableRealtime?: boolean;
  realtimeEventTypes?: string[];
  retryAttempts?: number;
  initialData?: T;
  onError?: (error: ApiError) => void;
  onSuccess?: (data: T) => void;
}

interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  mutate: (newData: T | ((prevData: T | null) => T)) => void;
  isStale: boolean;
}

export function useApiData<T>(
  fetcher: () => Promise<T>,
  options: UseApiDataOptions<T> = {}
): UseApiDataResult<T> {
  const {
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 5 minutes default
    enableRealtime = false,
    realtimeEventTypes = [],
    retryAttempts = 3,
    initialData = null,
    onError,
    onSuccess,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [isStale, setIsStale] = useState(false);
  
  const fetcherRef = useRef(fetcher);
  const lastFetchTime = useRef<number>(0);
  const mountedRef = useRef(true);

  // Update fetcher ref when it changes
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load from cache on mount
  useEffect(() => {
    if (cacheKey) {
      const cachedData = cache.get<T>(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setIsStale(false);
      }
    }
  }, [cacheKey]);

  // Fetch data function
  const fetchData = useCallback(async (force = false) => {
    // Don't fetch if already loading or component unmounted
    if (loading || !mountedRef.current) {
      return;
    }

    // Check if we have fresh cached data and not forcing
    if (!force && cacheKey && data) {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      if (timeSinceLastFetch < cacheDuration) {
        return;
      }
    }

    setLoading(true);
    setError(null);
    setIsStale(false);

    try {
      const result = await withRetry(fetcherRef.current, retryAttempts);
      
      if (!mountedRef.current) return;

      setData(result);
      lastFetchTime.current = Date.now();

      // Cache the result
      if (cacheKey) {
        cache.set(cacheKey, result, cacheDuration);
      }

      onSuccess?.(result);
    } catch (err) {
      if (!mountedRef.current) return;

      const apiError = err instanceof ApiError ? err : new ApiError(err instanceof Error ? err.message : 'Unknown error');
      setError(apiError);
      onError?.(apiError);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [loading, cacheKey, data, cacheDuration, retryAttempts, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up real-time updates
  useEffect(() => {
    if (!enableRealtime || realtimeEventTypes.length === 0) {
      return;
    }

    const unsubscribe = realtimeManager.subscribe((event: RealtimeEvent) => {
      if (realtimeEventTypes.includes(event.type)) {
        // Mark data as stale and optionally refetch
        setIsStale(true);
        
        // Auto-refetch for certain event types
        if (['jobs_updated', 'settings_updated'].includes(event.type)) {
          fetchData(true);
        }
      }
    });

    return unsubscribe;
  }, [enableRealtime, realtimeEventTypes, fetchData]);

  // Mutate function for optimistic updates
  const mutate = useCallback((newData: T | ((prevData: T | null) => T)) => {
    setData(prevData => {
      const updatedData = typeof newData === 'function' 
        ? (newData as (prevData: T | null) => T)(prevData)
        : newData;
      
      // Update cache
      if (cacheKey) {
        cache.set(cacheKey, updatedData, cacheDuration);
      }
      
      return updatedData;
    });
  }, [cacheKey, cacheDuration]);

  // Refetch function
  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    mutate,
    isStale,
  };
}

// Specialized hooks for common data types
export function useJobs(params: any = {}) {
  const { jobsApi } = require('@/lib/api-client');
  
  return useApiData(
    () => jobsApi.getJobs(params),
    {
      cacheKey: `jobs_${JSON.stringify(params)}`,
      enableRealtime: true,
      realtimeEventTypes: ['jobs_updated', 'job_status_changed'],
      cacheDuration: 5 * 60 * 1000, // 5 minutes
    }
  );
}

export function useSettings() {
  const { settingsApi } = require('@/lib/api-client');
  
  return useApiData(
    () => settingsApi.getSettings(),
    {
      cacheKey: 'settings',
      enableRealtime: true,
      realtimeEventTypes: ['settings_updated'],
      cacheDuration: 30 * 60 * 1000, // 30 minutes
    }
  );
}

export function useAgentStatus() {
  const { agentsApi } = require('@/lib/api-client');
  
  return useApiData(
    () => agentsApi.getStatus(),
    {
      cacheKey: 'agent_status',
      enableRealtime: true,
      realtimeEventTypes: ['agent_status_changed'],
      cacheDuration: 2 * 60 * 1000, // 2 minutes
    }
  );
}
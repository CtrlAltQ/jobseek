'use client';

import { useState, useEffect, useMemo } from 'react';
import { JobPosting, FilterOptions } from '@/lib/types';
import { useJobs } from '@/hooks/useApiData';
import { offlineJobsApi, offlineManager } from '@/lib/offline';
import { realtimeManager } from '@/lib/realtime';
import JobCard from './JobCard';
import JobFilters from './JobFilters';
import JobDetailModal from './JobDetailModal';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, X, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface JobDashboardProps {
  initialJobs?: JobPosting[];
}

export default function JobDashboard({ initialJobs = [] }: JobDashboardProps) {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'salary'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [offlineStatus, setOfflineStatus] = useState(offlineManager.getStatus());
  const [realtimeStatus, setRealtimeStatus] = useState(realtimeManager.getStatus());

  const JOBS_PER_PAGE = 12;

  // Use the new API hook with caching and real-time updates
  const { 
    data: jobsData, 
    loading, 
    error: apiError, 
    refetch, 
    mutate: mutateJobs,
    isStale 
  } = useJobs({
    page: currentPage,
    limit: JOBS_PER_PAGE,
    ...filters
  });

  const jobs = (jobsData as any)?.jobs || initialJobs;
  const pagination = (jobsData as any)?.pagination;
  const error = apiError?.message || null;

  // Update offline and realtime status
  useEffect(() => {
    const updateOfflineStatus = () => setOfflineStatus(offlineManager.getStatus());
    const updateRealtimeStatus = () => setRealtimeStatus(realtimeManager.getStatus());

    // Update status periodically
    const interval = setInterval(() => {
      updateOfflineStatus();
      updateRealtimeStatus();
    }, 5000);

    // Listen for online/offline events
    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', updateOfflineStatus);
      window.removeEventListener('offline', updateOfflineStatus);
    };
  }, []);

  // Update job status with offline support
  const handleStatusChange = async (jobId: string, status: JobPosting['status']) => {
    try {
      // Optimistic update
      mutateJobs(prevData => {
        if (!prevData) return prevData;
        return {
          ...prevData,
          jobs: prevData.jobs.map(job => 
            job._id === jobId ? { ...job, status, updatedAt: new Date() } : job
          )
        };
      });

      // Use offline-aware API
      await offlineJobsApi.updateJobStatus(jobId, status);
    } catch (err) {
      console.error('Failed to update job status:', err);
      // Revert optimistic update on error
      refetch();
    }
  };

  // Handle job detail view
  const handleViewDetails = (job: JobPosting) => {
    setSelectedJob(job);
    setIsModalOpen(true);
    
    // Mark as viewed if it's new
    if (job.status === 'new') {
      handleStatusChange(job._id!, 'viewed');
    }
  };

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const locations = [...new Set(jobs.map(job => job.location))].sort();
    const companies = [...new Set(jobs.map(job => job.company))].sort();
    const sources = [...new Set(jobs.map(job => job.source))].sort();
    
    return { locations, companies, sources };
  }, [jobs]);

  // Filter and search jobs
  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(term) ||
        job.company.toLowerCase().includes(term) ||
        job.description.toLowerCase().includes(term) ||
        job.requirements.some(req => req.toLowerCase().includes(term))
      );
    }

    // Apply filters
    if (filters.dateRange) {
      filtered = filtered.filter(job => {
        const jobDate = new Date(job.postedDate);
        return jobDate >= filters.dateRange!.start && jobDate <= filters.dateRange!.end;
      });
    }

    if (filters.locations && filters.locations.length > 0) {
      filtered = filtered.filter(job => filters.locations!.includes(job.location));
    }

    if (filters.companies && filters.companies.length > 0) {
      filtered = filtered.filter(job => filters.companies!.includes(job.company));
    }

    if (filters.sources && filters.sources.length > 0) {
      filtered = filtered.filter(job => filters.sources!.includes(job.source));
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(job => filters.status!.includes(job.status));
    }

    if (filters.salaryRange) {
      filtered = filtered.filter(job => {
        if (!job.salary) return false;
        const jobMin = job.salary.min || 0;
        const jobMax = job.salary.max || Infinity;
        const filterMin = filters.salaryRange!.min || 0;
        const filterMax = filters.salaryRange!.max || Infinity;
        
        return jobMax >= filterMin && jobMin <= filterMax;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case 'date':
          comparison = new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
          break;
        case 'salary':
          const aSalary = a.salary?.max || a.salary?.min || 0;
          const bSalary = b.salary?.max || b.salary?.min || 0;
          comparison = bSalary - aSalary;
          break;
      }
      
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return filtered;
  }, [jobs, filters, searchTerm, sortBy, sortOrder]);

  // Use server-side pagination if available, otherwise client-side
  const totalPages = pagination?.pages || Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
  const paginatedJobs = pagination ? filteredJobs : filteredJobs.slice(
    (currentPage - 1) * JOBS_PER_PAGE,
    currentPage * JOBS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Job Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
            </p>
          </div>
          
          {/* Sort Controls */}
          <div className="flex gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="relevance">Sort by Relevance</option>
              <option value="date">Sort by Date</option>
              <option value="salary">Sort by Salary</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
            
            <button
              onClick={refetch}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="mb-4 flex gap-2">
          {/* Offline Status */}
          <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${
            offlineStatus.isOnline 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {offlineStatus.isOnline ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            {offlineStatus.isOnline ? 'Online' : 'Offline'}
            {offlineStatus.pendingActions > 0 && (
              <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
                {offlineStatus.pendingActions} pending
              </span>
            )}
          </div>

          {/* Real-time Status */}
          <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${
            realtimeStatus.connected 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              realtimeStatus.connected ? 'bg-blue-500' : 'bg-gray-400'
            }`} />
            {realtimeStatus.connected ? 'Live Updates' : 'No Live Updates'}
          </div>

          {/* Stale Data Indicator */}
          {isStale && (
            <div className="px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Data may be outdated
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => refetch()}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <JobFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableLocations={[]}
        availableCompanies={[]}
        availableSources={[]}
      />

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading jobs...</span>
        </div>
      )}

      {/* Job Grid */}
      {!loading && (
        <>
          {paginatedJobs.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {paginatedJobs.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  onStatusChange={handleStatusChange}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No jobs found</div>
              <p className="text-gray-400">Try adjusting your filters or search terms</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <span className="text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Job Detail Modal */}
      <JobDetailModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedJob(null);
        }}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
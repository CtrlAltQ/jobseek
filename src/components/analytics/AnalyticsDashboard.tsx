'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StatsOverview from './StatsOverview';
import JobsChart from './JobsChart';
import SourcePerformance from './SourcePerformance';
import AgentActivityLog from './AgentActivityLog';
import { ApiResponse } from '@/lib/types';

interface AnalyticsData {
  jobStats: {
    totalJobs: number;
    new: number;
    viewed: number;
    applied: number;
    dismissed: number;
    averageRelevanceScore: number;
  };
  jobsOverTime: Array<{
    date: string;
    count: number;
  }>;
  agentActivity: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    totalJobsFound: number;
    totalJobsProcessed: number;
    successRate: number;
  };
}

interface SourceData {
  source: string;
  jobsFound: number;
  averageRelevanceScore: number;
  appliedJobs: number;
  applicationRate: number;
  totalRuns: number;
  successfulRuns: number;
  successRate: number;
  totalErrors: number;
  lastRun: string | null;
  efficiency: number;
}

const AnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30); // days

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch analytics stats
      const statsResponse = await fetch(`/api/analytics/stats?days=${timeRange}`);
      const statsResult: ApiResponse<AnalyticsData> = await statsResponse.json();

      if (!statsResult.success) {
        throw new Error(statsResult.error || 'Failed to fetch analytics stats');
      }

      // Fetch source performance data
      const sourcesResponse = await fetch(`/api/analytics/sources?days=${timeRange}`);
      const sourcesResult: ApiResponse<SourceData[]> = await sourcesResponse.json();

      if (!sourcesResult.success) {
        throw new Error(sourcesResult.error || 'Failed to fetch source data');
      }

      setAnalyticsData(statsResult.data!);
      setSourceData(sourcesResult.data!);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (days: number) => {
    setTimeRange(days);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 bg-gray-200 rounded-lg"></div>
              <div className="h-80 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Analytics</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchAnalyticsData}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!analyticsData) {
    return null;
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 p-6"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">
            Analytics Dashboard
          </h1>
          
          {/* Time Range Selector */}
          <div className="flex space-x-2">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => handleTimeRangeChange(days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === days
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        {/* Stats Overview */}
        <StatsOverview 
          jobStats={analyticsData.jobStats}
          agentActivity={analyticsData.agentActivity}
        />

        {/* Charts and Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <JobsChart jobsOverTime={analyticsData.jobsOverTime} />
          <SourcePerformance sourceData={sourceData} />
        </div>

        {/* Agent Activity Log */}
        <AgentActivityLog timeRange={timeRange} />
      </div>
    </motion.main>
  );
};

export default AnalyticsDashboard;
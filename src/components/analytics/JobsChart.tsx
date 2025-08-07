'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface JobsChartProps {
  jobsOverTime: Array<{
    date: string;
    count: number;
  }>;
}

const JobsChart: React.FC<JobsChartProps> = ({ jobsOverTime }) => {
  if (!jobsOverTime || jobsOverTime.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Jobs Discovered Over Time</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>No job discovery data available</p>
          </div>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...jobsOverTime.map(item => item.count));
  const totalJobs = jobsOverTime.reduce((sum, item) => sum + item.count, 0);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Jobs Discovered Over Time</h3>
        <div className="text-sm text-gray-500">
          Total: {totalJobs} jobs
        </div>
      </div>

      <div className="relative">
        {/* Chart container */}
        <div className="flex items-end justify-between h-64 mb-4">
          {jobsOverTime.map((item, index) => {
            const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            
            return (
              <div key={item.date} className="flex flex-col items-center flex-1 mx-1">
                {/* Bar */}
                <div className="relative w-full max-w-12 group">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm hover:from-blue-600 hover:to-blue-500 transition-colors cursor-pointer"
                    style={{ minHeight: item.count > 0 ? '4px' : '0px' }}
                    tabIndex={-1}
                  />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {item.count} jobs on {formatDate(item.date)}
                  </div>
                </div>
                
                {/* Count label */}
                {item.count > 0 && (
                  <div className="text-xs font-medium text-gray-600 mt-1">
                    {item.count}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          {jobsOverTime.map((item, index) => {
            // Show every other date to avoid crowding
            const showLabel = index === 0 || index === jobsOverTime.length - 1 || index % 2 === 0;
            
            return (
              <div key={item.date} className="flex-1 text-center">
                {showLabel && formatDate(item.date)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.round(totalJobs / jobsOverTime.length)}
            </div>
            <div className="text-xs text-gray-500">Avg per day</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.max(...jobsOverTime.map(item => item.count))}
            </div>
            <div className="text-xs text-gray-500">Peak day</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {jobsOverTime.filter(item => item.count > 0).length}
            </div>
            <div className="text-xs text-gray-500">Active days</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default JobsChart;
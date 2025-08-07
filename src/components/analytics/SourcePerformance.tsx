'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

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

interface SourcePerformanceProps {
  sourceData: SourceData[];
}

type SortField = 'jobsFound' | 'successRate' | 'averageRelevanceScore' | 'efficiency' | 'applicationRate';

const SourcePerformance: React.FC<SourcePerformanceProps> = ({ sourceData }) => {
  const [sortField, setSortField] = useState<SortField>('jobsFound');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...sourceData].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const formatLastRun = (lastRun: string | null) => {
    if (!lastRun) return 'Never';
    const date = new Date(lastRun);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (successRate: number) => {
    if (successRate >= 80) return 'text-green-600 bg-green-50';
    if (successRate >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (!sourceData || sourceData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Performance</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>No source performance data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Source Performance</h3>
        <div className="text-sm text-gray-500">
          {sourceData.length} sources
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-medium text-gray-700">Source</th>
              <th 
                className="text-right py-3 px-2 font-medium text-gray-700 cursor-pointer hover:text-gray-900 transition-colors"
                onClick={() => handleSort('jobsFound')}
              >
                <div className="flex items-center justify-end">
                  Jobs Found
                  {sortField === 'jobsFound' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="text-right py-3 px-2 font-medium text-gray-700 cursor-pointer hover:text-gray-900 transition-colors"
                onClick={() => handleSort('successRate')}
              >
                <div className="flex items-center justify-end">
                  Success Rate
                  {sortField === 'successRate' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="text-right py-3 px-2 font-medium text-gray-700 cursor-pointer hover:text-gray-900 transition-colors"
                onClick={() => handleSort('averageRelevanceScore')}
              >
                <div className="flex items-center justify-end">
                  Avg Score
                  {sortField === 'averageRelevanceScore' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="text-right py-3 px-2 font-medium text-gray-700 cursor-pointer hover:text-gray-900 transition-colors"
                onClick={() => handleSort('efficiency')}
              >
                <div className="flex items-center justify-end">
                  Efficiency
                  {sortField === 'efficiency' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="text-right py-3 px-2 font-medium text-gray-700">Last Run</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((source, index) => (
              <motion.tr
                key={source.source}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-3"></div>
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {source.source.replace(/[-_]/g, ' ')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {source.totalRuns} runs • {source.totalErrors} errors
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-2 text-right">
                  <div className="font-semibold text-gray-900">
                    {source.jobsFound.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {source.appliedJobs} applied ({source.applicationRate}%)
                  </div>
                </td>
                <td className="py-4 px-2 text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(source.successRate)}`}>
                    {source.successRate}%
                  </span>
                </td>
                <td className="py-4 px-2 text-right">
                  <div className="font-medium text-gray-900">
                    {source.averageRelevanceScore}%
                  </div>
                </td>
                <td className="py-4 px-2 text-right">
                  <div className="font-medium text-gray-900">
                    {source.efficiency}
                  </div>
                  <div className="text-xs text-gray-500">
                    jobs/run
                  </div>
                </td>
                <td className="py-4 px-2 text-right text-gray-500">
                  {formatLastRun(source.lastRun)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {sourceData.reduce((sum, s) => sum + s.jobsFound, 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Total Jobs</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.round(sourceData.reduce((sum, s) => sum + s.successRate, 0) / sourceData.length)}%
            </div>
            <div className="text-xs text-gray-500">Avg Success</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.round(sourceData.reduce((sum, s) => sum + s.averageRelevanceScore, 0) / sourceData.length)}%
            </div>
            <div className="text-xs text-gray-500">Avg Relevance</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {sourceData.reduce((sum, s) => sum + s.totalErrors, 0)}
            </div>
            <div className="text-xs text-gray-500">Total Errors</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SourcePerformance;
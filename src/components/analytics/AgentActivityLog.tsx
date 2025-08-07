'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AgentLog, ApiResponse } from '@/lib/types';

interface AgentActivityLogProps {
  timeRange: number; // days
}

interface FilterOptions {
  source: string;
  status: string;
  search: string;
}

const AgentActivityLog: React.FC<AgentActivityLogProps> = ({ timeRange }) => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    source: '',
    status: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  useEffect(() => {
    fetchAgentLogs();
  }, [timeRange]);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const fetchAgentLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/agents/logs?days=${timeRange}&limit=100`);
      const result: ApiResponse<AgentLog[]> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch agent logs');
      }

      setLogs(result.data || []);
    } catch (err) {
      console.error('Failed to fetch agent logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch agent logs');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Filter by source
    if (filters.source) {
      filtered = filtered.filter(log => 
        log.source.toLowerCase().includes(filters.source.toLowerCase())
      );
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(log => log.status === filters.status);
    }

    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.agentId.toLowerCase().includes(searchTerm) ||
        log.source.toLowerCase().includes(searchTerm) ||
        log.errors.some(error => error.toLowerCase().includes(searchTerm))
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ source: '', status: '', search: '' });
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    if (!endTime) return 'Running...';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const seconds = Math.floor(durationMs / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: AgentLog['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUniqueValues = (key: keyof AgentLog): string[] => {
    const values = logs.map(log => {
      const value = log[key];
      return typeof value === 'string' ? value : String(value);
    }).filter(Boolean);
    return [...new Set(values)].sort();
  };

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Activity Log</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Activity Log</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchAgentLogs}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Agent Activity Log</h3>
        <div className="text-sm text-gray-500">
          {filteredLogs.length} of {logs.length} logs
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <select
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Sources</option>
            {getUniqueValues('source').map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="running">Running</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        {(filters.source || filters.status || filters.search) && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Logs Table */}
      {currentLogs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No logs found matching your criteria</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentLogs.map((log, index) => (
            <motion.div
              key={log._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {log.source}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatTimestamp(log.startTime)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <span className="ml-1 font-medium">
                        {formatDuration(log.startTime, log.endTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Jobs Found:</span>
                      <span className="ml-1 font-medium">{log.jobsFound}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Processed:</span>
                      <span className="ml-1 font-medium">{log.jobsProcessed}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Errors:</span>
                      <span className="ml-1 font-medium">{log.errors.length}</span>
                    </div>
                  </div>

                  {log.errors.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <div className="text-sm font-medium text-red-800 mb-1">Errors:</div>
                      <div className="space-y-1">
                        {log.errors.slice(0, 3).map((error, errorIndex) => (
                          <div key={errorIndex} className="text-sm text-red-700">
                            {error}
                          </div>
                        ))}
                        {log.errors.length > 3 && (
                          <div className="text-sm text-red-600">
                            +{log.errors.length - 3} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} logs
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AgentActivityLog;
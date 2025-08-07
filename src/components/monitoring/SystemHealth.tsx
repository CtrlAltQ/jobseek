'use client';

import { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface HealthStatus {
  success: boolean;
  message: string;
  timestamp: string;
  environment: string;
  version: string;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
      error?: string;
    };
    agents: {
      status: 'active' | 'inactive' | 'unknown';
      lastRun?: string;
      error?: string;
    };
  };
  uptime: number;
}

export default function SystemHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'disconnected':
      case 'inactive':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 text-red-600">
          <XCircleIcon className="h-5 w-5" />
          <span className="font-medium">Health Check Failed</span>
        </div>
        <p className="text-gray-600 mt-2">{error}</p>
        <button
          onClick={fetchHealth}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">System Health</h3>
        <div className="flex items-center space-x-2">
          {getStatusIcon(health.success ? 'connected' : 'disconnected')}
          <span className={`font-medium ${getStatusColor(health.success)}`}>
            {health.success ? 'Healthy' : 'Issues Detected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Environment</span>
            <span className="text-sm font-medium capitalize">{health.environment}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Version</span>
            <span className="text-sm font-medium">{health.version}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Uptime</span>
            <span className="text-sm font-medium">{formatUptime(health.uptime / 1000)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Updated</span>
            <span className="text-sm font-medium">
              {new Date(health.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Services</h4>
        <div className="space-y-3">
          {/* Database Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(health.services.database.status)}
              <span className="text-sm text-gray-700">Database</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium capitalize">
                {health.services.database.status}
              </div>
              {health.services.database.responseTime && (
                <div className="text-xs text-gray-500">
                  {health.services.database.responseTime}ms
                </div>
              )}
              {health.services.database.error && (
                <div className="text-xs text-red-500">
                  {health.services.database.error}
                </div>
              )}
            </div>
          </div>

          {/* Agents Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(health.services.agents.status)}
              <span className="text-sm text-gray-700">Agents</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium capitalize">
                {health.services.agents.status}
              </div>
              {health.services.agents.lastRun && (
                <div className="text-xs text-gray-500">
                  Last run: {new Date(health.services.agents.lastRun).toLocaleString()}
                </div>
              )}
              {health.services.agents.error && (
                <div className="text-xs text-red-500">
                  {health.services.agents.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <button
          onClick={fetchHealth}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}
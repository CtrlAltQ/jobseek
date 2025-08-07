import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the child components
jest.mock('@/components/analytics/StatsOverview', () => {
  return function MockStatsOverview({ jobStats, agentActivity }: any) {
    return (
      <div data-testid="stats-overview">
        <div>Total Jobs: {jobStats.totalJobs}</div>
        <div>Success Rate: {agentActivity.successRate}%</div>
      </div>
    );
  };
});

jest.mock('@/components/analytics/JobsChart', () => {
  return function MockJobsChart({ jobsOverTime }: any) {
    return (
      <div data-testid="jobs-chart">
        Jobs Over Time: {jobsOverTime.length} data points
      </div>
    );
  };
});

jest.mock('@/components/analytics/SourcePerformance', () => {
  return function MockSourcePerformance({ sourceData }: any) {
    return (
      <div data-testid="source-performance">
        Sources: {sourceData.length}
      </div>
    );
  };
});

jest.mock('@/components/analytics/AgentActivityLog', () => {
  return function MockAgentActivityLog({ timeRange }: any) {
    return (
      <div data-testid="agent-activity-log">
        Time Range: {timeRange} days
      </div>
    );
  };
});

// Mock fetch
global.fetch = jest.fn();

const mockAnalyticsData = {
  jobStats: {
    totalJobs: 150,
    new: 25,
    viewed: 50,
    applied: 30,
    dismissed: 45,
    averageRelevanceScore: 78.5
  },
  jobsOverTime: [
    { date: '2024-01-01', count: 10 },
    { date: '2024-01-02', count: 15 },
    { date: '2024-01-03', count: 8 }
  ],
  agentActivity: {
    totalRuns: 20,
    successfulRuns: 18,
    failedRuns: 2,
    totalJobsFound: 150,
    totalJobsProcessed: 145,
    successRate: 90
  }
};

const mockSourceData = [
  {
    source: 'indeed',
    jobsFound: 75,
    averageRelevanceScore: 80,
    appliedJobs: 15,
    applicationRate: 20,
    totalRuns: 10,
    successfulRuns: 9,
    successRate: 90,
    totalErrors: 1,
    lastRun: '2024-01-03T10:00:00Z',
    efficiency: 7.5
  },
  {
    source: 'linkedin',
    jobsFound: 50,
    averageRelevanceScore: 85,
    appliedJobs: 10,
    applicationRate: 20,
    totalRuns: 8,
    successfulRuns: 7,
    successRate: 87.5,
    totalErrors: 2,
    lastRun: '2024-01-03T09:00:00Z',
    efficiency: 6.25
  }
];

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AnalyticsDashboard />);

    // In loading state, the header and buttons are not rendered yet
    // expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    // expect(screen.getByRole('button', { name: '30 days' })).toBeInTheDocument();
    
    // Check for loading skeleton
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('renders analytics data successfully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: mockAnalyticsData
        })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: mockSourceData
        })
      });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
    });

    expect(screen.getByTestId('jobs-chart')).toBeInTheDocument();
    expect(screen.getByTestId('source-performance')).toBeInTheDocument();
    expect(screen.getByTestId('agent-activity-log')).toBeInTheDocument();

    // Check that data is passed correctly
    expect(screen.getByText('Total Jobs: 150')).toBeInTheDocument();
    expect(screen.getByText('Success Rate: 90%')).toBeInTheDocument();
    expect(screen.getByText('Jobs Over Time: 3 data points')).toBeInTheDocument();
    expect(screen.getByText('Sources: 2')).toBeInTheDocument();
    expect(screen.getByText('Time Range: 30 days')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Analytics')).toBeInTheDocument();
    });

    expect(screen.getByText('API Error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('handles API response errors', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        error: 'Database connection failed'
      })
    });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Analytics')).toBeInTheDocument();
    });

    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
  });

  it('changes time range when buttons are clicked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: mockAnalyticsData
        })
      });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
    });

    // Click 7 days button
    fireEvent.click(screen.getByRole('button', { name: '7 days' }));

    await waitFor(() => {
      expect(screen.getByText('Time Range: 7 days')).toBeInTheDocument();
    });

    // Verify API was called with correct parameter
    expect(fetch).toHaveBeenCalledWith('/api/analytics/stats?days=7');
    expect(fetch).toHaveBeenCalledWith('/api/analytics/sources?days=7');
  });

  it('retries data fetching when retry button is clicked', async () => {
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: mockAnalyticsData
        })
      });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Analytics')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
    });
  });

  it('applies correct CSS classes for time range buttons', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAnalyticsData
      })
    });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
    });

    const thirtyDaysButton = screen.getByRole('button', { name: '30 days' });
    const sevenDaysButton = screen.getByRole('button', { name: '7 days' });

    // 30 days should be active by default
    expect(thirtyDaysButton).toHaveClass('bg-blue-600', 'text-white');
    expect(sevenDaysButton).toHaveClass('bg-white', 'text-gray-700');

    // Click 7 days button
    fireEvent.click(sevenDaysButton);

    await waitFor(() => {
      expect(sevenDaysButton).toHaveClass('bg-blue-600', 'text-white');
      expect(thirtyDaysButton).toHaveClass('bg-white', 'text-gray-700');
    });
  });

  it('makes correct API calls on mount', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAnalyticsData
      })
    });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    expect(fetch).toHaveBeenCalledWith('/api/analytics/stats?days=30');
    expect(fetch).toHaveBeenCalledWith('/api/analytics/sources?days=30');
  });
});
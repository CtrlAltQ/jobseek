import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AgentActivityLog from '@/components/analytics/AgentActivityLog';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock fetch
global.fetch = jest.fn();

const mockAgentLogs = [
  {
    _id: '1',
    agentId: 'indeed-scraper',
    source: 'indeed',
    startTime: new Date('2024-01-03T10:00:00Z'),
    endTime: new Date('2024-01-03T10:05:00Z'),
    jobsFound: 25,
    jobsProcessed: 23,
    errors: [],
    status: 'success' as const,
    createdAt: new Date('2024-01-03T10:05:00Z')
  },
  {
    _id: '2',
    agentId: 'linkedin-scraper',
    source: 'linkedin',
    startTime: new Date('2024-01-03T09:00:00Z'),
    endTime: new Date('2024-01-03T09:10:00Z'),
    jobsFound: 15,
    jobsProcessed: 15,
    errors: ['Rate limit exceeded'],
    status: 'partial' as const,
    createdAt: new Date('2024-01-03T09:10:00Z')
  },
  {
    _id: '3',
    agentId: 'remote-scraper',
    source: 'remote-ok',
    startTime: new Date('2024-01-03T08:00:00Z'),
    endTime: undefined,
    jobsFound: 0,
    jobsProcessed: 0,
    errors: ['Connection timeout', 'Authentication failed'],
    status: 'running' as const,
    createdAt: new Date('2024-01-03T08:00:00Z')
  }
];

describe('AgentActivityLog', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AgentActivityLog timeRange={30} />);

    expect(screen.getByText('Agent Activity Log')).toBeInTheDocument();
    
    // Check for loading skeleton
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('renders agent logs successfully', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAgentLogs
      })
    });

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('3 of 3 logs')).toBeInTheDocument();
    });

    // Check that logs are displayed (sources appear in both dropdown and log entries)
    const indeedElements = screen.getAllByText('indeed');
    const linkedinElements = screen.getAllByText('linkedin');
    const remoteOkElements = screen.getAllByText('remote-ok');
    
    expect(indeedElements.length).toBeGreaterThan(0);
    expect(linkedinElements.length).toBeGreaterThan(0);
    expect(remoteOkElements.length).toBeGreaterThan(0);
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('displays correct log information', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAgentLogs
      })
    });

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('success')).toBeInTheDocument();
    });

    // Check status badges
    expect(screen.getByText('success')).toBeInTheDocument();
    expect(screen.getByText('partial')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();

    // Check job counts
    expect(screen.getByText('25')).toBeInTheDocument(); // Jobs found
    expect(screen.getByText('23')).toBeInTheDocument(); // Jobs processed
  });

  it('formats duration correctly', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAgentLogs
      })
    });

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('5m 0s')).toBeInTheDocument(); // 5 minute duration
    });

    expect(screen.getByText('10m 0s')).toBeInTheDocument(); // 10 minute duration
    expect(screen.getByText('Running...')).toBeInTheDocument(); // No end time
  });

  it('displays errors when present', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAgentLogs
      })
    });

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    });

    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
  });

  it('filters logs by source', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAgentLogs
      })
    });

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('3 of 3 logs')).toBeInTheDocument();
    });

    // Filter by indeed
    const sourceSelect = screen.getByDisplayValue('All Sources');
    fireEvent.change(sourceSelect, { target: { value: 'indeed' } });

    await waitFor(() => {
      expect(screen.getByText('1 of 3 logs')).toBeInTheDocument();
    });

    // Should only show indeed log (linkedin should not appear in log entries, only in dropdown)
    const logEntries = document.querySelectorAll('.space-y-3 .border');
    expect(logEntries).toHaveLength(1); // Only one log entry should be visible
    
    // The indeed log should be visible
    const indeedLogEntry = screen.getByText('success');
    expect(indeedLogEntry).toBeInTheDocument();
    
    // LinkedIn should still be in the dropdown but not in the visible logs
    const linkedinOption = screen.getByRole('option', { name: 'linkedin' });
    expect(linkedinOption).toBeInTheDocument();
  });

  it('filters logs by status', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAgentLogs
      })
    });

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('3 of 3 logs')).toBeInTheDocument();
    });

    // Filter by success status
    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'success' } });

    await waitFor(() => {
      expect(screen.getByText('1 of 3 logs')).toBeInTheDocument();
    });
  });

  it('filters logs by search term', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAgentLogs
      })
    });

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('3 of 3 logs')).toBeInTheDocument();
    });

    // Search for "linkedin"
    const searchInput = screen.getByPlaceholderText('Search logs...');
    fireEvent.change(searchInput, { target: { value: 'linkedin' } });

    await waitFor(() => {
      expect(screen.getByText('1 of 3 logs')).toBeInTheDocument();
    });
  });

  it('clears filters when clear button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAgentLogs
      })
    });

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('3 of 3 logs')).toBeInTheDocument();
    });

    // Apply a filter
    const sourceSelect = screen.getByDisplayValue('All Sources');
    fireEvent.change(sourceSelect, { target: { value: 'indeed' } });

    await waitFor(() => {
      expect(screen.getByText('1 of 3 logs')).toBeInTheDocument();
    });

    // Clear filters
    fireEvent.click(screen.getByText('Clear'));

    await waitFor(() => {
      expect(screen.getByText('3 of 3 logs')).toBeInTheDocument();
    });
  });

  it('handles pagination correctly', async () => {
    // Create more logs to test pagination
    const manyLogs = Array.from({ length: 25 }, (_, i) => ({
      ...mockAgentLogs[0],
      _id: `log-${i}`,
      agentId: `agent-${i}`,
      source: `source-${i}`
    }));

    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: manyLogs
      })
    });

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('25 of 25 logs')).toBeInTheDocument();
    });

    // Should show pagination controls
    expect(screen.getByText('Showing 1-10 of 25 logs')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('applies correct status colors', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAgentLogs
      })
    });

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('success')).toBeInTheDocument();
    });

    const successBadge = screen.getByText('success');
    expect(successBadge).toHaveClass('bg-green-100', 'text-green-800');

    const partialBadge = screen.getByText('partial');
    expect(partialBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');

    const runningBadge = screen.getByText('running');
    expect(runningBadge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('shows empty state when no logs match filters', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAgentLogs
      })
    });

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('3 of 3 logs')).toBeInTheDocument();
    });

    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search logs...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No logs found matching your criteria')).toBeInTheDocument();
    });
  });

  it('fetches logs with correct API parameters', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAgentLogs
      })
    });

    render(<AgentActivityLog timeRange={7} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/agents/logs?days=7&limit=100');
    });
  });

  it('refetches data when timeRange changes', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockAgentLogs
      })
    });

    const { rerender } = render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/agents/logs?days=30&limit=100');
    });

    // Change timeRange
    rerender(<AgentActivityLog timeRange={7} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/agents/logs?days=7&limit=100');
    });
  });

  it('truncates error list when more than 3 errors', async () => {
    const logWithManyErrors = {
      ...mockAgentLogs[0],
      errors: ['Error 1', 'Error 2', 'Error 3', 'Error 4', 'Error 5']
    };

    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: [logWithManyErrors]
      })
    });

    render(<AgentActivityLog timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText('+2 more errors')).toBeInTheDocument();
    });
  });
});
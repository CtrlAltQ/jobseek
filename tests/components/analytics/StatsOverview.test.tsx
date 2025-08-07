import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatsOverview from '@/components/analytics/StatsOverview';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';

const mockJobStats = {
  totalJobs: 150,
  new: 25,
  viewed: 50,
  applied: 30,
  dismissed: 45,
  averageRelevanceScore: 78.5
};

const mockAgentActivity = {
  totalRuns: 20,
  successfulRuns: 18,
  failedRuns: 2,
  totalJobsFound: 150,
  totalJobsProcessed: 145,
  successRate: 90
};

describe('StatsOverview', () => {
  it('renders all stat cards with correct data', () => {
    render(<StatsOverview jobStats={mockJobStats} agentActivity={mockAgentActivity} />);

    // Check Total Jobs Found card
    expect(screen.getByText('Total Jobs Found')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('25 new jobs')).toBeInTheDocument();

    // Check Applications Sent card
    expect(screen.getByText('Applications Sent')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('20.0% application rate')).toBeInTheDocument();

    // Check Average Relevance card
    expect(screen.getByText('Average Relevance')).toBeInTheDocument();
    expect(screen.getByText('78.5%')).toBeInTheDocument();
    expect(screen.getByText('Job matching score')).toBeInTheDocument();

    // Check Agent Success Rate card
    expect(screen.getByText('Agent Success Rate')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('18/20 runs')).toBeInTheDocument();
  });

  it('renders additional stats in second row', () => {
    render(<StatsOverview jobStats={mockJobStats} agentActivity={mockAgentActivity} />);

    // Check Jobs Processed card
    expect(screen.getByText('Jobs Processed')).toBeInTheDocument();
    expect(screen.getByText('145')).toBeInTheDocument();
    expect(screen.getByText('96.7% efficiency')).toBeInTheDocument();

    // Check Viewed Jobs card
    expect(screen.getByText('Viewed Jobs')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();

    // Check Dismissed Jobs card
    expect(screen.getByText('Dismissed Jobs')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('Not relevant')).toBeInTheDocument();

    // Check Failed Runs card
    expect(screen.getByText('Failed Runs')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Agent errors')).toBeInTheDocument();
  });

  it('calculates application rate correctly', () => {
    const customJobStats = {
      ...mockJobStats,
      totalJobs: 100,
      applied: 25
    };

    render(<StatsOverview jobStats={customJobStats} agentActivity={mockAgentActivity} />);

    expect(screen.getByText('25.0% application rate')).toBeInTheDocument();
  });

  it('handles zero total jobs for application rate', () => {
    const customJobStats = {
      ...mockJobStats,
      totalJobs: 0,
      applied: 0
    };

    render(<StatsOverview jobStats={customJobStats} agentActivity={mockAgentActivity} />);

    expect(screen.getByText('0% application rate')).toBeInTheDocument();
  });

  it('calculates processing efficiency correctly', () => {
    const customAgentActivity = {
      ...mockAgentActivity,
      totalJobsFound: 200,
      totalJobsProcessed: 180
    };

    render(<StatsOverview jobStats={mockJobStats} agentActivity={customAgentActivity} />);

    expect(screen.getByText('90.0% efficiency')).toBeInTheDocument();
  });

  it('handles zero jobs found for processing efficiency', () => {
    const customAgentActivity = {
      ...mockAgentActivity,
      totalJobsFound: 0,
      totalJobsProcessed: 0
    };

    render(<StatsOverview jobStats={mockJobStats} agentActivity={customAgentActivity} />);

    expect(screen.getByText('0% efficiency')).toBeInTheDocument();
  });

  it('formats large numbers with locale string', () => {
    const customJobStats = {
      ...mockJobStats,
      totalJobs: 1500
    };

    const customAgentActivity = {
      ...mockAgentActivity,
      totalJobsProcessed: 2500
    };

    render(<StatsOverview jobStats={customJobStats} agentActivity={customAgentActivity} />);

    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('2,500')).toBeInTheDocument();
  });

  it('renders correct icons for each stat card', () => {
    render(<StatsOverview jobStats={mockJobStats} agentActivity={mockAgentActivity} />);

    // Check that SVG icons are present
    const svgElements = document.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('applies correct color classes to stat cards', () => {
    render(<StatsOverview jobStats={mockJobStats} agentActivity={mockAgentActivity} />);

    // Check that cards have the expected structure and classes
    const cards = document.querySelectorAll('.bg-white.rounded-lg.border');
    expect(cards).toHaveLength(8); // 8 stat cards total

    // Check that icon containers have color classes
    const iconContainers = document.querySelectorAll('[class*="bg-"][class*="text-"][class*="border-"]');
    expect(iconContainers.length).toBeGreaterThan(0);
  });

  it('handles decimal values correctly', () => {
    const customJobStats = {
      ...mockJobStats,
      averageRelevanceScore: 78.567
    };

    render(<StatsOverview jobStats={customJobStats} agentActivity={mockAgentActivity} />);

    expect(screen.getByText('78.567%')).toBeInTheDocument();
  });

  it('renders with motion animations', () => {
    render(<StatsOverview jobStats={mockJobStats} agentActivity={mockAgentActivity} />);

    // Check that motion.div elements are rendered (they should have the motion classes)
    const motionElements = document.querySelectorAll('[style*="opacity"]');
    expect(motionElements.length).toBeGreaterThan(0);
  });

  it('displays correct subtitles for each stat', () => {
    render(<StatsOverview jobStats={mockJobStats} agentActivity={mockAgentActivity} />);

    expect(screen.getByText('25 new jobs')).toBeInTheDocument();
    expect(screen.getByText('20.0% application rate')).toBeInTheDocument();
    expect(screen.getByText('Job matching score')).toBeInTheDocument();
    expect(screen.getByText('18/20 runs')).toBeInTheDocument();
    expect(screen.getByText('96.7% efficiency')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.getByText('Not relevant')).toBeInTheDocument();
    expect(screen.getByText('Agent errors')).toBeInTheDocument();
  });
});
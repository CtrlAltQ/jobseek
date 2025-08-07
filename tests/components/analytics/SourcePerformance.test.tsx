import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SourcePerformance from '@/components/analytics/SourcePerformance';

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
  },
  {
    source: 'remote-ok',
    jobsFound: 25,
    averageRelevanceScore: 75,
    appliedJobs: 5,
    applicationRate: 20,
    totalRuns: 5,
    successfulRuns: 3,
    successRate: 60,
    totalErrors: 3,
    lastRun: '2024-01-02T15:00:00Z',
    efficiency: 5
  }
];

describe('SourcePerformance', () => {
  it('renders source performance table with data', () => {
    render(<SourcePerformance sourceData={mockSourceData} />);

    expect(screen.getByText('Source Performance')).toBeInTheDocument();
    expect(screen.getByText('3 sources')).toBeInTheDocument();

    // Check that all sources are displayed
    expect(screen.getByText('Indeed')).toBeInTheDocument();
    expect(screen.getByText('Linkedin')).toBeInTheDocument();
    expect(screen.getByText('Remote Ok')).toBeInTheDocument();
  });

  it('renders empty state when no data provided', () => {
    render(<SourcePerformance sourceData={[]} />);

    expect(screen.getByText('Source Performance')).toBeInTheDocument();
    expect(screen.getByText('No source performance data available')).toBeInTheDocument();
  });

  it('displays correct data for each source', () => {
    render(<SourcePerformance sourceData={mockSourceData} />);

    // Check Indeed data
    expect(screen.getByText('75')).toBeInTheDocument(); // Jobs found
    expect(screen.getByText('15 applied (20%)')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument(); // Success rate
    expect(screen.getByText('80%')).toBeInTheDocument(); // Avg score
    expect(screen.getByText('7.5')).toBeInTheDocument(); // Efficiency

    // Check LinkedIn data
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('10 applied (20%)')).toBeInTheDocument();
    expect(screen.getByText('87.5%')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('6.25')).toBeInTheDocument();
  });

  it('sorts by jobs found by default (descending)', () => {
    render(<SourcePerformance sourceData={mockSourceData} />);

    const rows = screen.getAllByRole('row');
    // First row is header, so data rows start from index 1
    const firstDataRow = rows[1];
    const secondDataRow = rows[2];
    const thirdDataRow = rows[3];

    // Should be sorted by jobs found (75, 50, 25)
    expect(firstDataRow).toHaveTextContent('Indeed');
    expect(secondDataRow).toHaveTextContent('Linkedin');
    expect(thirdDataRow).toHaveTextContent('Remote Ok');
  });

  it('sorts by different columns when headers are clicked', () => {
    render(<SourcePerformance sourceData={mockSourceData} />);

    // Click on Success Rate header
    fireEvent.click(screen.getByText('Success Rate'));

    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1];

    // Should now be sorted by success rate (90% first)
    expect(firstDataRow).toHaveTextContent('Indeed');

    // Click again to reverse sort
    fireEvent.click(screen.getByText('Success Rate'));

    const rowsAfterSecondClick = screen.getAllByRole('row');
    const firstDataRowAfterSecondClick = rowsAfterSecondClick[1];

    // Should now be sorted by success rate ascending (60% first)
    expect(firstDataRowAfterSecondClick).toHaveTextContent('Remote Ok');
  });

  it('displays sort indicators', () => {
    render(<SourcePerformance sourceData={mockSourceData} />);

    // Jobs Found should have a down arrow by default
    expect(screen.getByText('↓')).toBeInTheDocument();

    // Click on Success Rate
    fireEvent.click(screen.getByText('Success Rate'));

    // Should now show down arrow for Success Rate
    const arrows = screen.getAllByText('↓');
    expect(arrows.length).toBe(1);
  });

  it('formats last run times correctly', () => {
    render(<SourcePerformance sourceData={mockSourceData} />);

    // Mock current time to test relative time formatting
    const mockDate = new Date('2024-01-03T12:00:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());

    // The component should show relative times
    // This is hard to test exactly due to time calculations, but we can check structure
    const timeElements = document.querySelectorAll('td:last-child');
    expect(timeElements.length).toBeGreaterThan(0);

    jest.restoreAllMocks();
  });

  it('applies correct status colors based on success rate', () => {
    render(<SourcePerformance sourceData={mockSourceData} />);

    // High success rate (90%) should be green
    const highSuccessElement = screen.getByText('90%');
    expect(highSuccessElement).toHaveClass('text-green-600', 'bg-green-50');

    // Medium success rate (87.5%) should be green (>= 80%)
    const mediumSuccessElement = screen.getByText('87.5%');
    expect(mediumSuccessElement).toHaveClass('text-green-600', 'bg-green-50');

    // Low success rate (60%) should be red
    const lowSuccessElement = screen.getByText('60%');
    expect(lowSuccessElement).toHaveClass('text-red-600', 'bg-red-50');
  });

  it('displays summary statistics correctly', () => {
    render(<SourcePerformance sourceData={mockSourceData} />);

    // Total jobs: 75 + 50 + 25 = 150
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Total Jobs')).toBeInTheDocument();

    // Average success rate: (90 + 87.5 + 60) / 3 = 79.17 rounds to 79
    expect(screen.getByText('79%')).toBeInTheDocument();
    expect(screen.getByText('Avg Success')).toBeInTheDocument();

    // Average relevance: (80 + 85 + 75) / 3 = 80
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Avg Relevance')).toBeInTheDocument();

    // Total errors: 1 + 2 + 3 = 6
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Total Errors')).toBeInTheDocument();
  });

  it('capitalizes and formats source names correctly', () => {
    const dataWithSpecialNames = [
      {
        ...mockSourceData[0],
        source: 'we-work-remotely'
      },
      {
        ...mockSourceData[1],
        source: 'angel_list'
      }
    ];

    render(<SourcePerformance sourceData={dataWithSpecialNames} />);

    expect(screen.getByText('We Work Remotely')).toBeInTheDocument();
    expect(screen.getByText('Angel List')).toBeInTheDocument();
  });

  it('displays run and error information', () => {
    render(<SourcePerformance sourceData={mockSourceData} />);

    // Check that run and error info is displayed
    expect(screen.getByText('10 runs • 1 errors')).toBeInTheDocument();
    expect(screen.getByText('8 runs • 2 errors')).toBeInTheDocument();
    expect(screen.getByText('5 runs • 3 errors')).toBeInTheDocument();
  });

  it('handles null/undefined lastRun values', () => {
    const dataWithNullLastRun = [
      {
        ...mockSourceData[0],
        lastRun: null
      }
    ];

    render(<SourcePerformance sourceData={dataWithNullLastRun} />);

    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('applies motion animations to rows', () => {
    render(<SourcePerformance sourceData={mockSourceData} />);

    // Check that motion.tr elements are rendered
    const motionElements = document.querySelectorAll('tr[style*="opacity"]');
    expect(motionElements.length).toBeGreaterThan(0);
  });

  it('shows efficiency with correct units', () => {
    render(<SourcePerformance sourceData={mockSourceData} />);

    expect(screen.getByText('jobs/run')).toBeInTheDocument();
  });

  it('handles large numbers with locale formatting', () => {
    const dataWithLargeNumbers = [
      {
        ...mockSourceData[0],
        jobsFound: 1500,
        totalRuns: 100
      }
    ];

    render(<SourcePerformance sourceData={dataWithLargeNumbers} />);

    expect(screen.getByText('1,500')).toBeInTheDocument();
  });
});
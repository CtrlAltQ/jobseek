import { render, screen, fireEvent } from '@testing-library/react';
import JobCard from '@/components/dashboard/JobCard';
import { JobPosting } from '@/lib/types';

const mockJob: JobPosting = {
  _id: '1',
  title: 'Senior Software Engineer',
  company: 'Tech Corp',
  location: 'San Francisco, CA',
  salary: {
    min: 120000,
    max: 180000,
    currency: 'USD',
  },
  description: 'We are looking for a senior software engineer...',
  requirements: ['5+ years experience', 'React expertise'],
  benefits: ['Health insurance', '401k'],
  jobType: 'full-time',
  remote: true,
  source: 'Indeed',
  sourceUrl: 'https://indeed.com/job/123',
  postedDate: new Date('2024-01-15'),
  discoveredDate: new Date('2024-01-16'),
  relevanceScore: 85,
  status: 'new',
  aiSummary: 'Great opportunity for senior developer',
  createdAt: new Date('2024-01-16'),
  updatedAt: new Date('2024-01-16'),
};

const mockProps = {
  job: mockJob,
  onStatusChange: jest.fn(),
  onViewDetails: jest.fn(),
};

describe('JobCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders job information correctly', () => {
    render(<JobCard {...mockProps} />);
    
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('$120,000 - $180,000')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('displays status badge with correct styling', () => {
    render(<JobCard {...mockProps} />);
    
    const statusBadge = screen.getByText('New');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('shows AI summary when available', () => {
    render(<JobCard {...mockProps} />);
    
    expect(screen.getByText('Great opportunity for senior developer')).toBeInTheDocument();
  });

  it('handles view details click', () => {
    render(<JobCard {...mockProps} />);
    
    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);
    
    expect(mockProps.onViewDetails).toHaveBeenCalledWith(mockJob);
  });

  it('handles mark applied click', () => {
    render(<JobCard {...mockProps} />);
    
    const markAppliedButton = screen.getByText('Mark Applied');
    fireEvent.click(markAppliedButton);
    
    expect(mockProps.onStatusChange).toHaveBeenCalledWith('1', 'applied');
  });

  it('handles dismiss click', () => {
    render(<JobCard {...mockProps} />);
    
    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);
    
    expect(mockProps.onStatusChange).toHaveBeenCalledWith('1', 'dismissed');
  });

  it('does not show mark applied button when job is already applied', () => {
    const appliedJob = { ...mockJob, status: 'applied' as const };
    render(<JobCard {...mockProps} job={appliedJob} />);
    
    expect(screen.queryByText('Mark Applied')).not.toBeInTheDocument();
  });

  it('does not show dismiss button when job is already dismissed', () => {
    const dismissedJob = { ...mockJob, status: 'dismissed' as const };
    render(<JobCard {...mockProps} job={dismissedJob} />);
    
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
  });

  it('formats salary correctly when only min is provided', () => {
    const jobWithMinSalary = {
      ...mockJob,
      salary: { min: 100000, currency: 'USD' },
    };
    render(<JobCard {...mockProps} job={jobWithMinSalary} />);
    
    expect(screen.getByText('$100,000+')).toBeInTheDocument();
  });

  it('formats salary correctly when only max is provided', () => {
    const jobWithMaxSalary = {
      ...mockJob,
      salary: { max: 150000, currency: 'USD' },
    };
    render(<JobCard {...mockProps} job={jobWithMaxSalary} />);
    
    expect(screen.getByText('Up to $150,000')).toBeInTheDocument();
  });

  it('shows salary not specified when no salary info', () => {
    const jobWithoutSalary = { ...mockJob, salary: undefined };
    render(<JobCard {...mockProps} job={jobWithoutSalary} />);
    
    expect(screen.getByText('Salary not specified')).toBeInTheDocument();
  });

  it('applies correct relevance score color', () => {
    // High relevance (green)
    const highRelevanceJob = { ...mockJob, relevanceScore: 90 };
    const { rerender } = render(<JobCard {...mockProps} job={highRelevanceJob} />);
    expect(screen.getByText('90%')).toHaveClass('text-green-600');

    // Medium relevance (yellow)
    const mediumRelevanceJob = { ...mockJob, relevanceScore: 70 };
    rerender(<JobCard {...mockProps} job={mediumRelevanceJob} />);
    expect(screen.getByText('70%')).toHaveClass('text-yellow-600');

    // Low relevance (red)
    const lowRelevanceJob = { ...mockJob, relevanceScore: 40 };
    rerender(<JobCard {...mockProps} job={lowRelevanceJob} />);
    expect(screen.getByText('40%')).toHaveClass('text-red-600');
  });

  it('opens external link in new tab', () => {
    render(<JobCard {...mockProps} />);
    
    const externalLink = screen.getByText('View Original');
    expect(externalLink.closest('a')).toHaveAttribute('href', 'https://indeed.com/job/123');
    expect(externalLink.closest('a')).toHaveAttribute('target', '_blank');
    expect(externalLink.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
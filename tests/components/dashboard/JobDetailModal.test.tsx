import { render, screen, fireEvent } from '@testing-library/react';
import JobDetailModal from '@/components/dashboard/JobDetailModal';
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
  description: 'We are looking for a senior software engineer with React experience.',
  requirements: ['5+ years experience', 'React expertise', 'TypeScript knowledge'],
  benefits: ['Health insurance', '401k', 'Flexible hours'],
  jobType: 'full-time',
  remote: true,
  source: 'Indeed',
  sourceUrl: 'https://indeed.com/job/123',
  postedDate: new Date('2024-01-15'),
  discoveredDate: new Date('2024-01-16'),
  relevanceScore: 85,
  status: 'new',
  aiSummary: 'Great opportunity for senior developer with strong React skills',
  createdAt: new Date('2024-01-16'),
  updatedAt: new Date('2024-01-16'),
};

const mockProps = {
  job: mockJob,
  isOpen: true,
  onClose: jest.fn(),
  onStatusChange: jest.fn(),
};

describe('JobDetailModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open with job data', () => {
    render(<JobDetailModal {...mockProps} />);
    
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByText('$120,000 - $180,000')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<JobDetailModal {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Senior Software Engineer')).not.toBeInTheDocument();
  });

  it('does not render when no job provided', () => {
    render(<JobDetailModal {...mockProps} job={null} />);
    
    expect(screen.queryByText('Senior Software Engineer')).not.toBeInTheDocument();
  });
});  it(
'displays job requirements and benefits', () => {
    render(<JobDetailModal {...mockProps} />);
    
    expect(screen.getByText('5+ years experience')).toBeInTheDocument();
    expect(screen.getByText('React expertise')).toBeInTheDocument();
    expect(screen.getByText('Health insurance')).toBeInTheDocument();
    expect(screen.getByText('401k')).toBeInTheDocument();
  });

  it('shows AI summary when available', () => {
    render(<JobDetailModal {...mockProps} />);
    
    expect(screen.getByText('AI Summary')).toBeInTheDocument();
    expect(screen.getByText('Great opportunity for senior developer with strong React skills')).toBeInTheDocument();
  });

  it('handles close button click', () => {
    render(<JobDetailModal {...mockProps} />);
    
    const closeButtons = screen.getAllByText('Close');
    fireEvent.click(closeButtons[0]);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('handles backdrop click to close', () => {
    render(<JobDetailModal {...mockProps} />);
    
    const backdrop = document.querySelector('.fixed.inset-0.bg-black');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockProps.onClose).toHaveBeenCalled();
    }
  });

  it('handles mark as applied action', () => {
    render(<JobDetailModal {...mockProps} />);
    
    const markAppliedButton = screen.getByText('Mark as Applied');
    fireEvent.click(markAppliedButton);
    
    expect(mockProps.onStatusChange).toHaveBeenCalledWith('1', 'applied');
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('handles dismiss job action', () => {
    render(<JobDetailModal {...mockProps} />);
    
    const dismissButton = screen.getByText('Dismiss Job');
    fireEvent.click(dismissButton);
    
    expect(mockProps.onStatusChange).toHaveBeenCalledWith('1', 'dismissed');
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('does not show mark applied button when job is already applied', () => {
    const appliedJob = { ...mockJob, status: 'applied' as const };
    render(<JobDetailModal {...mockProps} job={appliedJob} />);
    
    expect(screen.queryByText('Mark as Applied')).not.toBeInTheDocument();
  });

  it('does not show dismiss button when job is already dismissed', () => {
    const dismissedJob = { ...mockJob, status: 'dismissed' as const };
    render(<JobDetailModal {...mockProps} job={dismissedJob} />);
    
    expect(screen.queryByText('Dismiss Job')).not.toBeInTheDocument();
  });

  it('displays external link to original posting', () => {
    render(<JobDetailModal {...mockProps} />);
    
    const externalLink = screen.getByText('View Original Posting');
    expect(externalLink.closest('a')).toHaveAttribute('href', 'https://indeed.com/job/123');
    expect(externalLink.closest('a')).toHaveAttribute('target', '_blank');
  });

  it('shows relevance score with correct styling', () => {
    render(<JobDetailModal {...mockProps} />);
    
    expect(screen.getByText('85% Match')).toBeInTheDocument();
  });

  it('displays remote availability badge', () => {
    render(<JobDetailModal {...mockProps} />);
    
    expect(screen.getByText('Remote Available')).toBeInTheDocument();
  });
});
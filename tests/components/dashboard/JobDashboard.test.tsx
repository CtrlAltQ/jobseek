import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JobDashboard from '@/components/dashboard/JobDashboard';
import { JobPosting } from '@/lib/types';

// Mock fetch
global.fetch = jest.fn();

const mockJobs: JobPosting[] = [
  {
    _id: '1',
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    salary: { min: 120000, max: 180000, currency: 'USD' },
    description: 'Great opportunity',
    requirements: ['React', 'TypeScript'],
    benefits: ['Health insurance'],
    jobType: 'full-time',
    remote: true,
    source: 'Indeed',
    sourceUrl: 'https://indeed.com/job/1',
    postedDate: new Date('2024-01-15'),
    discoveredDate: new Date('2024-01-16'),
    relevanceScore: 85,
    status: 'new',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    _id: '2',
    title: 'Frontend Developer',
    company: 'StartupXYZ',
    location: 'New York, NY',
    salary: { min: 90000, max: 130000, currency: 'USD' },
    description: 'Join our team',
    requirements: ['React', 'CSS'],
    benefits: ['401k'],
    jobType: 'full-time',
    remote: false,
    source: 'LinkedIn',
    sourceUrl: 'https://linkedin.com/job/2',
    postedDate: new Date('2024-01-14'),
    discoveredDate: new Date('2024-01-15'),
    relevanceScore: 75,
    status: 'viewed',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
];

describe('JobDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockJobs }),
    });
  });

  it('renders dashboard with job count', () => {
    render(<JobDashboard initialJobs={mockJobs} />);
    
    expect(screen.getByText('Job Dashboard')).toBeInTheDocument();
    expect(screen.getByText('2 jobs found')).toBeInTheDocument();
  });

  it('displays job cards', () => {
    render(<JobDashboard initialJobs={mockJobs} />);
    
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
  });
}); 
 it('handles sorting changes', () => {
    render(<JobDashboard initialJobs={mockJobs} />);
    
    const sortSelect = screen.getByDisplayValue('Sort by Relevance');
    fireEvent.change(sortSelect, { target: { value: 'date' } });
    
    // Jobs should be reordered by date
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    render(<JobDashboard initialJobs={[]} />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/jobs');
    });
  });

  it('shows loading state', async () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<JobDashboard initialJobs={[]} />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(screen.getByText('Loading jobs...')).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'Network error' }),
    });
    
    render(<JobDashboard initialJobs={[]} />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows no jobs message when no results', () => {
    render(<JobDashboard initialJobs={[]} />);
    
    expect(screen.getByText('No jobs found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters or search terms')).toBeInTheDocument();
  });

  it('handles pagination', () => {
    // Create enough jobs to trigger pagination
    const manyJobs = Array.from({ length: 25 }, (_, i) => ({
      ...mockJobs[0],
      _id: `job-${i}`,
      title: `Job ${i}`,
    }));
    
    render(<JobDashboard initialJobs={manyJobs} />);
    
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('opens job detail modal when view details is clicked', async () => {
    render(<JobDashboard initialJobs={mockJobs} />);
    
    const viewDetailsButtons = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });
  });

  it('updates job status when status change is triggered', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
    
    render(<JobDashboard initialJobs={mockJobs} />);
    
    const markAppliedButtons = screen.getAllByText('Mark Applied');
    fireEvent.click(markAppliedButtons[0]);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/jobs/1/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'applied' }),
      });
    });
  });
});
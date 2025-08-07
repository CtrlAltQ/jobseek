import { render, screen, fireEvent } from '@testing-library/react';
import JobFilters from '@/components/dashboard/JobFilters';
import { FilterOptions } from '@/lib/types';

const mockProps = {
  filters: {} as FilterOptions,
  onFiltersChange: jest.fn(),
  availableLocations: ['San Francisco, CA', 'New York, NY', 'Remote'],
  availableCompanies: ['Tech Corp', 'StartupXYZ', 'BigCorp'],
  availableSources: ['Indeed', 'LinkedIn', 'AngelList'],
};

describe('JobFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    render(<JobFilters {...mockProps} />);
    
    expect(screen.getByPlaceholderText(/search jobs/i)).toBeInTheDocument();
  });

  it('shows advanced filters when toggle is clicked', () => {
    render(<JobFilters {...mockProps} />);
    
    const toggleButton = screen.getByText('Advanced Filters');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Posted Date')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
  });

  it('handles date range filter changes', () => {
    render(<JobFilters {...mockProps} />);
    
    // Open advanced filters
    fireEvent.click(screen.getByText('Advanced Filters'));
    
    const dateSelect = screen.getByDisplayValue('Any time');
    fireEvent.change(dateSelect, { target: { value: '7' } });
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dateRange: expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
      })
    );
  });
}); 
 it('handles location filter changes', () => {
    render(<JobFilters {...mockProps} />);
    
    // Open advanced filters
    fireEvent.click(screen.getByText('Advanced Filters'));
    
    const locationSelect = screen.getByDisplayValue('');
    fireEvent.change(locationSelect, { target: { value: ['San Francisco, CA'] } });
    
    expect(mockProps.onFiltersChange).toHaveBeenCalled();
  });

  it('handles salary range filter changes', () => {
    render(<JobFilters {...mockProps} />);
    
    // Open advanced filters
    fireEvent.click(screen.getByText('Advanced Filters'));
    
    const minSalaryInput = screen.getByPlaceholderText('Min salary');
    fireEvent.change(minSalaryInput, { target: { value: '100000' } });
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        salaryRange: expect.objectContaining({
          min: 100000,
        }),
      })
    );
  });

  it('handles status filter changes', () => {
    render(<JobFilters {...mockProps} />);
    
    // Open advanced filters
    fireEvent.click(screen.getByText('Advanced Filters'));
    
    const newStatusCheckbox = screen.getByLabelText('new');
    fireEvent.click(newStatusCheckbox);
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ['new'],
      })
    );
  });

  it('shows active filter indicator when filters are applied', () => {
    const filtersWithData = {
      ...mockProps,
      filters: { locations: ['San Francisco, CA'] },
    };
    
    render(<JobFilters {...filtersWithData} />);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('clears all filters when clear button is clicked', () => {
    const filtersWithData = {
      ...mockProps,
      filters: { locations: ['San Francisco, CA'] },
    };
    
    render(<JobFilters {...filtersWithData} />);
    
    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({});
  });
});
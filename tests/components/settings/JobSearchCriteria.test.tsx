import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import JobSearchCriteria from '@/components/settings/JobSearchCriteria';
import { UserSettings } from '@/lib/types';

const mockSearchCriteria: UserSettings['searchCriteria'] = {
  jobTitles: ['Software Engineer'],
  keywords: ['React'],
  locations: ['San Francisco'],
  remoteOk: true,
  salaryRange: {
    min: 80000,
    max: 120000
  },
  industries: ['Technology'],
  experienceLevel: 'mid'
};

describe('JobSearchCriteria', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form sections', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    expect(screen.getByText('Job Search Criteria')).toBeInTheDocument();
    expect(screen.getByText('Job Titles')).toBeInTheDocument();
    expect(screen.getByText('Keywords')).toBeInTheDocument();
    expect(screen.getByText('Preferred Locations')).toBeInTheDocument();
    expect(screen.getByText('Include remote opportunities')).toBeInTheDocument();
    expect(screen.getByText('Experience Level')).toBeInTheDocument();
    expect(screen.getByText('Industries')).toBeInTheDocument();
  });

  it('displays existing job titles, keywords, and locations', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('San Francisco')).toBeInTheDocument();
  });

  it('adds new job title when Add button is clicked', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText('e.g., Software Engineer, Product Manager');
    const addButton = screen.getAllByText('Add')[0];

    fireEvent.change(input, { target: { value: 'Product Manager' } });
    fireEvent.click(addButton);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockSearchCriteria,
      jobTitles: ['Software Engineer', 'Product Manager']
    });
  });

  it('adds new job title when Enter key is pressed', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText('e.g., Software Engineer, Product Manager');

    fireEvent.change(input, { target: { value: 'Data Scientist' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockSearchCriteria,
      jobTitles: ['Software Engineer', 'Data Scientist']
    });
  });

  it('removes job title when X button is clicked', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    const removeButton = screen.getByText('Software Engineer').nextElementSibling;
    fireEvent.click(removeButton!);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockSearchCriteria,
      jobTitles: []
    });
  });

  it('prevents adding duplicate job titles', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText('e.g., Software Engineer, Product Manager');
    const addButton = screen.getAllByText('Add')[0];

    fireEvent.change(input, { target: { value: 'Software Engineer' } });
    fireEvent.click(addButton);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('prevents adding empty job titles', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText('e.g., Software Engineer, Product Manager');
    const addButton = screen.getAllByText('Add')[0];

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(addButton);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('updates remote work preference', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    const checkbox = screen.getByLabelText('Include remote opportunities');
    fireEvent.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockSearchCriteria,
      remoteOk: false
    });
  });

  it('updates salary range', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    const minSalarySlider = screen.getByDisplayValue('80000');
    fireEvent.change(minSalarySlider, { target: { value: '90000' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockSearchCriteria,
      salaryRange: {
        min: 90000,
        max: 120000
      }
    });
  });

  it('displays formatted salary range', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    expect(screen.getByText('Salary Range: $80,000 - $120,000')).toBeInTheDocument();
  });

  it('updates experience level', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    const select = screen.getByDisplayValue('Mid Level (3-5 years)');
    fireEvent.change(select, { target: { value: 'senior' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockSearchCriteria,
      experienceLevel: 'senior'
    });
  });

  it('toggles industry selection', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    const healthcareCheckbox = screen.getByLabelText('Healthcare');
    fireEvent.click(healthcareCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockSearchCriteria,
      industries: ['Technology', 'Healthcare']
    });
  });

  it('removes selected industry when toggled off', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    const technologyCheckbox = screen.getByLabelText('Technology');
    fireEvent.click(technologyCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockSearchCriteria,
      industries: []
    });
  });

  it('handles keywords addition and removal', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    // Add keyword
    const keywordInput = screen.getByPlaceholderText('e.g., React, Python, Machine Learning');
    const addButton = screen.getAllByText('Add')[1];

    fireEvent.change(keywordInput, { target: { value: 'TypeScript' } });
    fireEvent.click(addButton);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockSearchCriteria,
      keywords: ['React', 'TypeScript']
    });
  });

  it('handles locations addition and removal', () => {
    render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);

    // Add location
    const locationInput = screen.getByPlaceholderText('e.g., San Francisco, New York, Remote');
    const addButton = screen.getAllByText('Add')[2];

    fireEvent.change(locationInput, { target: { value: 'New York' } });
    fireEvent.click(addButton);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockSearchCriteria,
      locations: ['San Francisco', 'New York']
    });
  });
});
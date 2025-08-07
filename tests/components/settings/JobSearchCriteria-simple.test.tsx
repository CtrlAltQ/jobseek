import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Try minimal version
import JobSearchCriteria from '../../../src/components/settings/JobSearchCriteria-minimal';

const mockSearchCriteria = {
  jobTitles: ['Software Engineer'],
  keywords: ['React'],
  locations: ['San Francisco'],
  remoteOk: true,
  salaryRange: { min: 80000, max: 120000 },
  industries: ['Technology'],
  experienceLevel: 'mid' as const
};

describe('JobSearchCriteria Simple Test', () => {
  it('should import correctly', () => {
    console.log('JobSearchCriteria type:', typeof JobSearchCriteria);
    console.log('JobSearchCriteria:', JobSearchCriteria);
    expect(typeof JobSearchCriteria).toBe('function');
  });

  it('should render without crashing', () => {
    const mockOnChange = jest.fn();
    expect(() => {
      render(<JobSearchCriteria searchCriteria={mockSearchCriteria} onChange={mockOnChange} />);
    }).not.toThrow();
  });
});
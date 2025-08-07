import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPanel from '@/components/settings/SettingsPanel';
import { UserSettings } from '@/lib/types';

// Mock the schemas module to avoid MongoDB import issues
jest.mock('@/lib/schemas', () => ({
  validateUserSettings: jest.fn(() => []),
}));

// Mock fetch
global.fetch = jest.fn();

const mockSettings: UserSettings = {
  searchCriteria: {
    jobTitles: ['Software Engineer', 'Frontend Developer'],
    keywords: ['React', 'TypeScript'],
    locations: ['San Francisco', 'Remote'],
    remoteOk: true,
    salaryRange: {
      min: 80000,
      max: 120000
    },
    industries: ['Technology', 'Healthcare'],
    experienceLevel: 'mid'
  },
  contactInfo: {
    email: 'test@example.com',
    phone: '+1234567890',
    linkedin: 'https://linkedin.com/in/test',
    portfolio: 'https://portfolio.com'
  },
  agentSchedule: {
    frequency: 'daily',
    enabled: true
  },
  updatedAt: new Date()
};

describe('SettingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<SettingsPanel />);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure your job search criteria and agent preferences')).toBeInTheDocument();
    
    // Check for loading skeleton
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('loads and displays existing settings', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: mockSettings
      })
    });

    render(<SettingsPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    expect(screen.getByText('Job Search Criteria')).toBeInTheDocument();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Agent Schedule')).toBeInTheDocument();
  });

  it('handles loading settings failure gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<SettingsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load settings/)).toBeInTheDocument();
    });
  });

  it('saves settings successfully', async () => {
    // Mock initial load
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: mockSettings
      })
    });

    // Mock save
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: mockSettings,
        message: 'Settings saved successfully!'
      })
    });

    render(<SettingsPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.any(String)
    });
  });

  it('handles save settings failure', async () => {
    // Mock initial load
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: mockSettings
      })
    });

    // Mock save failure
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: false,
        error: 'Failed to save settings'
      })
    });

    render(<SettingsPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save settings')).toBeInTheDocument();
    });
  });

  it('shows validation errors', async () => {
    const invalidSettings = {
      ...mockSettings,
      contactInfo: {
        ...mockSettings.contactInfo,
        email: 'invalid-email'
      }
    };

    // Mock initial load
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: invalidSettings
      })
    });

    render(<SettingsPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('invalid-email')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument();
      expect(screen.getByText('Valid email is required')).toBeInTheDocument();
    });
  });

  it('calls onSettingsChange callback when settings are updated', async () => {
    const onSettingsChange = jest.fn();

    // Mock initial load
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: mockSettings
      })
    });

    // Mock save
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: mockSettings,
        message: 'Settings saved successfully!'
      })
    });

    render(<SettingsPanel onSettingsChange={onSettingsChange} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSettingsChange).toHaveBeenCalledWith(mockSettings);
    });
  });

  it('shows saving state during save operation', async () => {
    // Mock initial load
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: mockSettings
      })
    });

    // Mock slow save
    (fetch as jest.Mock).mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({
        json: async () => ({
          success: true,
          data: mockSettings
        })
      }), 100);
    }));

    render(<SettingsPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });

  it('applies custom className', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    const { container } = render(<SettingsPanel className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
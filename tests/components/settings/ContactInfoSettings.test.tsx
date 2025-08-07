import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContactInfoSettings from '@/components/settings/ContactInfoSettings';
import { UserSettings } from '@/lib/types';

const mockContactInfo: UserSettings['contactInfo'] = {
  email: 'test@example.com',
  phone: '+1234567890',
  linkedin: 'https://linkedin.com/in/test',
  portfolio: 'https://portfolio.com'
};

describe('ContactInfoSettings', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all contact info fields', () => {
    render(<ContactInfoSettings contactInfo={mockContactInfo} onChange={mockOnChange} />);

    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Email Address *')).toBeInTheDocument();
    expect(screen.getByText('Phone Number')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn Profile')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Website')).toBeInTheDocument();
  });

  it('displays existing contact information', () => {
    render(<ContactInfoSettings contactInfo={mockContactInfo} onChange={mockOnChange} />);

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://linkedin.com/in/test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://portfolio.com')).toBeInTheDocument();
  });

  it('updates email when changed', () => {
    render(<ContactInfoSettings contactInfo={mockContactInfo} onChange={mockOnChange} />);

    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockContactInfo,
      email: 'newemail@example.com'
    });
  });

  it('updates phone when changed', () => {
    render(<ContactInfoSettings contactInfo={mockContactInfo} onChange={mockOnChange} />);

    const phoneInput = screen.getByDisplayValue('+1234567890');
    fireEvent.change(phoneInput, { target: { value: '+0987654321' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockContactInfo,
      phone: '+0987654321'
    });
  });

  it('updates LinkedIn when changed', () => {
    render(<ContactInfoSettings contactInfo={mockContactInfo} onChange={mockOnChange} />);

    const linkedinInput = screen.getByDisplayValue('https://linkedin.com/in/test');
    fireEvent.change(linkedinInput, { target: { value: 'https://linkedin.com/in/newprofile' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockContactInfo,
      linkedin: 'https://linkedin.com/in/newprofile'
    });
  });

  it('updates portfolio when changed', () => {
    render(<ContactInfoSettings contactInfo={mockContactInfo} onChange={mockOnChange} />);

    const portfolioInput = screen.getByDisplayValue('https://portfolio.com');
    fireEvent.change(portfolioInput, { target: { value: 'https://newportfolio.com' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockContactInfo,
      portfolio: 'https://newportfolio.com'
    });
  });

  it('handles empty optional fields', () => {
    const emptyContactInfo: UserSettings['contactInfo'] = {
      email: 'test@example.com',
      phone: '',
      linkedin: '',
      portfolio: ''
    };

    render(<ContactInfoSettings contactInfo={emptyContactInfo} onChange={mockOnChange} />);

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    
    // Check that empty fields are handled properly
    const phoneInput = screen.getByPlaceholderText('+1 (555) 123-4567');
    const linkedinInput = screen.getByPlaceholderText('https://linkedin.com/in/yourprofile');
    const portfolioInput = screen.getByPlaceholderText('https://yourportfolio.com');

    expect(phoneInput).toHaveValue('');
    expect(linkedinInput).toHaveValue('');
    expect(portfolioInput).toHaveValue('');
  });

  it('handles undefined optional fields', () => {
    const contactInfoWithUndefined: UserSettings['contactInfo'] = {
      email: 'test@example.com'
    };

    render(<ContactInfoSettings contactInfo={contactInfoWithUndefined} onChange={mockOnChange} />);

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    
    // Check that undefined fields are handled properly
    const phoneInput = screen.getByPlaceholderText('+1 (555) 123-4567');
    const linkedinInput = screen.getByPlaceholderText('https://linkedin.com/in/yourprofile');
    const portfolioInput = screen.getByPlaceholderText('https://yourportfolio.com');

    expect(phoneInput).toHaveValue('');
    expect(linkedinInput).toHaveValue('');
    expect(portfolioInput).toHaveValue('');
  });

  it('shows email as required field', () => {
    render(<ContactInfoSettings contactInfo={mockContactInfo} onChange={mockOnChange} />);

    const emailInput = screen.getByDisplayValue('test@example.com');
    expect(emailInput).toBeRequired();
  });

  it('shows helpful text for email field', () => {
    render(<ContactInfoSettings contactInfo={mockContactInfo} onChange={mockOnChange} />);

    expect(screen.getByText('This email will be used for job notifications and contact forms')).toBeInTheDocument();
  });

  it('has correct input types for each field', () => {
    render(<ContactInfoSettings contactInfo={mockContactInfo} onChange={mockOnChange} />);

    const emailInput = screen.getByDisplayValue('test@example.com');
    const phoneInput = screen.getByDisplayValue('+1234567890');
    const linkedinInput = screen.getByDisplayValue('https://linkedin.com/in/test');
    const portfolioInput = screen.getByDisplayValue('https://portfolio.com');

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(phoneInput).toHaveAttribute('type', 'tel');
    expect(linkedinInput).toHaveAttribute('type', 'url');
    expect(portfolioInput).toHaveAttribute('type', 'url');
  });
});
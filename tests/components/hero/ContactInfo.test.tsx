import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContactInfo from '@/components/hero/ContactInfo';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  },
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  EnvelopeIcon: ({ className }: { className: string }) => (
    <div className={className} data-testid="envelope-icon">📧</div>
  ),
  PhoneIcon: ({ className }: { className: string }) => (
    <div className={className} data-testid="phone-icon">📞</div>
  ),
  MapPinIcon: ({ className }: { className: string }) => (
    <div className={className} data-testid="map-pin-icon">📍</div>
  ),
}));

describe('ContactInfo', () => {
  beforeEach(() => {
    render(<ContactInfo />);
  });

  it('renders all contact methods', () => {
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
  });

  it('displays contact values with placeholders', () => {
    expect(screen.getByText('[email]@example.com')).toBeInTheDocument();
    expect(screen.getByText('[phone_number]')).toBeInTheDocument();
    expect(screen.getByText('[City, State]')).toBeInTheDocument();
  });

  it('renders contact method icons', () => {
    expect(screen.getByTestId('envelope-icon')).toBeInTheDocument();
    expect(screen.getByTestId('phone-icon')).toBeInTheDocument();
    expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument();
  });

  it('creates clickable links for email and phone', () => {
    const emailLink = screen.getByRole('link', { name: /Email.*\[email\]@example\.com/s });
    const phoneLink = screen.getByRole('link', { name: /Phone.*\[phone_number\]/s });
    
    expect(emailLink).toHaveAttribute('href', 'mailto:[email]@example.com');
    expect(phoneLink).toHaveAttribute('href', 'tel:[phone_number]');
  });

  it('does not create a link for location', () => {
    const locationText = screen.getByText('[City, State]');
    expect(locationText.closest('a')).toBeNull();
  });

  it('renders social media links', () => {
    const linkedinLink = screen.getByRole('link', { name: 'LinkedIn' });
    const githubLink = screen.getByRole('link', { name: 'GitHub' });
    const portfolioLink = screen.getByRole('link', { name: 'Portfolio' });

    expect(linkedinLink).toHaveAttribute('href', 'https://linkedin.com/in/[profile]');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/[username]');
    expect(portfolioLink).toHaveAttribute('href', 'https://[portfolio-url].com');
  });

  it('opens social links in new tab', () => {
    const socialLinks = screen.getAllByRole('link').filter(link => 
      link.getAttribute('target') === '_blank'
    );
    
    expect(socialLinks).toHaveLength(3); // LinkedIn, GitHub, Portfolio
    socialLinks.forEach(link => {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('displays "Connect with me" section', () => {
    expect(screen.getByText('Connect with me')).toBeInTheDocument();
  });

  it('applies primary styling to email contact', () => {
    const emailIcon = screen.getByTestId('envelope-icon');
    const emailContainer = emailIcon.closest('.p-2');
    expect(emailContainer).toHaveClass('bg-blue-100', 'text-blue-600');
  });

  it('has proper responsive and accessibility attributes', () => {
    const socialLinks = screen.getAllByRole('link').filter(link => 
      link.getAttribute('target') === '_blank'
    );
    
    socialLinks.forEach(link => {
      expect(link).toHaveAttribute('title');
    });
  });
});
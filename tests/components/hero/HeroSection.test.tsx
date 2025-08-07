import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HeroSection from '@/components/hero/HeroSection';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  },
}));

// Mock the child components
jest.mock('@/components/hero/ContactInfo', () => {
  return function MockContactInfo() {
    return <div data-testid="contact-info">Contact Info Component</div>;
  };
});

jest.mock('@/components/hero/SkillsShowcase', () => {
  return function MockSkillsShowcase() {
    return <div data-testid="skills-showcase">Skills Showcase Component</div>;
  };
});

describe('HeroSection', () => {
  beforeEach(() => {
    render(<HeroSection />);
  });

  it('renders the hero section with correct structure', () => {
    const heroSection = document.querySelector('section');
    expect(heroSection).toBeInTheDocument();
    expect(heroSection).toHaveClass('min-h-screen');
  });

  it('displays the main heading with name placeholder', () => {
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Hi, I\'m [Your Name]');
  });

  it('displays the professional title', () => {
    const subtitle = screen.getByRole('heading', { level: 2 });
    expect(subtitle).toBeInTheDocument();
    expect(subtitle).toHaveTextContent('Full Stack Developer & AI Enthusiast');
  });

  it('displays the professional description', () => {
    const description = screen.getByText(/I build intelligent web applications/);
    expect(description).toBeInTheDocument();
    expect(description).toHaveTextContent(/AI-powered job search system/);
  });

  it('includes platform showcase text', () => {
    const platformText = screen.getByText(/This entire platform was custom-built/);
    expect(platformText).toBeInTheDocument();
    expect(platformText).toHaveTextContent(/demonstrate my development skills/);
  });

  it('renders the ContactInfo component', () => {
    const contactInfo = screen.getByTestId('contact-info');
    expect(contactInfo).toBeInTheDocument();
  });

  it('renders the SkillsShowcase component', () => {
    const skillsShowcase = screen.getByTestId('skills-showcase');
    expect(skillsShowcase).toBeInTheDocument();
  });

  it('has responsive grid layout classes', () => {
    const gridContainer = document.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1', 'lg:grid-cols-2');
  });

  it('has proper background gradient classes', () => {
    const heroSection = document.querySelector('section');
    expect(heroSection).toHaveClass('bg-gradient-to-br', 'from-slate-50', 'to-slate-100');
  });
});
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import HeroSection from '@/components/hero/HeroSection';

// Mock framer-motion
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

describe('HeroSection Responsive Design', () => {
  it('has responsive text sizing classes', () => {
    render(<HeroSection />);
    
    const mainHeading = document.querySelector('h1');
    expect(mainHeading).toHaveClass('text-4xl', 'sm:text-5xl', 'lg:text-6xl');
  });

  it('has responsive subtitle sizing', () => {
    render(<HeroSection />);
    
    const subtitle = document.querySelector('h2');
    expect(subtitle).toHaveClass('text-xl', 'sm:text-2xl');
  });

  it('has responsive grid layout', () => {
    render(<HeroSection />);
    
    const gridContainer = document.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1', 'lg:grid-cols-2');
  });

  it('has responsive text alignment', () => {
    render(<HeroSection />);
    
    const textContainer = document.querySelector('.text-center');
    expect(textContainer).toHaveClass('lg:text-left');
  });

  it('has responsive padding and spacing', () => {
    render(<HeroSection />);
    
    const container = document.querySelector('.px-4');
    expect(container).toHaveClass('sm:px-6', 'lg:px-8');
  });

  it('has responsive content justification', () => {
    render(<HeroSection />);
    
    const skillsContainer = document.querySelector('.flex.justify-center.lg\\:justify-end');
    expect(skillsContainer).toHaveClass('lg:justify-end');
  });
});
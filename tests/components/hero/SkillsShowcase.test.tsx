import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SkillsShowcase from '@/components/hero/SkillsShowcase';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('SkillsShowcase', () => {
  beforeEach(() => {
    render(<SkillsShowcase />);
  });

  it('renders the main title and description', () => {
    expect(screen.getByRole('heading', { name: 'Tech Stack' })).toBeInTheDocument();
    expect(screen.getByText('Technologies I use to build amazing things')).toBeInTheDocument();
  });

  it('displays all skill categories', () => {
    expect(screen.getByRole('heading', { name: 'Frontend' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Backend' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI & Tools' })).toBeInTheDocument();
  });

  it('renders frontend skills', () => {
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Next.js')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Tailwind')).toBeInTheDocument();
  });

  it('renders backend skills', () => {
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('MongoDB')).toBeInTheDocument();
    expect(screen.getByText('APIs')).toBeInTheDocument();
  });

  it('renders AI & Tools skills', () => {
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Web Scraping')).toBeInTheDocument();
    expect(screen.getByText('Automation')).toBeInTheDocument();
    expect(screen.getByText('Git')).toBeInTheDocument();
  });

  it('displays skill icons', () => {
    // Check for some specific skill icons
    expect(screen.getByText('⚛️')).toBeInTheDocument(); // React
    expect(screen.getByText('🐍')).toBeInTheDocument(); // Python
    expect(screen.getByText('🤖')).toBeInTheDocument(); // OpenAI
  });

  it('renders the AI Job Finder platform highlight', () => {
    expect(screen.getByRole('heading', { name: 'AI Job Finder' })).toBeInTheDocument();
    expect(screen.getByText(/This platform demonstrates my full-stack development skills/)).toBeInTheDocument();
  });

  it('displays the rocket emoji for platform highlight', () => {
    expect(screen.getByText('🚀')).toBeInTheDocument();
  });

  it('has proper grid layout for skills', () => {
    // Each category should have a grid layout for skills
    const skillContainers = screen.getAllByText(/React|Node\.js|OpenAI/).map(skill => 
      skill.closest('.grid')
    );
    
    skillContainers.forEach(container => {
      if (container) {
        expect(container).toHaveClass('grid-cols-2');
      }
    });
  });

  it('applies correct color schemes to different skill categories', () => {
    const reactSkill = screen.getByText('React').parentElement;
    const pythonSkill = screen.getByText('Python').parentElement;
    const openaiSkill = screen.getByText('OpenAI').parentElement;

    expect(reactSkill).toHaveClass('bg-blue-100', 'text-blue-700');
    expect(pythonSkill).toHaveClass('bg-yellow-100', 'text-yellow-700');
    expect(openaiSkill).toHaveClass('bg-emerald-100', 'text-emerald-700');
  });

  it('has responsive design classes', () => {
    const mainContainer = screen.getByRole('heading', { name: 'Tech Stack' }).closest('.max-w-md');
    expect(mainContainer).toHaveClass('w-full');
  });

  it('includes proper spacing and styling classes', () => {
    const categoryContainers = screen.getAllByRole('heading', { name: /Frontend|Backend|AI & Tools/ })
      .map(heading => heading.closest('.bg-white'));
    
    categoryContainers.forEach(container => {
      if (container) {
        expect(container).toHaveClass('rounded-xl', 'p-6', 'shadow-lg');
      }
    });
  });

  it('has platform highlight with gradient background', () => {
    const platformHighlight = screen.getByRole('heading', { name: 'AI Job Finder' })
      .closest('.bg-gradient-to-r');
    
    expect(platformHighlight).toHaveClass('from-blue-50', 'to-indigo-50');
  });
});
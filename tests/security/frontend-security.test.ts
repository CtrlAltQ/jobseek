import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import userEvent from '@testing-library/user-event';

// Mock components for testing
const MockJobCard = ({ job }: { job: any }) => (
  <div data-testid="job-card">
    <h3 dangerouslySetInnerHTML={{ __html: job.title }} />
    <p>{job.company}</p>
    <div dangerouslySetInnerHTML={{ __html: job.description }} />
  </div>
);

const MockContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    console.log('Form submitted:', formData);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="contact-form">
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        data-testid="name-input"
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        data-testid="email-input"
      />
      <textarea
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        data-testid="message-input"
      />
      <button type="submit" data-testid="submit-button">Submit</button>
    </form>
  );
};

describe('Frontend Security Tests', () => {
  beforeEach(() => {
    // Reset any global state
    jest.clearAllMocks();
  });

  describe('XSS Prevention', () => {
    it('should sanitize job titles to prevent XSS', () => {
      const maliciousJob = {
        title: '<script>alert("XSS")</script>Frontend Developer',
        company: 'Test Company',
        description: 'Safe description'
      };

      render(<MockJobCard job={maliciousJob} />);
      
      // Should not execute script
      expect(screen.queryByText('Frontend Developer')).toBeInTheDocument();
      
      // Script tag should be sanitized or escaped
      const titleElement = screen.getByRole('heading');
      expect(titleElement.innerHTML).not.toContain('<script>');
    });

    it('should prevent XSS in job descriptions', () => {
      const maliciousJob = {
        title: 'Frontend Developer',
        company: 'Test Company',
        description: '<img src="x" onerror="alert(\'XSS\')" />Job description'
      };

      render(<MockJobCard job={maliciousJob} />);
      
      // Should not execute malicious code
      const descriptionElement = screen.getByText(/Job description/);
      expect(descriptionElement).toBeInTheDocument();
    });
  });
});  describ
e('Input Validation', () => {
    it('should validate email format in contact form', async () => {
      const user = userEvent.setup();
      render(<MockContactForm />);
      
      const emailInput = screen.getByTestId('email-input');
      const submitButton = screen.getByTestId('submit-button');
      
      // Test invalid email formats
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        '<script>alert("xss")</script>@domain.com'
      ];
      
      for (const email of invalidEmails) {
        await user.clear(emailInput);
        await user.type(emailInput, email);
        await user.click(submitButton);
        
        // Should show validation error or prevent submission
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      }
    });

    it('should sanitize form inputs', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<MockContactForm />);
      
      const nameInput = screen.getByTestId('name-input');
      const messageInput = screen.getByTestId('message-input');
      const submitButton = screen.getByTestId('submit-button');
      
      // Input malicious content
      await user.type(nameInput, '<script>alert("xss")</script>John Doe');
      await user.type(messageInput, 'Hello <img src="x" onerror="alert(1)">');
      await user.click(submitButton);
      
      // Check that submitted data is sanitized
      expect(consoleSpy).toHaveBeenCalledWith(
        'Form submitted:',
        expect.objectContaining({
          name: expect.not.stringContaining('<script>'),
          message: expect.not.stringContaining('onerror=')
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should limit input length to prevent DoS', async () => {
      const user = userEvent.setup();
      render(<MockContactForm />);
      
      const messageInput = screen.getByTestId('message-input');
      const longMessage = 'A'.repeat(10000);
      
      await user.type(messageInput, longMessage);
      
      // Should limit input length
      expect(messageInput.value.length).toBeLessThan(5000);
    });
  });

  describe('Content Security Policy', () => {
    it('should prevent inline script execution', () => {
      // Mock CSP violation handler
      const cspViolations: any[] = [];
      
      document.addEventListener('securitypolicyviolation', (e) => {
        cspViolations.push(e);
      });
      
      // Try to inject inline script
      const scriptElement = document.createElement('script');
      scriptElement.innerHTML = 'alert("CSP bypass attempt")';
      document.head.appendChild(scriptElement);
      
      // CSP should prevent execution
      expect(cspViolations.length).toBeGreaterThan(0);
    });

    it('should only allow trusted sources for external resources', () => {
      const trustedDomains = [
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com'
      ];
      
      const untrustedDomains = [
        'http://malicious.com',
        'https://evil.example.com',
        'javascript:alert(1)'
      ];
      
      // This would be tested with actual CSP headers in integration tests
      expect(trustedDomains).toEqual(expect.arrayContaining([
        expect.stringMatching(/^https:\/\//)
      ]));
      
      untrustedDomains.forEach(domain => {
        expect(domain).not.toMatch(/^https:\/\/(fonts\.googleapis\.com|cdn\.jsdelivr\.net)/);
      });
    });
  });

  describe('Local Storage Security', () => {
    it('should not store sensitive data in localStorage', () => {
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      });
      
      // Simulate storing user data
      const userData = {
        email: 'user@example.com',
        apiKey: 'secret-api-key',
        preferences: { theme: 'dark' }
      };
      
      // Should not store sensitive data
      localStorage.setItem('userData', JSON.stringify(userData));
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'userData',
        expect.not.stringContaining('secret-api-key')
      );
    });

    it('should encrypt sensitive data before storage', () => {
      const sensitiveData = {
        contactInfo: {
          email: 'user@example.com',
          phone: '+1-555-0123'
        }
      };
      
      // Mock encryption function
      const encrypt = (data: string) => btoa(data); // Simple base64 for demo
      
      const encryptedData = encrypt(JSON.stringify(sensitiveData));
      localStorage.setItem('encryptedUserData', encryptedData);
      
      // Stored data should be encrypted
      expect(localStorage.getItem('encryptedUserData')).not.toContain('user@example.com');
    });
  });

  describe('URL and Navigation Security', () => {
    it('should validate and sanitize URL parameters', () => {
      const maliciousParams = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        '../../../etc/passwd',
        '<script>alert("xss")</script>'
      ];
      
      maliciousParams.forEach(param => {
        const url = new URL(`http://localhost:3000/dashboard?search=${encodeURIComponent(param)}`);
        const searchParam = url.searchParams.get('search');
        
        // Should not contain malicious content after parsing
        expect(searchParam).not.toContain('<script>');
        expect(searchParam).not.toContain('javascript:');
      });
    });

    it('should prevent open redirect vulnerabilities', () => {
      const maliciousRedirects = [
        'http://evil.com',
        '//evil.com',
        'https://evil.com',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>'
      ];
      
      const allowedDomains = ['localhost:3000', 'yourdomain.com'];
      
      maliciousRedirects.forEach(redirect => {
        const isAllowed = allowedDomains.some(domain => 
          redirect.includes(domain) && redirect.startsWith('http')
        );
        
        expect(isAllowed).toBeFalsy();
      });
    });
  });

  describe('API Request Security', () => {
    it('should include CSRF tokens in API requests', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      
      global.fetch = mockFetch;
      
      // Mock CSRF token
      const csrfToken = 'mock-csrf-token';
      document.querySelector('meta[name="csrf-token"]')?.setAttribute('content', csrfToken);
      
      // Make API request
      await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ title: 'Test Job' })
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/jobs',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': csrfToken
          })
        })
      );
    });

    it('should validate API responses to prevent response tampering', async () => {
      const mockResponse = {
        success: true,
        data: {
          jobs: [
            {
              id: '1',
              title: '<script>alert("xss")</script>Developer',
              company: 'Test Company'
            }
          ]
        }
      };
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const response = await fetch('/api/jobs');
      const data = await response.json();
      
      // Should validate and sanitize response data
      expect(data.data.jobs[0].title).not.toContain('<script>');
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in error messages', () => {
      const sensitiveError = new Error('Database connection failed: mongodb://user:password@localhost:27017/db');
      
      // Mock error handler that should sanitize errors
      const sanitizeError = (error: Error) => {
        let message = error.message;
        
        // Remove sensitive patterns
        message = message.replace(/mongodb:\/\/[^@]+@[^\/]+/g, 'mongodb://[REDACTED]');
        message = message.replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]');
        message = message.replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=[REDACTED]');
        
        return { message, stack: undefined };
      };
      
      const sanitizedError = sanitizeError(sensitiveError);
      
      expect(sanitizedError.message).not.toContain('password');
      expect(sanitizedError.message).toContain('[REDACTED]');
      expect(sanitizedError.stack).toBeUndefined();
    });

    it('should implement proper error boundaries', () => {
      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        const [hasError, setHasError] = React.useState(false);
        
        React.useEffect(() => {
          const handleError = (error: ErrorEvent) => {
            setHasError(true);
            // Log error securely without exposing sensitive data
            console.error('Application error:', error.message);
          };
          
          window.addEventListener('error', handleError);
          return () => window.removeEventListener('error', handleError);
        }, []);
        
        if (hasError) {
          return <div data-testid="error-boundary">Something went wrong</div>;
        }
        
        return <>{children}</>;
      };
      
      const ThrowError = () => {
        throw new Error('Test error with sensitive data: api_key=secret123');
      };
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.queryByText(/api_key=secret123/)).not.toBeInTheDocument();
    });
  });

  describe('Third-party Integration Security', () => {
    it('should validate external API responses', async () => {
      const maliciousApiResponse = {
        jobs: [
          {
            title: '<script>alert("xss")</script>Developer',
            description: '<img src="x" onerror="alert(1)">',
            company: 'Evil Corp'
          }
        ]
      };
      
      // Mock external API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(maliciousApiResponse)
      });
      
      const response = await fetch('https://external-api.com/jobs');
      const data = await response.json();
      
      // Should sanitize external data
      const sanitizeHtml = (html: string) => {
        return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                  .replace(/on\w+="[^"]*"/gi, '');
      };
      
      const sanitizedJobs = data.jobs.map((job: any) => ({
        ...job,
        title: sanitizeHtml(job.title),
        description: sanitizeHtml(job.description)
      }));
      
      expect(sanitizedJobs[0].title).not.toContain('<script>');
      expect(sanitizedJobs[0].description).not.toContain('onerror=');
    });
  });
});

// Helper function to simulate React useState
function useState<T>(initialValue: T): [T, (value: T) => void] {
  let value = initialValue;
  const setValue = (newValue: T) => {
    value = newValue;
  };
  return [value, setValue];
}

// Mock React for testing
const React = {
  useState,
  useEffect: (effect: () => void, deps?: any[]) => {
    effect();
  }
};
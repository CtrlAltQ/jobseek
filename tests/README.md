# AI Job Finder - Testing Documentation

## Overview

This document provides comprehensive information about the testing strategy, setup, and execution for the AI Job Finder application. Our testing approach covers unit tests, integration tests, end-to-end tests, performance tests, accessibility tests, visual regression tests, and security tests.

## Testing Strategy

### Test Pyramid

```
    /\
   /  \    E2E Tests (Playwright)
  /____\   - User journeys
 /      \  - Performance
/________\ - Accessibility
           - Visual regression

Integration Tests (Jest)
- API endpoints
- Database operations
- Component integration

Unit Tests (Jest + RTL)
- Component logic
- Utility functions
- Business logic
```

### Test Categories

1. **Unit Tests** - Test individual components and functions in isolation
2. **Integration Tests** - Test component interactions and API endpoints
3. **End-to-End Tests** - Test complete user workflows
4. **Performance Tests** - Test application performance under load
5. **Accessibility Tests** - Test WCAG compliance and keyboard navigation
6. **Visual Regression Tests** - Test UI consistency across changes
7. **Security Tests** - Test for vulnerabilities and security best practices

## Test Structure

```
tests/
├── api/                    # API endpoint tests
├── components/             # Component unit tests
├── lib/                    # Utility function tests
├── e2e/                    # End-to-end tests
│   ├── complete-workflow.spec.ts
│   ├── user-journeys.spec.ts
│   ├── performance.spec.ts
│   ├── accessibility.spec.ts
│   └── visual-regression.spec.ts
├── security/               # Security tests
│   ├── api-security.test.ts
│   └── frontend-security.test.ts
└── README.md              # This file
```

## Setup and Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+ (for agent tests)
- MongoDB (for integration tests)

### Installation

```bash
# Install frontend dependencies
npm install

# Install Python dependencies for agent tests
cd agents
pip install -r requirements.txt
cd ..
```

### Environment Setup

Create test environment files:

```bash
# .env.test
MONGODB_URI=mongodb://localhost:27017/ai-job-finder-test
NODE_ENV=test
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Running Tests

### All Tests

```bash
# Run all tests
npm run test:all

# Run with coverage
npm run test:coverage
```

### Unit and Integration Tests

```bash
# Run Jest tests
npm test

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- JobCard.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"
```

### End-to-End Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test user-journeys.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
```

### Performance Tests

```bash
# Run performance tests
npx playwright test performance.spec.ts

# Run with performance profiling
npx playwright test performance.spec.ts --trace=on
```

### Accessibility Tests

```bash
# Run accessibility tests
npx playwright test accessibility.spec.ts

# Run with accessibility report
npx playwright test accessibility.spec.ts --reporter=html
```

### Visual Regression Tests

```bash
# Run visual tests
npx playwright test visual-regression.spec.ts

# Update screenshots
npx playwright test visual-regression.spec.ts --update-snapshots

# Run visual tests for specific viewport
npx playwright test visual-regression.spec.ts --project="Mobile Chrome"
```

### Security Tests

```bash
# Run security tests
npm test -- security/

# Run API security tests
npm test -- api-security.test.ts

# Run frontend security tests
npm test -- frontend-security.test.ts
```

### Python Agent Tests

```bash
cd agents

# Run all agent tests
python -m pytest

# Run with coverage
python -m pytest --cov=.

# Run specific test file
python -m pytest tests/test_indeed_scraper.py

# Run with verbose output
python -m pytest -v
```

## Test Configuration

### Jest Configuration

Located in `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Playwright Configuration

Located in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
});
```

## Writing Tests

### Unit Test Example

```typescript
// tests/components/JobCard.test.tsx
import { render, screen } from '@testing-library/react';
import { JobCard } from '@/components/dashboard/JobCard';

describe('JobCard', () => {
  const mockJob = {
    _id: '1',
    title: 'Frontend Developer',
    company: 'TechCorp',
    location: 'Remote',
    salary: { min: 80000, max: 120000, currency: 'USD' },
    status: 'new'
  };

  it('should render job information correctly', () => {
    render(<JobCard job={mockJob} />);
    
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('TechCorp')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('$80,000 - $120,000')).toBeInTheDocument();
  });

  it('should handle job status updates', async () => {
    const onStatusChange = jest.fn();
    render(<JobCard job={mockJob} onStatusChange={onStatusChange} />);
    
    const statusButton = screen.getByRole('button', { name: /status/i });
    await userEvent.click(statusButton);
    
    const appliedOption = screen.getByText('Applied');
    await userEvent.click(appliedOption);
    
    expect(onStatusChange).toHaveBeenCalledWith('1', 'applied');
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/job-application.spec.ts
import { test, expect } from '@playwright/test';

test('complete job application workflow', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Find and click on a job
  await page.click('[data-testid="job-card"]');
  await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
  
  // Mark as applied
  await page.click('[data-testid="mark-applied-button"]');
  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  
  // Verify status update
  await page.click('[data-testid="close-modal"]');
  await expect(page.locator('[data-testid="job-status"]')).toContainText('Applied');
});
```

## Test Data Management

### Mock Data

Create consistent mock data for tests:

```typescript
// tests/mocks/jobData.ts
export const mockJobs = [
  {
    _id: '1',
    title: 'Frontend Developer',
    company: 'TechCorp',
    location: 'Remote',
    salary: { min: 80000, max: 120000, currency: 'USD' },
    description: 'Build amazing React applications',
    requirements: ['React', 'TypeScript', 'CSS'],
    jobType: 'full-time',
    remote: true,
    source: 'Indeed',
    relevanceScore: 95,
    status: 'new',
    postedDate: '2024-01-15T10:00:00Z'
  }
];
```

### Database Setup

For integration tests, use MongoDB Memory Server:

```typescript
// tests/setup/database.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongoServer: MongoMemoryServer;
let mongoClient: MongoClient;

export const setupTestDatabase = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  
  process.env.MONGODB_URI = uri;
  return { mongoServer, mongoClient };
};

export const teardownTestDatabase = async () => {
  await mongoClient.close();
  await mongoServer.stop();
};
```

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        npm ci
        cd agents && pip install -r requirements.txt
    
    - name: Run unit tests
      run: npm run test:coverage
    
    - name: Run Python tests
      run: cd agents && python -m pytest --cov=.
    
    - name: Install Playwright
      run: npx playwright install --with-deps
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info,./agents/coverage.xml
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: |
          test-results/
          playwright-report/
```

### Pre-commit Hooks

Setup with Husky:

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run test:changed",
      "pre-push": "npm run test:e2e:ci"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx}": ["eslint --fix", "prettier --write"]
  }
}
```

## Coverage Requirements

### Coverage Thresholds

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html

# Generate coverage for Python agents
cd agents && python -m pytest --cov=. --cov-report=html
```

## Performance Testing

### Metrics to Monitor

- **Page Load Time**: < 3 seconds
- **First Contentful Paint**: < 1.5 seconds
- **Time to Interactive**: < 4 seconds
- **API Response Time**: < 500ms
- **Memory Usage**: Stable over time

### Performance Budgets

```javascript
// playwright.config.ts
use: {
  // Performance budgets
  launchOptions: {
    args: ['--enable-precise-memory-info']
  }
}
```

## Accessibility Testing

### WCAG Compliance Levels

- **Level A**: Basic accessibility
- **Level AA**: Standard compliance (our target)
- **Level AAA**: Enhanced accessibility

### Accessibility Checklist

- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Color contrast meets AA standards
- [ ] Focus indicators are visible
- [ ] ARIA labels are present
- [ ] Form validation is accessible
- [ ] Images have alt text

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in test configuration
   - Check for infinite loops or unresolved promises

2. **Flaky E2E tests**
   - Add proper wait conditions
   - Use data-testid attributes instead of text selectors
   - Mock external dependencies

3. **Visual regression failures**
   - Update screenshots after intentional UI changes
   - Check for animation timing issues
   - Ensure consistent test environment

4. **Memory leaks in tests**
   - Clean up event listeners
   - Clear timers and intervals
   - Reset global state between tests

### Debug Commands

```bash
# Debug specific test
npm test -- --testNamePattern="should render" --verbose

# Debug E2E test
npx playwright test --debug user-journeys.spec.ts

# Run tests with trace
npx playwright test --trace=on

# Generate test report
npx playwright show-report
```

## Best Practices

### Test Writing

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use descriptive test names**: "should update job status when applied button is clicked"
3. **Test behavior, not implementation**: Focus on what the user sees/does
4. **Keep tests independent**: Each test should be able to run in isolation
5. **Use data-testid attributes**: More reliable than text-based selectors

### Test Organization

1. **Group related tests**: Use describe blocks effectively
2. **Share setup code**: Use beforeEach/beforeAll appropriately
3. **Mock external dependencies**: Keep tests fast and reliable
4. **Test edge cases**: Empty states, error conditions, boundary values

### Performance

1. **Run tests in parallel**: Use Jest and Playwright parallel execution
2. **Use test databases**: Separate test data from development data
3. **Clean up after tests**: Prevent test pollution
4. **Optimize test data**: Use minimal data sets for faster execution

## Maintenance

### Regular Tasks

1. **Update dependencies**: Keep testing libraries current
2. **Review test coverage**: Identify gaps in coverage
3. **Update visual baselines**: When UI changes are intentional
4. **Clean up obsolete tests**: Remove tests for deprecated features
5. **Monitor test performance**: Keep test suite execution time reasonable

### Metrics to Track

- Test execution time
- Test failure rate
- Code coverage percentage
- Number of flaky tests
- Time to fix failing tests

This documentation should be updated as the testing strategy evolves and new testing patterns are adopted.
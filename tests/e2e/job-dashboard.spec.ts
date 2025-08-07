import { test, expect } from '@playwright/test';

test.describe('Job Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('/api/jobs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            jobs: [
              {
                _id: '1',
                title: 'Frontend Developer',
                company: 'Tech Corp',
                location: 'Remote',
                salary: { min: 80000, max: 120000, currency: 'USD' },
                description: 'Build amazing web applications',
                requirements: ['React', 'TypeScript', 'CSS'],
                benefits: ['Health insurance', 'Remote work'],
                jobType: 'full-time',
                remote: true,
                source: 'Indeed',
                sourceUrl: 'https://indeed.com/job/1',
                postedDate: new Date().toISOString(),
                discoveredDate: new Date().toISOString(),
                relevanceScore: 85,
                status: 'new',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              {
                _id: '2',
                title: 'Full Stack Developer',
                company: 'Startup Inc',
                location: 'Nashville, TN',
                salary: { min: 70000, max: 100000, currency: 'USD' },
                description: 'Work on cutting-edge projects',
                requirements: ['Node.js', 'React', 'MongoDB'],
                benefits: ['Equity', 'Flexible hours'],
                jobType: 'full-time',
                remote: false,
                source: 'LinkedIn',
                sourceUrl: 'https://linkedin.com/job/2',
                postedDate: new Date().toISOString(),
                discoveredDate: new Date().toISOString(),
                relevanceScore: 92,
                status: 'viewed',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              pages: 1
            }
          }
        })
      });
    });

    await page.route('/api/jobs/*/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.goto('/dashboard');
  });

  test('should display job listings', async ({ page }) => {
    // Wait for jobs to load
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(2);
    
    // Check job details are displayed
    await expect(page.locator('text=Frontend Developer')).toBeVisible();
    await expect(page.locator('text=Tech Corp')).toBeVisible();
    await expect(page.locator('text=Remote')).toBeVisible();
    
    await expect(page.locator('text=Full Stack Developer')).toBeVisible();
    await expect(page.locator('text=Startup Inc')).toBeVisible();
    await expect(page.locator('text=Nashville, TN')).toBeVisible();
  });

  test('should filter jobs by location', async ({ page }) => {
    // Wait for jobs to load
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(2);
    
    // Open location filter
    await page.click('[data-testid="location-filter"]');
    
    // Select Nashville location
    await page.click('text=Nashville, TN');
    
    // Apply filter
    await page.click('[data-testid="apply-filters"]');
    
    // Should only show Nashville job
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(1);
    await expect(page.locator('text=Full Stack Developer')).toBeVisible();
    await expect(page.locator('text=Frontend Developer')).not.toBeVisible();
  });

  test('should search jobs by keyword', async ({ page }) => {
    // Wait for jobs to load
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(2);
    
    // Search for "React"
    await page.fill('[data-testid="search-input"]', 'React');
    
    // Both jobs should still be visible (both mention React)
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(2);
    
    // Search for "MongoDB"
    await page.fill('[data-testid="search-input"]', 'MongoDB');
    
    // Only Full Stack Developer job should be visible
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(1);
    await expect(page.locator('text=Full Stack Developer')).toBeVisible();
  });

  test('should update job status', async ({ page }) => {
    // Wait for jobs to load
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(2);
    
    // Find the first job card and mark as applied
    const firstJobCard = page.locator('[data-testid="job-card"]').first();
    await firstJobCard.locator('[data-testid="status-dropdown"]').click();
    await firstJobCard.locator('text=Applied').click();
    
    // Verify status was updated
    await expect(firstJobCard.locator('[data-testid="job-status"]')).toContainText('Applied');
  });

  test('should open job detail modal', async ({ page }) => {
    // Wait for jobs to load
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(2);
    
    // Click on first job to view details
    await page.locator('[data-testid="job-card"]').first().click();
    
    // Modal should be open
    await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
    
    // Check modal content
    await expect(page.locator('[data-testid="job-detail-modal"]')).toContainText('Frontend Developer');
    await expect(page.locator('[data-testid="job-detail-modal"]')).toContainText('Tech Corp');
    await expect(page.locator('[data-testid="job-detail-modal"]')).toContainText('Build amazing web applications');
    
    // Close modal
    await page.click('[data-testid="close-modal"]');
    await expect(page.locator('[data-testid="job-detail-modal"]')).not.toBeVisible();
  });

  test('should sort jobs by relevance, date, and salary', async ({ page }) => {
    // Wait for jobs to load
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(2);
    
    // Default sort should be by relevance (Full Stack Developer first - 92 score)
    const firstJob = page.locator('[data-testid="job-card"]').first();
    await expect(firstJob).toContainText('Full Stack Developer');
    
    // Sort by salary (descending - Frontend Developer should be first)
    await page.selectOption('[data-testid="sort-select"]', 'salary');
    await expect(page.locator('[data-testid="job-card"]').first()).toContainText('Frontend Developer');
    
    // Change to ascending order
    await page.click('[data-testid="sort-order-toggle"]');
    await expect(page.locator('[data-testid="job-card"]').first()).toContainText('Full Stack Developer');
  });

  test('should handle loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/jobs', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { jobs: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }
        })
      });
    });
    
    await page.goto('/dashboard');
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await expect(page.locator('text=Loading jobs...')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
  });

  test('should handle error states', async ({ page }) => {
    // Mock API error
    await page.route('/api/jobs', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });
    
    await page.goto('/dashboard');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Internal server error')).toBeVisible();
    
    // Should have retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should show offline status when network is unavailable', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    await page.goto('/dashboard');
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('text=Offline')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Should show online indicator
    await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();
    await expect(page.locator('text=Online')).toBeVisible();
  });

  test('should paginate through job results', async ({ page }) => {
    // Mock API with pagination
    await page.route('/api/jobs*', async (route) => {
      const url = new URL(route.request().url());
      const page_num = parseInt(url.searchParams.get('page') || '1');
      
      const jobs = page_num === 1 ? [
        {
          _id: '1',
          title: 'Job 1',
          company: 'Company 1',
          location: 'Location 1',
          // ... other fields
        }
      ] : [
        {
          _id: '2',
          title: 'Job 2',
          company: 'Company 2',
          location: 'Location 2',
          // ... other fields
        }
      ];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            jobs,
            pagination: {
              page: page_num,
              limit: 1,
              total: 2,
              pages: 2
            }
          }
        })
      });
    });
    
    await page.goto('/dashboard');
    
    // Should show first page
    await expect(page.locator('text=Job 1')).toBeVisible();
    await expect(page.locator('text=Page 1 of 2')).toBeVisible();
    
    // Go to next page
    await page.click('[data-testid="next-page"]');
    
    // Should show second page
    await expect(page.locator('text=Job 2')).toBeVisible();
    await expect(page.locator('text=Page 2 of 2')).toBeVisible();
    
    // Go back to previous page
    await page.click('[data-testid="prev-page"]');
    
    // Should show first page again
    await expect(page.locator('text=Job 1')).toBeVisible();
    await expect(page.locator('text=Page 1 of 2')).toBeVisible();
  });
});
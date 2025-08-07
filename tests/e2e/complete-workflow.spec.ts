import { test, expect } from '@playwright/test';

test.describe('Complete User Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all necessary APIs
    await page.route('/api/settings', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              searchCriteria: {
                jobTitles: ['Frontend Developer'],
                keywords: ['React', 'TypeScript'],
                locations: ['Remote'],
                remoteOk: true,
                salaryRange: { min: 70000, max: 120000 },
                industries: ['Technology'],
                experienceLevel: 'mid'
              },
              contactInfo: {
                email: 'user@example.com',
                phone: '+1-555-0123',
                linkedin: 'https://linkedin.com/in/user',
                portfolio: 'https://user.dev'
              },
              agentSchedule: {
                frequency: 'daily',
                enabled: true
              },
              updatedAt: new Date().toISOString()
            }
          })
        });
      } else if (route.request().method() === 'PUT') {
        const body = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { ...body, updatedAt: new Date().toISOString() },
            message: 'Settings updated successfully'
          })
        });
      }
    });

    await page.route('/api/jobs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            jobs: [
              {
                _id: '1',
                title: 'Senior Frontend Developer',
                company: 'TechCorp',
                location: 'Remote',
                salary: { min: 90000, max: 130000, currency: 'USD' },
                description: 'Build amazing React applications with TypeScript',
                requirements: ['React', 'TypeScript', 'CSS', '3+ years experience'],
                benefits: ['Health insurance', 'Remote work', '401k'],
                jobType: 'full-time',
                remote: true,
                source: 'Indeed',
                sourceUrl: 'https://indeed.com/job/1',
                postedDate: new Date().toISOString(),
                discoveredDate: new Date().toISOString(),
                relevanceScore: 95,
                status: 'new',
                aiSummary: 'Excellent match for React/TypeScript skills',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              {
                _id: '2',
                title: 'React Developer',
                company: 'StartupInc',
                location: 'Nashville, TN',
                salary: { min: 75000, max: 105000, currency: 'USD' },
                description: 'Join our growing team building innovative web apps',
                requirements: ['React', 'JavaScript', 'Node.js'],
                benefits: ['Equity', 'Flexible hours', 'Learning budget'],
                jobType: 'full-time',
                remote: false,
                source: 'LinkedIn',
                sourceUrl: 'https://linkedin.com/job/2',
                postedDate: new Date().toISOString(),
                discoveredDate: new Date().toISOString(),
                relevanceScore: 88,
                status: 'new',
                aiSummary: 'Good match with growth opportunities',
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

    await page.route('/api/agents/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            systemStatus: {
              runningAgents: 2,
              totalAgents: 5,
              lastActivity: new Date().toISOString(),
              overallStatus: 'active'
            },
            agentStatuses: [
              {
                agentId: 'indeed_scraper',
                source: 'Indeed',
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                jobsFound: 15,
                jobsProcessed: 15,
                errors: [],
                status: 'success',
                createdAt: new Date().toISOString()
              }
            ],
            recentActivity: []
          }
        })
      });
    });

    await page.route('/api/analytics/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalJobs: 25,
            newJobs: 5,
            appliedJobs: 8,
            dismissedJobs: 2,
            averageRelevanceScore: 87
          }
        })
      });
    });

    await page.route('/api/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Message sent successfully'
        })
      });
    });
  });

  test('complete job search workflow', async ({ page }) => {
    // 1. Start at homepage/hero section
    await page.goto('/');
    
    // Verify hero section is displayed
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-info"]')).toBeVisible();
    
    // 2. Navigate to job dashboard
    await page.click('[data-testid="dashboard-link"]');
    await expect(page).toHaveURL('/dashboard');
    
    // Verify jobs are loaded
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(2);
    
    // 3. Filter jobs by remote work
    await page.click('[data-testid="remote-filter"]');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(1);
    await expect(page.locator('text=Senior Frontend Developer')).toBeVisible();
    
    // 4. View job details
    await page.click('[data-testid="job-card"]');
    await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
    await expect(page.locator('text=Build amazing React applications')).toBeVisible();
    
    // 5. Mark job as applied
    await page.click('[data-testid="mark-applied-button"]');
    await expect(page.locator('[data-testid="job-status"]')).toContainText('Applied');
    
    // Close modal
    await page.click('[data-testid="close-modal"]');
    
    // 6. Navigate to settings
    await page.click('[data-testid="settings-link"]');
    await expect(page).toHaveURL('/settings');
    
    // 7. Update job search criteria
    await page.fill('[data-testid="job-titles-input"]', 'Frontend Developer, Full Stack Developer');
    await page.fill('[data-testid="keywords-input"]', 'React, TypeScript, Node.js');
    await page.fill('[data-testid="min-salary-input"]', '80000');
    
    // Save settings
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // 8. Navigate to analytics
    await page.click('[data-testid="analytics-link"]');
    await expect(page).toHaveURL('/analytics');
    
    // Verify analytics data is displayed
    await expect(page.locator('[data-testid="total-jobs-stat"]')).toContainText('25');
    await expect(page.locator('[data-testid="applied-jobs-stat"]')).toContainText('8');
    
    // 9. Go back to dashboard to see updated results
    await page.click('[data-testid="dashboard-link"]');
    
    // Should still show jobs (mocked data doesn't change, but in real app it would)
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(2);
    
    // 10. Test search functionality
    await page.fill('[data-testid="search-input"]', 'TypeScript');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(1);
    await expect(page.locator('text=Senior Frontend Developer')).toBeVisible();
    
    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(2);
  });

  test('offline functionality workflow', async ({ page, context }) => {
    // 1. Load dashboard while online
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(2);
    
    // Verify online status
    await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();
    
    // 2. Go offline
    await context.setOffline(true);
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('text=Offline')).toBeVisible();
    
    // 3. Try to update job status while offline
    const firstJob = page.locator('[data-testid="job-card"]').first();
    await firstJob.locator('[data-testid="status-dropdown"]').click();
    await firstJob.locator('text=Applied').click();
    
    // Should show pending actions indicator
    await expect(page.locator('[data-testid="pending-actions"]')).toBeVisible();
    await expect(page.locator('text=1 pending')).toBeVisible();
    
    // 4. Navigate to settings while offline
    await page.click('[data-testid="settings-link"]');
    
    // Should still work with cached data
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // 5. Try to update settings while offline
    await page.fill('[data-testid="min-salary-input"]', '85000');
    await page.click('[data-testid="save-button"]');
    
    // Should show success (optimistic update)
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // 6. Go back online
    await context.setOffline(false);
    
    // Should show online indicator and sync pending actions
    await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();
    
    // Pending actions should eventually clear (in real app)
    // Note: In this test, we can't easily test the actual sync without more complex mocking
  });

  test('real-time updates workflow', async ({ page }) => {
    // 1. Load dashboard
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(2);
    
    // 2. Verify real-time connection status
    await expect(page.locator('[data-testid="realtime-status"]')).toBeVisible();
    await expect(page.locator('text=Live Updates')).toBeVisible();
    
    // 3. Simulate new job arrival via real-time update
    await page.evaluate(() => {
      // Simulate SSE event
      window.dispatchEvent(new CustomEvent('jobs-updated', {
        detail: {
          type: 'jobs_updated',
          data: {
            count: 1,
            newJobs: [{
              _id: '3',
              title: 'New React Developer',
              company: 'NewCorp',
              location: 'Remote',
              status: 'new'
            }]
          }
        }
      }));
    });
    
    // Should show stale data indicator
    await expect(page.locator('[data-testid="stale-data-indicator"]')).toBeVisible();
    
    // 4. Refresh to get new data
    await page.click('[data-testid="refresh-button"]');
    
    // Stale indicator should disappear
    await expect(page.locator('[data-testid="stale-data-indicator"]')).not.toBeVisible();
  });

  test('error handling workflow', async ({ page }) => {
    // 1. Mock API errors
    await page.route('/api/jobs*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Database connection failed'
        })
      });
    });
    
    // 2. Load dashboard
    await page.goto('/dashboard');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Database connection failed')).toBeVisible();
    
    // 3. Try to retry
    await page.click('[data-testid="retry-button"]');
    
    // Error should persist (since we're still mocking the error)
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // 4. Fix the API and retry
    await page.route('/api/jobs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            jobs: [],
            pagination: { page: 1, limit: 20, total: 0, pages: 0 }
          }
        })
      });
    });
    
    await page.click('[data-testid="retry-button"]');
    
    // Error should be gone
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    await expect(page.locator('text=No jobs found')).toBeVisible();
  });

  test('contact form workflow', async ({ page }) => {
    // 1. Go to homepage
    await page.goto('/');
    
    // 2. Fill out contact form
    await page.fill('[data-testid="contact-name"]', 'John Doe');
    await page.fill('[data-testid="contact-email"]', 'john@example.com');
    await page.fill('[data-testid="contact-subject"]', 'Job Opportunity');
    await page.fill('[data-testid="contact-message"]', 'I would like to discuss a position at our company.');
    
    // 3. Submit form
    await page.click('[data-testid="contact-submit"]');
    
    // 4. Should show success message
    await expect(page.locator('[data-testid="contact-success"]')).toBeVisible();
    await expect(page.locator('text=Message sent successfully')).toBeVisible();
    
    // 5. Form should be reset
    await expect(page.locator('[data-testid="contact-name"]')).toHaveValue('');
    await expect(page.locator('[data-testid="contact-email"]')).toHaveValue('');
  });

  test('responsive design workflow', async ({ page }) => {
    // 1. Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/dashboard');
    
    // Should show desktop layout
    await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="job-grid"]')).toHaveCSS('grid-template-columns', /repeat\(2,/);
    
    // 2. Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Should adapt layout
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // 3. Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Should show mobile layout
    await expect(page.locator('[data-testid="job-grid"]')).toHaveCSS('grid-template-columns', /1fr/);
    
    // 4. Test mobile navigation
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    await page.click('[data-testid="mobile-settings-link"]');
    await expect(page).toHaveURL('/settings');
  });
});
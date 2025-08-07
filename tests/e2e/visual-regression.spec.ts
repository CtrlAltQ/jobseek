import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock APIs for consistent visual testing
    await page.route('/api/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/api/jobs')) {
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
                  company: 'TechCorp Inc.',
                  location: 'Remote',
                  salary: { min: 90000, max: 130000, currency: 'USD' },
                  description: 'Build amazing React applications with TypeScript and modern tools.',
                  requirements: ['React', 'TypeScript', 'CSS', '3+ years experience'],
                  benefits: ['Health insurance', 'Remote work', '401k matching'],
                  jobType: 'full-time',
                  remote: true,
                  source: 'Indeed',
                  sourceUrl: 'https://indeed.com/job/1',
                  postedDate: '2024-01-15T10:00:00Z',
                  discoveredDate: '2024-01-15T10:30:00Z',
                  relevanceScore: 95,
                  status: 'new',
                  aiSummary: 'Excellent match for React/TypeScript skills with competitive salary'
                },
                {
                  _id: '2',
                  title: 'React Developer',
                  company: 'StartupInc',
                  location: 'Nashville, TN',
                  salary: { min: 75000, max: 105000, currency: 'USD' },
                  description: 'Join our growing team building innovative web applications.',
                  requirements: ['React', 'JavaScript', 'Node.js', '2+ years experience'],
                  benefits: ['Equity', 'Flexible hours', 'Learning budget'],
                  jobType: 'full-time',
                  remote: false,
                  source: 'LinkedIn',
                  sourceUrl: 'https://linkedin.com/job/2',
                  postedDate: '2024-01-14T14:30:00Z',
                  discoveredDate: '2024-01-14T15:00:00Z',
                  relevanceScore: 88,
                  status: 'viewed',
                  aiSummary: 'Good match with growth opportunities in Nashville'
                },
                {
                  _id: '3',
                  title: 'Full Stack Engineer',
                  company: 'MegaCorp',
                  location: 'San Francisco, CA',
                  salary: { min: 120000, max: 180000, currency: 'USD' },
                  description: 'Work on cutting-edge projects with the latest technologies.',
                  requirements: ['React', 'Node.js', 'Python', '5+ years experience'],
                  benefits: ['Stock options', 'Unlimited PTO', 'Top-tier health insurance'],
                  jobType: 'full-time',
                  remote: true,
                  source: 'AngelList',
                  sourceUrl: 'https://angel.co/job/3',
                  postedDate: '2024-01-13T09:15:00Z',
                  discoveredDate: '2024-01-13T09:45:00Z',
                  relevanceScore: 92,
                  status: 'applied',
                  aiSummary: 'High-paying position with excellent benefits package'
                }
              ],
              pagination: { page: 1, limit: 20, total: 3, pages: 1 }
            }
          })
        });
      } else if (url.includes('/api/settings')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              searchCriteria: {
                jobTitles: ['Frontend Developer', 'Full Stack Developer'],
                keywords: ['React', 'TypeScript', 'Node.js'],
                locations: ['Remote', 'Nashville, TN'],
                remoteOk: true,
                salaryRange: { min: 70000, max: 150000 },
                industries: ['Technology', 'Fintech'],
                experienceLevel: 'mid'
              },
              contactInfo: {
                email: 'john.doe@example.com',
                phone: '+1-555-0123',
                linkedin: 'https://linkedin.com/in/johndoe',
                portfolio: 'https://johndoe.dev'
              },
              agentSchedule: {
                frequency: 'daily',
                enabled: true
              }
            }
          })
        });
      } else if (url.includes('/api/analytics')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              totalJobs: 47,
              newJobs: 8,
              appliedJobs: 12,
              dismissedJobs: 5,
              averageRelevanceScore: 87,
              sourceStats: [
                { source: 'Indeed', count: 18, successRate: 0.65 },
                { source: 'LinkedIn', count: 15, successRate: 0.73 },
                { source: 'AngelList', count: 8, successRate: 0.88 },
                { source: 'RemoteOK', count: 6, successRate: 0.50 }
              ],
              weeklyStats: [
                { week: '2024-W01', jobs: 12, applications: 3 },
                { week: '2024-W02', jobs: 15, applications: 4 },
                { week: '2024-W03', jobs: 20, applications: 5 }
              ]
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    // Set consistent viewport and disable animations for stable screenshots
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test('homepage hero section visual', async ({ page }) => {
    await page.goto('/');
    
    // Wait for content to load
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-info"]')).toBeVisible();
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-full.png');
    
    // Take hero section specific screenshot
    await expect(page.locator('[data-testid="hero-section"]')).toHaveScreenshot('hero-section.png');
    
    // Take contact info screenshot
    await expect(page.locator('[data-testid="contact-info"]')).toHaveScreenshot('contact-info.png');
    
    // Test skills showcase
    await expect(page.locator('[data-testid="skills-showcase"]')).toHaveScreenshot('skills-showcase.png');
  });

  test('job dashboard visual states', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(3);
    
    // Default dashboard view
    await expect(page).toHaveScreenshot('dashboard-default.png');
    
    // Job cards grid
    await expect(page.locator('[data-testid="job-grid"]')).toHaveScreenshot('job-grid.png');
    
    // Individual job card states
    const newJobCard = page.locator('[data-testid="job-card"]').first();
    await expect(newJobCard).toHaveScreenshot('job-card-new.png');
    
    const viewedJobCard = page.locator('[data-testid="job-card"]').nth(1);
    await expect(viewedJobCard).toHaveScreenshot('job-card-viewed.png');
    
    const appliedJobCard = page.locator('[data-testid="job-card"]').nth(2);
    await expect(appliedJobCard).toHaveScreenshot('job-card-applied.png');
    
    // Job card hover state
    await newJobCard.hover();
    await expect(newJobCard).toHaveScreenshot('job-card-hover.png');
    
    // Job filters panel
    await page.click('[data-testid="filters-button"]');
    await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-panel"]')).toHaveScreenshot('filters-panel.png');
    
    // Search bar with results
    await page.fill('[data-testid="search-input"]', 'React');
    await page.waitForTimeout(300); // Wait for debounce
    await expect(page.locator('[data-testid="search-container"]')).toHaveScreenshot('search-with-query.png');
  });

  test('job detail modal visual', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(3);
    
    // Open job detail modal
    await page.locator('[data-testid="job-card"]').first().click();
    await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
    
    // Full modal screenshot
    await expect(page.locator('[data-testid="job-detail-modal"]')).toHaveScreenshot('job-detail-modal.png');
    
    // Modal header
    await expect(page.locator('[data-testid="modal-header"]')).toHaveScreenshot('modal-header.png');
    
    // Job description section
    await expect(page.locator('[data-testid="job-description"]')).toHaveScreenshot('job-description.png');
    
    // Requirements and benefits
    await expect(page.locator('[data-testid="job-requirements"]')).toHaveScreenshot('job-requirements.png');
    await expect(page.locator('[data-testid="job-benefits"]')).toHaveScreenshot('job-benefits.png');
    
    // Action buttons
    await expect(page.locator('[data-testid="modal-actions"]')).toHaveScreenshot('modal-actions.png');
    
    // Status dropdown expanded
    await page.click('[data-testid="status-dropdown"]');
    await expect(page.locator('[data-testid="status-dropdown-menu"]')).toHaveScreenshot('status-dropdown-expanded.png');
  });

  test('settings panel visual states', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Full settings page
    await expect(page).toHaveScreenshot('settings-full.png');
    
    // Job search criteria section
    await expect(page.locator('[data-testid="search-criteria-section"]')).toHaveScreenshot('search-criteria.png');
    
    // Contact info section
    await expect(page.locator('[data-testid="contact-info-section"]')).toHaveScreenshot('contact-info-settings.png');
    
    // Agent schedule section
    await expect(page.locator('[data-testid="agent-schedule-section"]')).toHaveScreenshot('agent-schedule.png');
    
    // Form validation states
    await page.fill('[data-testid="job-titles-input"]', '');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="job-titles-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-criteria-section"]')).toHaveScreenshot('search-criteria-error.png');
    
    // Success state
    await page.fill('[data-testid="job-titles-input"]', 'Frontend Developer');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toHaveScreenshot('success-message.png');
    
    // Salary range sliders
    await expect(page.locator('[data-testid="salary-range-section"]')).toHaveScreenshot('salary-range-sliders.png');
  });

  test('analytics dashboard visual', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    
    // Full analytics page
    await expect(page).toHaveScreenshot('analytics-full.png');
    
    // Stats overview cards
    await expect(page.locator('[data-testid="stats-overview"]')).toHaveScreenshot('stats-overview.png');
    
    // Jobs chart
    await expect(page.locator('[data-testid="jobs-chart"]')).toHaveScreenshot('jobs-chart.png');
    
    // Source performance chart
    await expect(page.locator('[data-testid="source-performance"]')).toHaveScreenshot('source-performance.png');
    
    // Agent activity log
    await expect(page.locator('[data-testid="agent-activity-log"]')).toHaveScreenshot('agent-activity-log.png');
    
    // Chart tooltips (hover state)
    await page.hover('[data-testid="chart-bar"]');
    await page.waitForTimeout(200);
    await expect(page.locator('[data-testid="jobs-chart"]')).toHaveScreenshot('jobs-chart-tooltip.png');
  });

  test('responsive design visual states', async ({ page }) => {
    // Desktop view (already tested above, but let's capture key responsive elements)
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(3);
    await expect(page).toHaveScreenshot('dashboard-desktop.png');
    
    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(3);
    await expect(page).toHaveScreenshot('dashboard-tablet.png');
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(3);
    await expect(page).toHaveScreenshot('dashboard-mobile.png');
    
    // Mobile navigation menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    await expect(page).toHaveScreenshot('mobile-menu-open.png');
    
    // Mobile job card expanded
    await page.click('[data-testid="mobile-menu-overlay"]'); // Close menu
    await page.locator('[data-testid="job-card"]').first().click();
    await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
    await expect(page).toHaveScreenshot('job-detail-mobile.png');
    
    // Mobile settings form
    await page.goto('/settings');
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    await expect(page).toHaveScreenshot('settings-mobile.png');
  });

  test('dark mode visual states', async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Homepage dark mode
    await page.goto('/');
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page).toHaveScreenshot('homepage-dark.png');
    
    // Dashboard dark mode
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(3);
    await expect(page).toHaveScreenshot('dashboard-dark.png');
    
    // Job cards in dark mode
    await expect(page.locator('[data-testid="job-grid"]')).toHaveScreenshot('job-grid-dark.png');
    
    // Modal in dark mode
    await page.locator('[data-testid="job-card"]').first().click();
    await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="job-detail-modal"]')).toHaveScreenshot('job-detail-modal-dark.png');
    
    // Settings in dark mode
    await page.goto('/settings');
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    await expect(page).toHaveScreenshot('settings-dark.png');
    
    // Analytics in dark mode
    await page.goto('/analytics');
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    await expect(page).toHaveScreenshot('analytics-dark.png');
  });

  test('loading and error states visual', async ({ page }) => {
    // Mock slow API response for loading state
    await page.route('/api/jobs*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    await page.goto('/dashboard');
    
    // Capture loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-loading.png');
    
    // Mock API error
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
    
    await page.reload();
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-error.png');
    
    // Empty state
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
    
    await page.reload();
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-empty.png');
  });

  test('form interaction states visual', async ({ page }) => {
    await page.goto('/settings');
    
    // Input focus states
    const jobTitlesInput = page.locator('[data-testid="job-titles-input"]');
    await jobTitlesInput.focus();
    await expect(page.locator('[data-testid="search-criteria-section"]')).toHaveScreenshot('input-focused.png');
    
    // Input with content
    await jobTitlesInput.fill('Frontend Developer, Full Stack Developer');
    await expect(page.locator('[data-testid="search-criteria-section"]')).toHaveScreenshot('input-filled.png');
    
    // Dropdown expanded
    const experienceSelect = page.locator('[data-testid="experience-level-select"]');
    await experienceSelect.click();
    await expect(page.locator('[data-testid="search-criteria-section"]')).toHaveScreenshot('dropdown-expanded.png');
    
    // Checkbox states
    const remoteCheckbox = page.locator('[data-testid="remote-ok-checkbox"]');
    await remoteCheckbox.check();
    await expect(page.locator('[data-testid="search-criteria-section"]')).toHaveScreenshot('checkbox-checked.png');
    
    // Range slider interaction
    const salarySlider = page.locator('[data-testid="min-salary-slider"]');
    await salarySlider.focus();
    await expect(page.locator('[data-testid="salary-range-section"]')).toHaveScreenshot('slider-focused.png');
  });

  test('notification and toast visual states', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Mock real-time notification
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('jobs-updated', {
        detail: {
          type: 'new_jobs',
          data: { count: 3 }
        }
      }));
    });
    
    await expect(page.locator('[data-testid="notification-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-toast"]')).toHaveScreenshot('notification-toast.png');
    
    // Success toast
    const jobCard = page.locator('[data-testid="job-card"]').first();
    await jobCard.locator('[data-testid="status-dropdown"]').click();
    await jobCard.locator('text=Applied').click();
    
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toHaveScreenshot('success-toast.png');
    
    // Error toast
    await page.route('/api/jobs/*/status', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Update failed' })
      });
    });
    
    await jobCard.locator('[data-testid="status-dropdown"]').click();
    await jobCard.locator('text=Dismissed').click();
    
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).toHaveScreenshot('error-toast.png');
  });

  test('component edge cases visual', async ({ page }) => {
    // Very long job titles and company names
    await page.route('/api/jobs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            jobs: [{
              _id: '1',
              title: 'Senior Full Stack Software Engineer with React, TypeScript, Node.js, and Cloud Architecture Experience',
              company: 'Very Long Company Name That Should Test Text Wrapping and Truncation Behavior Inc.',
              location: 'San Francisco, California, United States (Remote Available)',
              salary: { min: 150000, max: 250000, currency: 'USD' },
              description: 'This is a very long job description that should test how the UI handles extensive text content and whether it properly wraps or truncates as expected in the design system.',
              requirements: ['React', 'TypeScript', 'Node.js', 'AWS', 'Docker', 'Kubernetes', 'GraphQL', 'PostgreSQL', 'Redis', 'Microservices'],
              jobType: 'full-time',
              remote: true,
              source: 'Indeed',
              relevanceScore: 98,
              status: 'new'
            }],
            pagination: { page: 1, limit: 20, total: 1, pages: 1 }
          }
        })
      });
    });
    
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="job-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="job-card"]')).toHaveScreenshot('job-card-long-content.png');
    
    // Open modal to see full content handling
    await page.locator('[data-testid="job-card"]').click();
    await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="job-detail-modal"]')).toHaveScreenshot('job-detail-long-content.png');
  });
});
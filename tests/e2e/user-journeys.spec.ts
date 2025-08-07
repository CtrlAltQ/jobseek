import { test, expect } from '@playwright/test';

test.describe('Critical User Journeys E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (url.includes('/api/jobs') && method === 'GET') {
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
                  jobType: 'full-time',
                  remote: true,
                  source: 'Indeed',
                  sourceUrl: 'https://indeed.com/job/1',
                  postedDate: new Date().toISOString(),
                  relevanceScore: 95,
                  status: 'new',
                  aiSummary: 'Excellent match for React/TypeScript skills'
                }
              ],
              pagination: { page: 1, limit: 20, total: 1, pages: 1 }
            }
          })
        });
      } else if (url.includes('/api/settings')) {
        if (method === 'GET') {
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
                  salaryRange: { min: 70000, max: 120000 }
                },
                contactInfo: {
                  email: 'user@example.com',
                  linkedin: 'https://linkedin.com/in/user'
                }
              }
            })
          });
        } else if (method === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Settings updated successfully'
            })
          });
        }
      } else {
        await route.continue();
      }
    });
  });

  test('first-time user onboarding journey', async ({ page }) => {
    // 1. Visit homepage as new user
    await page.goto('/');
    
    // Should see hero section with clear value proposition
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('text=AI Job Finder')).toBeVisible();
    await expect(page.locator('text=Automated job discovery')).toBeVisible();
    
    // 2. Navigate to dashboard for first time
    await page.click('[data-testid="get-started-button"]');
    await expect(page).toHaveURL('/dashboard');
    
    // Should show onboarding guide or empty state
    await expect(page.locator('[data-testid="onboarding-guide"]')).toBeVisible();
    
    // 3. Set up initial preferences
    await page.click('[data-testid="setup-preferences-button"]');
    await expect(page).toHaveURL('/settings');
    
    // Fill out basic preferences
    await page.fill('[data-testid="job-titles-input"]', 'Frontend Developer');
    await page.fill('[data-testid="keywords-input"]', 'React, TypeScript');
    await page.selectOption('[data-testid="experience-level"]', 'mid');
    
    // Save preferences
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // 4. Return to dashboard to see results
    await page.click('[data-testid="dashboard-link"]');
    await expect(page.locator('[data-testid="job-card"]')).toBeVisible();
    
    // Should show tutorial tooltips for first-time actions
    await expect(page.locator('[data-testid="tutorial-tooltip"]')).toBeVisible();
  });

  test('job application tracking journey', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 1. View available jobs
    await expect(page.locator('[data-testid="job-card"]')).toBeVisible();
    
    // 2. Mark job as applied
    const jobCard = page.locator('[data-testid="job-card"]').first();
    await jobCard.locator('[data-testid="status-dropdown"]').click();
    await jobCard.locator('text=Applied').click();
    
    // Should update status immediately
    await expect(jobCard.locator('[data-testid="job-status"]')).toContainText('Applied');
    
    // 3. Add application notes
    await jobCard.locator('[data-testid="add-notes-button"]').click();
    await page.fill('[data-testid="application-notes"]', 'Applied via company website. Followed up with hiring manager.');
    await page.click('[data-testid="save-notes-button"]');
    
    // 4. Set follow-up reminder
    await jobCard.locator('[data-testid="set-reminder-button"]').click();
    await page.fill('[data-testid="reminder-date"]', '2024-02-15');
    await page.fill('[data-testid="reminder-notes"]', 'Follow up on application status');
    await page.click('[data-testid="save-reminder-button"]');
    
    // 5. View application history
    await page.click('[data-testid="analytics-link"]');
    await expect(page.locator('[data-testid="application-timeline"]')).toBeVisible();
    await expect(page.locator('text=Applied via company website')).toBeVisible();
    
    // 6. Update application status to interview
    await page.goto('/dashboard');
    await jobCard.locator('[data-testid="status-dropdown"]').click();
    await jobCard.locator('text=Interview Scheduled').click();
    
    // Should show interview preparation tips
    await expect(page.locator('[data-testid="interview-tips"]')).toBeVisible();
  });

  test('job search refinement journey', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 1. Initial job results
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(1);
    
    // 2. Use filters to refine results
    await page.click('[data-testid="filters-button"]');
    
    // Filter by salary range
    await page.fill('[data-testid="min-salary-filter"]', '100000');
    await page.fill('[data-testid="max-salary-filter"]', '150000');
    
    // Filter by location
    await page.selectOption('[data-testid="location-filter"]', 'Remote');
    
    // Filter by job type
    await page.check('[data-testid="full-time-filter"]');
    
    // Apply filters
    await page.click('[data-testid="apply-filters-button"]');
    
    // 3. Save search as alert
    await page.click('[data-testid="save-search-button"]');
    await page.fill('[data-testid="search-name"]', 'High-paying Remote React Jobs');
    await page.check('[data-testid="email-alerts"]');
    await page.click('[data-testid="save-alert-button"]');
    
    // 4. View saved searches
    await page.click('[data-testid="saved-searches-link"]');
    await expect(page.locator('text=High-paying Remote React Jobs')).toBeVisible();
    
    // 5. Edit saved search
    await page.click('[data-testid="edit-search-button"]');
    await page.fill('[data-testid="min-salary-filter"]', '90000');
    await page.click('[data-testid="update-search-button"]');
    
    // Should show updated criteria
    await expect(page.locator('[data-testid="min-salary-display"]')).toContainText('90000');
  });

  test('agent monitoring and control journey', async ({ page }) => {
    // Mock agent status API
    await page.route('/api/agents/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/status')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              systemStatus: {
                runningAgents: 3,
                totalAgents: 5,
                lastActivity: new Date().toISOString(),
                overallStatus: 'active'
              },
              agentStatuses: [
                {
                  agentId: 'indeed_scraper',
                  source: 'Indeed',
                  status: 'running',
                  jobsFound: 15,
                  lastRun: new Date().toISOString()
                },
                {
                  agentId: 'linkedin_scraper',
                  source: 'LinkedIn',
                  status: 'idle',
                  jobsFound: 8,
                  lastRun: new Date(Date.now() - 3600000).toISOString()
                }
              ]
            }
          })
        });
      } else if (url.includes('/trigger')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Agent triggered successfully'
          })
        });
      }
    });
    
    await page.goto('/monitoring');
    
    // 1. View agent status dashboard
    await expect(page.locator('[data-testid="agent-status-panel"]')).toBeVisible();
    await expect(page.locator('text=3 of 5 agents running')).toBeVisible();
    
    // 2. View individual agent details
    await page.click('[data-testid="agent-indeed_scraper"]');
    await expect(page.locator('[data-testid="agent-details"]')).toBeVisible();
    await expect(page.locator('text=15 jobs found')).toBeVisible();
    
    // 3. Manually trigger agent
    await page.click('[data-testid="trigger-agent-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Agent triggered successfully');
    
    // 4. View agent logs
    await page.click('[data-testid="view-logs-button"]');
    await expect(page.locator('[data-testid="agent-logs"]')).toBeVisible();
    
    // 5. Configure agent schedule
    await page.click('[data-testid="configure-schedule-button"]');
    await page.selectOption('[data-testid="schedule-frequency"]', 'hourly');
    await page.check('[data-testid="enable-schedule"]');
    await page.click('[data-testid="save-schedule-button"]');
    
    // Should show updated schedule
    await expect(page.locator('text=Hourly')).toBeVisible();
    
    // 6. Pause/resume agents
    await page.click('[data-testid="pause-all-agents-button"]');
    await expect(page.locator('[data-testid="agents-paused-indicator"]')).toBeVisible();
    
    await page.click('[data-testid="resume-all-agents-button"]');
    await expect(page.locator('[data-testid="agents-active-indicator"]')).toBeVisible();
  });

  test('data export and backup journey', async ({ page }) => {
    await page.goto('/settings');
    
    // 1. Navigate to data management section
    await page.click('[data-testid="data-management-tab"]');
    
    // 2. Export job data
    await page.click('[data-testid="export-jobs-button"]');
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.selectOption('[data-testid="date-range"]', 'last-30-days');
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-button"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('jobs-export');
    expect(download.suggestedFilename()).toContain('.csv');
    
    // 3. Export settings backup
    await page.click('[data-testid="export-settings-button"]');
    const settingsDownloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-settings-button"]');
    const settingsDownload = await settingsDownloadPromise;
    
    expect(settingsDownload.suggestedFilename()).toContain('settings-backup');
    
    // 4. Import settings
    await page.click('[data-testid="import-settings-button"]');
    
    // Mock file upload
    const fileInput = page.locator('[data-testid="settings-file-input"]');
    await fileInput.setInputFiles({
      name: 'settings-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({
        searchCriteria: {
          jobTitles: ['Full Stack Developer'],
          keywords: ['React', 'Node.js']
        }
      }))
    });
    
    await page.click('[data-testid="import-button"]');
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible();
    
    // Verify imported settings
    await expect(page.locator('[data-testid="job-titles-input"]')).toHaveValue('Full Stack Developer');
  });

  test('accessibility navigation journey', async ({ page }) => {
    await page.goto('/');
    
    // 1. Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="skip-to-content"]')).toBeFocused();
    
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="main-content"]')).toBeFocused();
    
    // 2. Navigate through hero section with keyboard
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="dashboard-link"]')).toBeFocused();
    
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/dashboard');
    
    // 3. Test screen reader announcements
    await page.locator('[data-testid="job-card"]').first().focus();
    
    // Verify ARIA labels and descriptions
    const jobCard = page.locator('[data-testid="job-card"]').first();
    await expect(jobCard).toHaveAttribute('aria-label');
    await expect(jobCard).toHaveAttribute('role', 'article');
    
    // 4. Test high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('body')).toHaveCSS('background-color', /rgb\(0, 0, 0\)|rgb\(17, 17, 17\)/);
    
    // 5. Test reduced motion preferences
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Animations should be disabled
    const heroSection = page.locator('[data-testid="hero-section"]');
    await expect(heroSection).toHaveCSS('animation-duration', '0s');
  });
});
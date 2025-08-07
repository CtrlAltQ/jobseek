import { test, expect } from '@playwright/test';

test.describe('Settings Panel E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock settings API
    await page.route('/api/settings', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              searchCriteria: {
                jobTitles: ['Frontend Developer', 'React Developer'],
                keywords: ['React', 'TypeScript', 'JavaScript'],
                locations: ['Remote', 'Nashville, TN'],
                remoteOk: true,
                salaryRange: { min: 70000, max: 120000 },
                industries: ['Technology', 'Software'],
                experienceLevel: 'mid'
              },
              contactInfo: {
                email: 'test@example.com',
                phone: '+1-555-0123',
                linkedin: 'https://linkedin.com/in/testuser',
                portfolio: 'https://testuser.dev'
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
            data: {
              ...body,
              updatedAt: new Date().toISOString()
            },
            message: 'Settings updated successfully'
          })
        });
      }
    });

    await page.goto('/settings');
  });

  test('should load and display current settings', async ({ page }) => {
    // Wait for settings to load
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Check job search criteria
    await expect(page.locator('[data-testid="job-titles-input"]')).toHaveValue('Frontend Developer, React Developer');
    await expect(page.locator('[data-testid="keywords-input"]')).toHaveValue('React, TypeScript, JavaScript');
    await expect(page.locator('[data-testid="locations-input"]')).toHaveValue('Remote, Nashville, TN');
    await expect(page.locator('[data-testid="remote-checkbox"]')).toBeChecked();
    
    // Check salary range
    await expect(page.locator('[data-testid="min-salary-input"]')).toHaveValue('70000');
    await expect(page.locator('[data-testid="max-salary-input"]')).toHaveValue('120000');
    
    // Check contact info
    await expect(page.locator('[data-testid="email-input"]')).toHaveValue('test@example.com');
    await expect(page.locator('[data-testid="phone-input"]')).toHaveValue('+1-555-0123');
    await expect(page.locator('[data-testid="linkedin-input"]')).toHaveValue('https://linkedin.com/in/testuser');
    await expect(page.locator('[data-testid="portfolio-input"]')).toHaveValue('https://testuser.dev');
    
    // Check agent schedule
    await expect(page.locator('[data-testid="frequency-select"]')).toHaveValue('daily');
    await expect(page.locator('[data-testid="enabled-checkbox"]')).toBeChecked();
  });

  test('should update job search criteria', async ({ page }) => {
    // Wait for settings to load
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Update job titles
    await page.fill('[data-testid="job-titles-input"]', 'Full Stack Developer, Node.js Developer');
    
    // Update keywords
    await page.fill('[data-testid="keywords-input"]', 'Node.js, Express, MongoDB');
    
    // Update locations
    await page.fill('[data-testid="locations-input"]', 'Austin, TX, Denver, CO');
    
    // Update salary range
    await page.fill('[data-testid="min-salary-input"]', '80000');
    await page.fill('[data-testid="max-salary-input"]', '140000');
    
    // Update experience level
    await page.selectOption('[data-testid="experience-select"]', 'senior');
    
    // Save settings
    await page.click('[data-testid="save-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();
  });

  test('should update contact information', async ({ page }) => {
    // Wait for settings to load
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Update contact info
    await page.fill('[data-testid="email-input"]', 'newemail@example.com');
    await page.fill('[data-testid="phone-input"]', '+1-555-9876');
    await page.fill('[data-testid="linkedin-input"]', 'https://linkedin.com/in/newuser');
    await page.fill('[data-testid="portfolio-input"]', 'https://newuser.dev');
    
    // Save settings
    await page.click('[data-testid="save-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should update agent schedule settings', async ({ page }) => {
    // Wait for settings to load
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Change frequency to hourly
    await page.selectOption('[data-testid="frequency-select"]', 'hourly');
    
    // Disable agent
    await page.uncheck('[data-testid="enabled-checkbox"]');
    
    // Save settings
    await page.click('[data-testid="save-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Wait for settings to load
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Clear required email field
    await page.fill('[data-testid="email-input"]', '');
    
    // Try to save
    await page.click('[data-testid="save-button"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Wait for settings to load
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Enter invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    
    // Try to save
    await page.click('[data-testid="save-button"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should validate salary range', async ({ page }) => {
    // Wait for settings to load
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Set min salary higher than max salary
    await page.fill('[data-testid="min-salary-input"]', '150000');
    await page.fill('[data-testid="max-salary-input"]', '100000');
    
    // Try to save
    await page.click('[data-testid="save-button"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Minimum salary cannot be greater than maximum salary')).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/settings', async (route) => {
      if (route.request().method() === 'GET') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: null
          })
        });
      }
    });
    
    await page.goto('/settings');
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-skeleton"]')).not.toBeVisible();
  });

  test('should handle save loading state', async ({ page }) => {
    // Mock slow save response
    await page.route('/api/settings', async (route) => {
      if (route.request().method() === 'PUT') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {},
            message: 'Settings saved successfully'
          })
        });
      }
    });
    
    // Wait for settings to load
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Click save button
    await page.click('[data-testid="save-button"]');
    
    // Should show saving state
    await expect(page.locator('[data-testid="save-button"]')).toContainText('Saving...');
    await expect(page.locator('[data-testid="save-button"]')).toBeDisabled();
    
    // Wait for save to complete
    await expect(page.locator('[data-testid="save-button"]')).toContainText('Save Settings');
    await expect(page.locator('[data-testid="save-button"]')).toBeEnabled();
  });

  test('should handle API errors', async ({ page }) => {
    // Mock API error
    await page.route('/api/settings', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      }
    });
    
    // Wait for settings to load
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Try to save
    await page.click('[data-testid="save-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Internal server error')).toBeVisible();
  });

  test('should add and remove job titles dynamically', async ({ page }) => {
    // Wait for settings to load
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Add new job title
    await page.click('[data-testid="add-job-title"]');
    await page.fill('[data-testid="new-job-title-input"]', 'Backend Developer');
    await page.click('[data-testid="confirm-add-job-title"]');
    
    // Should appear in the list
    await expect(page.locator('[data-testid="job-title-tag"]')).toContainText('Backend Developer');
    
    // Remove a job title
    await page.click('[data-testid="remove-job-title-Frontend Developer"]');
    
    // Should be removed from the list
    await expect(page.locator('[data-testid="job-title-tag"]')).not.toContainText('Frontend Developer');
  });

  test('should show real-time updates indicator', async ({ page }) => {
    // Wait for settings to load
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Should show real-time connection status
    await expect(page.locator('[data-testid="realtime-status"]')).toBeVisible();
    
    // Mock real-time update
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('settings-updated', {
        detail: { timestamp: new Date() }
      }));
    });
    
    // Should show update indicator
    await expect(page.locator('[data-testid="settings-updated-indicator"]')).toBeVisible();
  });
});
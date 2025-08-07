import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests (WCAG Compliance)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock APIs for consistent testing
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
                  title: 'Frontend Developer',
                  company: 'TechCorp',
                  location: 'Remote',
                  salary: { min: 80000, max: 120000, currency: 'USD' },
                  description: 'Build amazing React applications',
                  requirements: ['React', 'TypeScript'],
                  jobType: 'full-time',
                  remote: true,
                  source: 'Indeed',
                  relevanceScore: 95,
                  status: 'new'
                }
              ],
              pagination: { page: 1, limit: 20, total: 1, pages: 1 }
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
                jobTitles: ['Frontend Developer'],
                keywords: ['React']
              },
              contactInfo: {
                email: 'user@example.com'
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('homepage accessibility compliance', async ({ page }) => {
    await page.goto('/');
    
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Test specific accessibility features
    
    // 1. Skip to content link
    await expect(page.locator('[data-testid="skip-to-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="skip-to-content"]')).toHaveAttribute('href', '#main-content');
    
    // 2. Proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    
    // Check heading order (h1 -> h2 -> h3, etc.)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let previousLevel = 0;
    
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const currentLevel = parseInt(tagName.charAt(1));
      
      // Heading levels shouldn't skip (e.g., h1 -> h3)
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      previousLevel = currentLevel;
    }
    
    // 3. Alt text for images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      // Images should have alt text or be marked as decorative
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
    
    // 4. Form labels
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        
        // Input should have associated label or aria-label
        expect(hasLabel || ariaLabel || ariaLabelledby).toBeTruthy();
      }
    }
    
    // 5. Color contrast
    const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6, a, button');
    const sampleSize = Math.min(10, await textElements.count());
    
    for (let i = 0; i < sampleSize; i++) {
      const element = textElements.nth(i);
      const isVisible = await element.isVisible();
      
      if (isVisible) {
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize
          };
        });
        
        // This is a basic check - in a real app, you'd use a proper contrast checker
        expect(styles.color).not.toBe(styles.backgroundColor);
      }
    }
  });

  test('dashboard accessibility compliance', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="job-card"]')).toBeVisible();
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Test job card accessibility
    const jobCard = page.locator('[data-testid="job-card"]').first();
    
    // 1. Job cards should be properly labeled
    await expect(jobCard).toHaveAttribute('role', 'article');
    await expect(jobCard).toHaveAttribute('aria-label');
    
    // 2. Interactive elements should be keyboard accessible
    await jobCard.focus();
    await expect(jobCard).toBeFocused();
    
    // 3. Status buttons should have proper ARIA states
    const statusButton = jobCard.locator('[data-testid="status-dropdown"]');
    await expect(statusButton).toHaveAttribute('aria-expanded');
    await expect(statusButton).toHaveAttribute('aria-haspopup');
    
    // 4. Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Modal should open and be properly announced
    await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="job-detail-modal"]')).toHaveAttribute('role', 'dialog');
    await expect(page.locator('[data-testid="job-detail-modal"]')).toHaveAttribute('aria-modal', 'true');
    
    // Focus should be trapped in modal
    const modalCloseButton = page.locator('[data-testid="close-modal"]');
    await expect(modalCloseButton).toBeFocused();
    
    // 5. Test screen reader announcements
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="job-detail-modal"]')).not.toBeVisible();
    
    // Focus should return to trigger element
    await expect(jobCard).toBeFocused();
  });

  test('settings form accessibility', async ({ page }) => {
    await page.goto('/settings');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // 1. Form structure and labels
    const form = page.locator('[data-testid="settings-form"]');
    await expect(form).toHaveAttribute('role', 'form');
    
    // 2. Required fields should be properly marked
    const requiredInputs = page.locator('input[required], textarea[required], select[required]');
    const requiredCount = await requiredInputs.count();
    
    for (let i = 0; i < requiredCount; i++) {
      const input = requiredInputs.nth(i);
      const ariaRequired = await input.getAttribute('aria-required');
      const ariaInvalid = await input.getAttribute('aria-invalid');
      
      expect(ariaRequired).toBe('true');
      expect(ariaInvalid).toBe('false'); // Should be false initially
    }
    
    // 3. Error handling accessibility
    const jobTitlesInput = page.locator('[data-testid="job-titles-input"]');
    await jobTitlesInput.fill('');
    await page.click('[data-testid="save-button"]');
    
    // Error message should be properly associated
    const errorMessage = page.locator('[data-testid="job-titles-error"]');
    await expect(errorMessage).toBeVisible();
    
    const errorId = await errorMessage.getAttribute('id');
    const inputAriaDescribedby = await jobTitlesInput.getAttribute('aria-describedby');
    expect(inputAriaDescribedby).toContain(errorId);
    
    // Input should be marked as invalid
    await expect(jobTitlesInput).toHaveAttribute('aria-invalid', 'true');
    
    // 4. Success message accessibility
    await jobTitlesInput.fill('Frontend Developer');
    await page.click('[data-testid="save-button"]');
    
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toHaveAttribute('role', 'status');
    await expect(successMessage).toHaveAttribute('aria-live', 'polite');
    
    // 5. Range slider accessibility
    const salarySlider = page.locator('[data-testid="min-salary-slider"]');
    await expect(salarySlider).toHaveAttribute('role', 'slider');
    await expect(salarySlider).toHaveAttribute('aria-valuemin');
    await expect(salarySlider).toHaveAttribute('aria-valuemax');
    await expect(salarySlider).toHaveAttribute('aria-valuenow');
    await expect(salarySlider).toHaveAttribute('aria-label');
    
    // Test slider keyboard navigation
    await salarySlider.focus();
    await page.keyboard.press('ArrowRight');
    
    const newValue = await salarySlider.getAttribute('aria-valuenow');
    expect(parseInt(newValue || '0')).toBeGreaterThan(0);
  });

  test('keyboard navigation flow', async ({ page }) => {
    await page.goto('/');
    
    // 1. Test tab order
    const focusableElements = [
      '[data-testid="skip-to-content"]',
      '[data-testid="dashboard-link"]',
      '[data-testid="settings-link"]',
      '[data-testid="analytics-link"]',
      '[data-testid="contact-name"]',
      '[data-testid="contact-email"]',
      '[data-testid="contact-subject"]',
      '[data-testid="contact-message"]',
      '[data-testid="contact-submit"]'
    ];
    
    for (const selector of focusableElements) {
      await page.keyboard.press('Tab');
      const element = page.locator(selector);
      if (await element.isVisible()) {
        await expect(element).toBeFocused();
      }
    }
    
    // 2. Test skip to content functionality
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    const mainContent = page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeFocused();
    
    // 3. Test navigation with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Should navigate to dashboard
    
    await expect(page).toHaveURL('/dashboard');
    
    // 4. Test modal keyboard trapping
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="job-card"]')).toBeVisible();
    
    // Open modal with keyboard
    await page.locator('[data-testid="job-card"]').first().focus();
    await page.keyboard.press('Enter');
    
    await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
    
    // Tab should cycle within modal
    const modalElements = [
      '[data-testid="close-modal"]',
      '[data-testid="apply-button"]',
      '[data-testid="dismiss-button"]',
      '[data-testid="view-source-button"]'
    ];
    
    for (const selector of modalElements) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        await expect(element).toBeFocused();
        await page.keyboard.press('Tab');
      }
    }
    
    // Should cycle back to first element
    await expect(page.locator('[data-testid="close-modal"]')).toBeFocused();
    
    // Escape should close modal
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="job-detail-modal"]')).not.toBeVisible();
  });

  test('screen reader compatibility', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 1. Test ARIA landmarks
    await expect(page.locator('[role="banner"]')).toBeVisible(); // Header
    await expect(page.locator('[role="main"]')).toBeVisible(); // Main content
    await expect(page.locator('[role="navigation"]')).toBeVisible(); // Navigation
    await expect(page.locator('[role="contentinfo"]')).toBeVisible(); // Footer
    
    // 2. Test live regions
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeVisible();
    
    // Trigger an update that should announce to screen readers
    await page.click('[data-testid="refresh-button"]');
    
    const announcement = page.locator('[data-testid="sr-announcement"]');
    await expect(announcement).toContainText('Jobs updated');
    
    // 3. Test ARIA descriptions
    const jobCard = page.locator('[data-testid="job-card"]').first();
    const ariaDescribedby = await jobCard.getAttribute('aria-describedby');
    
    if (ariaDescribedby) {
      const description = page.locator(`#${ariaDescribedby}`);
      await expect(description).toBeVisible();
    }
    
    // 4. Test button states
    const statusButton = page.locator('[data-testid="status-dropdown"]').first();
    await expect(statusButton).toHaveAttribute('aria-expanded', 'false');
    
    await statusButton.click();
    await expect(statusButton).toHaveAttribute('aria-expanded', 'true');
    
    // 5. Test form field descriptions
    await page.goto('/settings');
    
    const salaryInput = page.locator('[data-testid="min-salary-input"]');
    const helpText = page.locator('[data-testid="salary-help-text"]');
    
    if (await helpText.isVisible()) {
      const helpId = await helpText.getAttribute('id');
      const inputDescribedby = await salaryInput.getAttribute('aria-describedby');
      expect(inputDescribedby).toContain(helpId);
    }
  });

  test('high contrast mode compatibility', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            background-color: black !important;
            color: white !important;
            border-color: white !important;
          }
        }
      `
    });
    
    await page.goto('/dashboard');
    
    // Check that content is still visible and readable
    const jobCard = page.locator('[data-testid="job-card"]').first();
    await expect(jobCard).toBeVisible();
    
    const styles = await jobCard.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor
      };
    });
    
    // In high contrast mode, text should be white on black
    expect(styles.color).toContain('255, 255, 255'); // White text
    expect(styles.backgroundColor).toContain('0, 0, 0'); // Black background
  });

  test('reduced motion compliance', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/');
    
    // Check that animations are disabled or reduced
    const heroSection = page.locator('[data-testid="hero-section"]');
    const animationDuration = await heroSection.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return computed.animationDuration;
    });
    
    // Animation should be disabled or very short
    expect(animationDuration === '0s' || parseFloat(animationDuration) <= 0.1).toBeTruthy();
    
    // Test that functionality still works without animations
    await page.click('[data-testid="dashboard-link"]');
    await expect(page).toHaveURL('/dashboard');
    
    // Page transitions should still work smoothly
    await expect(page.locator('[data-testid="job-card"]')).toBeVisible();
  });

  test('focus management', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 1. Test focus indicators
    const firstJobCard = page.locator('[data-testid="job-card"]').first();
    await firstJobCard.focus();
    
    // Should have visible focus indicator
    const focusStyles = await firstJobCard.evaluate(el => {
      const computed = window.getComputedStyle(el, ':focus');
      return {
        outline: computed.outline,
        boxShadow: computed.boxShadow
      };
    });
    
    // Should have some form of focus indicator
    expect(focusStyles.outline !== 'none' || focusStyles.boxShadow !== 'none').toBeTruthy();
    
    // 2. Test focus restoration after modal
    await firstJobCard.click();
    await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="job-detail-modal"]')).not.toBeVisible();
    
    // Focus should return to the job card
    await expect(firstJobCard).toBeFocused();
    
    // 3. Test focus management in dynamic content
    await page.click('[data-testid="load-more-button"]');
    
    // New content should not steal focus
    await expect(firstJobCard).toBeFocused();
    
    // 4. Test focus management with filters
    await page.click('[data-testid="filters-button"]');
    const filterPanel = page.locator('[data-testid="filter-panel"]');
    
    // First focusable element in filter panel should receive focus
    const firstFilterInput = filterPanel.locator('input, select, button').first();
    await expect(firstFilterInput).toBeFocused();
  });
});
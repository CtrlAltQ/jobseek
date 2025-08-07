import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock large dataset for performance testing
    const generateMockJobs = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        _id: `job-${i}`,
        title: `Developer Position ${i}`,
        company: `Company ${i}`,
        location: i % 3 === 0 ? 'Remote' : `City ${i}`,
        salary: { 
          min: 60000 + (i * 1000), 
          max: 100000 + (i * 1000), 
          currency: 'USD' 
        },
        description: `Job description for position ${i}. This is a detailed description that includes various requirements and responsibilities.`,
        requirements: ['React', 'TypeScript', 'CSS'],
        jobType: 'full-time',
        remote: i % 3 === 0,
        source: i % 2 === 0 ? 'Indeed' : 'LinkedIn',
        sourceUrl: `https://example.com/job/${i}`,
        postedDate: new Date(Date.now() - (i * 86400000)).toISOString(),
        relevanceScore: 70 + (i % 30),
        status: 'new',
        aiSummary: `AI summary for job ${i}`
      }));
    };

    await page.route('/api/jobs*', async (route) => {
      const url = new URL(route.request().url());
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const search = url.searchParams.get('search') || '';
      
      let jobs = generateMockJobs(1000);
      
      // Apply search filter if provided
      if (search) {
        jobs = jobs.filter(job => 
          job.title.toLowerCase().includes(search.toLowerCase()) ||
          job.company.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedJobs = jobs.slice(startIndex, endIndex);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            jobs: paginatedJobs,
            pagination: {
              page,
              limit,
              total: jobs.length,
              pages: Math.ceil(jobs.length / limit)
            }
          }
        })
      });
    });

    // Mock other APIs with minimal delay
    await page.route('/api/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            searchCriteria: {
              jobTitles: ['Developer'],
              keywords: ['React'],
              locations: ['Remote']
            }
          }
        })
      });
    });
  });

  test('job loading performance', async ({ page }) => {
    // Start performance measurement
    await page.goto('/dashboard');
    
    // Measure initial page load
    const navigationTiming = await page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        loadComplete: timing.loadEventEnd - timing.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    // Assert performance metrics
    expect(navigationTiming.domContentLoaded).toBeLessThan(2000); // 2 seconds
    expect(navigationTiming.firstContentfulPaint).toBeLessThan(1500); // 1.5 seconds
    
    // Wait for jobs to load
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(20, { timeout: 5000 });
    
    // Measure job rendering time
    const renderStart = Date.now();
    await page.locator('[data-testid="job-card"]').first().waitFor();
    const renderTime = Date.now() - renderStart;
    
    expect(renderTime).toBeLessThan(1000); // 1 second for first render
    
    // Test pagination performance
    const paginationStart = Date.now();
    await page.click('[data-testid="next-page-button"]');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(20);
    const paginationTime = Date.now() - paginationStart;
    
    expect(paginationTime).toBeLessThan(2000); // 2 seconds for pagination
  });

  test('search and filtering performance', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(20);
    
    // Test search performance
    const searchStart = Date.now();
    await page.fill('[data-testid="search-input"]', 'Developer');
    
    // Wait for debounced search
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(20);
    
    const searchTime = Date.now() - searchStart;
    expect(searchTime).toBeLessThan(1500); // 1.5 seconds including debounce
    
    // Test filter performance
    const filterStart = Date.now();
    await page.click('[data-testid="filters-button"]');
    await page.selectOption('[data-testid="location-filter"]', 'Remote');
    await page.click('[data-testid="apply-filters-button"]');
    
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(7); // ~1/3 of jobs are remote
    const filterTime = Date.now() - filterStart;
    
    expect(filterTime).toBeLessThan(2000); // 2 seconds for filtering
    
    // Test combined search and filter
    const combinedStart = Date.now();
    await page.fill('[data-testid="search-input"]', 'Position 1');
    await page.waitForTimeout(500);
    
    const combinedTime = Date.now() - combinedStart;
    expect(combinedTime).toBeLessThan(1000); // 1 second for combined operation
  });

  test('large dataset scrolling performance', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Enable infinite scroll mode
    await page.click('[data-testid="view-options-button"]');
    await page.click('[data-testid="infinite-scroll-option"]');
    
    // Initial load
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(20);
    
    // Measure scroll performance
    const scrollStart = Date.now();
    
    // Scroll to trigger more loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Wait for more jobs to load
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(40, { timeout: 3000 });
    
    const scrollTime = Date.now() - scrollStart;
    expect(scrollTime).toBeLessThan(2000); // 2 seconds for scroll loading
    
    // Test rapid scrolling
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(200);
    }
    
    // Should handle rapid scrolling without breaking
    const finalJobCount = await page.locator('[data-testid="job-card"]').count();
    expect(finalJobCount).toBeGreaterThan(40);
    expect(finalJobCount).toBeLessThan(200); // Shouldn't load everything at once
  });

  test('memory usage during extended session', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null;
    });
    
    // Simulate extended usage
    for (let i = 0; i < 10; i++) {
      // Navigate between pages
      await page.click('[data-testid="settings-link"]');
      await page.waitForLoadState('networkidle');
      
      await page.click('[data-testid="dashboard-link"]');
      await page.waitForLoadState('networkidle');
      
      // Perform searches
      await page.fill('[data-testid="search-input"]', `search ${i}`);
      await page.waitForTimeout(300);
      await page.fill('[data-testid="search-input"]', '');
      await page.waitForTimeout(300);
      
      // Apply and remove filters
      await page.click('[data-testid="filters-button"]');
      await page.selectOption('[data-testid="location-filter"]', 'Remote');
      await page.click('[data-testid="apply-filters-button"]');
      await page.waitForTimeout(200);
      
      await page.click('[data-testid="clear-filters-button"]');
      await page.waitForTimeout(200);
    }
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null;
    });
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
      
      // Memory shouldn't increase by more than 50% during extended usage
      expect(memoryIncreasePercent).toBeLessThan(50);
    }
  });

  test('API response time under load', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Measure multiple concurrent API calls
    const apiCalls = [];
    const startTime = Date.now();
    
    // Simulate multiple users/tabs making requests
    for (let i = 0; i < 5; i++) {
      apiCalls.push(
        page.evaluate(async (pageNum) => {
          const response = await fetch(`/api/jobs?page=${pageNum}&limit=20`);
          return {
            status: response.status,
            responseTime: Date.now()
          };
        }, i + 1)
      );
    }
    
    const results = await Promise.all(apiCalls);
    const totalTime = Date.now() - startTime;
    
    // All requests should complete successfully
    results.forEach(result => {
      expect(result.status).toBe(200);
    });
    
    // Total time for 5 concurrent requests should be reasonable
    expect(totalTime).toBeLessThan(3000); // 3 seconds
    
    // Test API caching effectiveness
    const cachedStart = Date.now();
    await page.reload();
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(20);
    const cachedTime = Date.now() - cachedStart;
    
    // Cached load should be faster
    expect(cachedTime).toBeLessThan(1000); // 1 second with caching
  });

  test('real-time updates performance', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(20);
    
    // Simulate real-time job updates
    const updateStart = Date.now();
    
    // Send multiple real-time updates
    for (let i = 0; i < 10; i++) {
      await page.evaluate((index) => {
        window.dispatchEvent(new CustomEvent('jobs-updated', {
          detail: {
            type: 'new_job',
            data: {
              _id: `realtime-${index}`,
              title: `Real-time Job ${index}`,
              company: `Company ${index}`,
              status: 'new'
            }
          }
        }));
      }, i);
      
      await page.waitForTimeout(50); // Small delay between updates
    }
    
    const updateTime = Date.now() - updateStart;
    
    // Real-time updates should be processed quickly
    expect(updateTime).toBeLessThan(1000); // 1 second for 10 updates
    
    // UI should show update indicator
    await expect(page.locator('[data-testid="new-jobs-indicator"]')).toBeVisible();
    
    // Test update batching
    const batchStart = Date.now();
    
    // Send rapid updates that should be batched
    await page.evaluate(() => {
      for (let i = 0; i < 50; i++) {
        window.dispatchEvent(new CustomEvent('jobs-updated', {
          detail: {
            type: 'job_updated',
            data: { jobId: `job-${i}`, status: 'viewed' }
          }
        }));
      }
    });
    
    const batchTime = Date.now() - batchStart;
    
    // Batched updates should be even faster
    expect(batchTime).toBeLessThan(500); // 0.5 seconds for batched updates
  });

  test('mobile performance', async ({ page }) => {
    // Simulate mobile device
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    const mobileStart = Date.now();
    await page.goto('/dashboard');
    
    // Wait for mobile layout to load
    await expect(page.locator('[data-testid="mobile-job-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(20);
    
    const mobileLoadTime = Date.now() - mobileStart;
    
    // Mobile should load within reasonable time
    expect(mobileLoadTime).toBeLessThan(3000); // 3 seconds on mobile
    
    // Test mobile scrolling performance
    const scrollStart = Date.now();
    
    await page.evaluate(() => {
      const container = document.querySelector('[data-testid="mobile-job-list"]');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
    
    // Wait for scroll-triggered loading
    await page.waitForTimeout(500);
    const scrollTime = Date.now() - scrollStart;
    
    expect(scrollTime).toBeLessThan(1000); // 1 second for mobile scroll
    
    // Test touch interactions
    const touchStart = Date.now();
    
    const jobCard = page.locator('[data-testid="job-card"]').first();
    await jobCard.tap();
    await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
    
    const touchTime = Date.now() - touchStart;
    expect(touchTime).toBeLessThan(500); // 0.5 seconds for touch response
  });
});
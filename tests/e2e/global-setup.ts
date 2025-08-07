import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // Start the development server if not already running
  const { spawn } = require('child_process');
  
  // Check if server is already running
  try {
    const response = await fetch('http://localhost:3000');
    if (response.ok) {
      console.log('✅ Development server already running');
      return;
    }
  } catch (error) {
    console.log('🔄 Starting development server...');
  }
  
  // Start the server
  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-job-finder-test'
    }
  });
  
  // Wait for server to be ready
  let serverReady = false;
  let attempts = 0;
  const maxAttempts = 30;
  
  while (!serverReady && attempts < maxAttempts) {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        serverReady = true;
        console.log('✅ Development server is ready');
      }
    } catch (error) {
      attempts++;
      console.log(`⏳ Waiting for server... (${attempts}/${maxAttempts})`);
    }
  }
  
  if (!serverReady) {
    console.error('❌ Failed to start development server');
    process.exit(1);
  }
  
  // Store server process for cleanup
  (global as any).__SERVER__ = server;
  
  // Set up test database
  console.log('🗄️ Setting up test database...');
  
  // Create a browser instance for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Pre-populate test data if needed
  try {
    await page.goto('http://localhost:3000/api/test-setup', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    console.log('✅ Test data setup complete');
  } catch (error) {
    console.log('⚠️ Test data setup endpoint not available, continuing...');
  }
  
  await browser.close();
  
  console.log('🎉 Global setup complete!');
}

export default globalSetup;
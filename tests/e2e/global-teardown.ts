import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  // Stop the development server if we started it
  const server = (global as any).__SERVER__;
  if (server) {
    console.log('🛑 Stopping development server...');
    server.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise(resolve => {
      server.on('exit', resolve);
      setTimeout(() => {
        server.kill('SIGKILL');
        resolve(undefined);
      }, 5000);
    });
    
    console.log('✅ Development server stopped');
  }
  
  // Clean up test database
  console.log('🗄️ Cleaning up test database...');
  
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-job-finder-test'
    );
    
    await client.connect();
    const db = client.db();
    
    // Drop test collections
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).drop();
    }
    
    await client.close();
    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.log('⚠️ Database cleanup failed:', error.message);
  }
  
  // Clean up any temporary files
  console.log('📁 Cleaning up temporary files...');
  
  const fs = require('fs');
  const path = require('path');
  
  const tempDirs = [
    'test-results',
    'playwright-report',
    'coverage'
  ];
  
  for (const dir of tempDirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`✅ Cleaned up ${dir}`);
      } catch (error) {
        console.log(`⚠️ Failed to clean up ${dir}:`, error.message);
      }
    }
  }
  
  console.log('🎉 Global teardown complete!');
}

export default globalTeardown;
#!/usr/bin/env ts-node

/**
 * Database initialization script
 * Run this script to set up MongoDB collections with proper schema validation and indexes
 */

import { initializeDatabase } from '../src/lib/schemas';
import { initializeServices } from '../src/lib/database';

async function main() {
  try {
    console.log('🚀 Initializing database...');
    
    // Initialize database schema and indexes
    await initializeDatabase();
    
    // Initialize database services
    await initializeServices();
    
    console.log('✅ Database initialization completed successfully!');
    console.log('📊 Collections created with schema validation and indexes:');
    console.log('   - jobs (Job postings with text search and filtering indexes)');
    console.log('   - agentLogs (Agent activity logs with performance indexes)');
    console.log('   - userSettings (User preferences and configuration)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

export { main as initializeDatabase };
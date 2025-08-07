#!/usr/bin/env node

const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  console.log('🗄️  Setting up AI Job Finder database...');
  
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    const db = client.db('ai-job-finder');
    
    // Create collections with validation
    console.log('📋 Creating collections...');
    
    // Jobs collection
    try {
      await db.createCollection('jobs', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['title', 'company', 'source', 'sourceUrl', 'discoveredDate'],
            properties: {
              title: { bsonType: 'string' },
              company: { bsonType: 'string' },
              location: { bsonType: 'string' },
              description: { bsonType: 'string' },
              requirements: { bsonType: 'array' },
              salary: {
                bsonType: 'object',
                properties: {
                  min: { bsonType: 'number' },
                  max: { bsonType: 'number' },
                  currency: { bsonType: 'string' }
                }
              },
              source: { bsonType: 'string' },
              sourceUrl: { bsonType: 'string' },
              remote: { bsonType: 'bool' },
              jobType: { bsonType: 'string' },
              postedDate: { bsonType: 'date' },
              discoveredDate: { bsonType: 'date' },
              relevanceScore: { bsonType: 'number' },
              status: { 
                bsonType: 'string',
                enum: ['new', 'viewed', 'applied', 'dismissed', 'interview', 'rejected', 'offer']
              },
              aiSummary: { bsonType: 'string' }
            }
          }
        }
      });
      console.log('✅ Jobs collection created');
    } catch (error) {
      if (error.code === 48) {
        console.log('ℹ️  Jobs collection already exists');
      } else {
        throw error;
      }
    }
    
    // Agent logs collection
    try {
      await db.createCollection('agent_logs', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['agentId', 'startTime', 'status'],
            properties: {
              agentId: { bsonType: 'string' },
              source: { bsonType: 'string' },
              startTime: { bsonType: 'date' },
              endTime: { bsonType: 'date' },
              status: {
                bsonType: 'string',
                enum: ['running', 'success', 'error', 'timeout']
              },
              jobsFound: { bsonType: 'number' },
              jobsProcessed: { bsonType: 'number' },
              errors: { bsonType: 'array' },
              metadata: { bsonType: 'object' }
            }
          }
        }
      });
      console.log('✅ Agent logs collection created');
    } catch (error) {
      if (error.code === 48) {
        console.log('ℹ️  Agent logs collection already exists');
      } else {
        throw error;
      }
    }
    
    // Settings collection
    try {
      await db.createCollection('settings', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['userId', 'updatedAt'],
            properties: {
              userId: { bsonType: 'string' },
              searchCriteria: {
                bsonType: 'object',
                properties: {
                  jobTitles: { bsonType: 'array' },
                  keywords: { bsonType: 'array' },
                  locations: { bsonType: 'array' },
                  remoteOk: { bsonType: 'bool' },
                  salaryRange: {
                    bsonType: 'object',
                    properties: {
                      min: { bsonType: 'number' },
                      max: { bsonType: 'number' }
                    }
                  },
                  industries: { bsonType: 'array' },
                  experienceLevel: { bsonType: 'string' }
                }
              },
              contactInfo: {
                bsonType: 'object',
                properties: {
                  email: { bsonType: 'string' },
                  phone: { bsonType: 'string' },
                  linkedin: { bsonType: 'string' },
                  portfolio: { bsonType: 'string' }
                }
              },
              agentSchedule: {
                bsonType: 'object',
                properties: {
                  frequency: { bsonType: 'string' },
                  enabled: { bsonType: 'bool' }
                }
              },
              updatedAt: { bsonType: 'date' }
            }
          }
        }
      });
      console.log('✅ Settings collection created');
    } catch (error) {
      if (error.code === 48) {
        console.log('ℹ️  Settings collection already exists');
      } else {
        throw error;
      }
    }
    
    // Create indexes for better performance
    console.log('🔍 Creating database indexes...');
    
    const jobs = db.collection('jobs');
    await jobs.createIndex({ sourceUrl: 1 }, { unique: true });
    await jobs.createIndex({ discoveredDate: -1 });
    await jobs.createIndex({ relevanceScore: -1 });
    await jobs.createIndex({ status: 1 });
    await jobs.createIndex({ source: 1 });
    await jobs.createIndex({ remote: 1 });
    await jobs.createIndex({ 'salary.min': 1 });
    await jobs.createIndex({ title: 'text', description: 'text', company: 'text' });
    console.log('✅ Jobs indexes created');
    
    const agentLogs = db.collection('agent_logs');
    await agentLogs.createIndex({ startTime: -1 });
    await agentLogs.createIndex({ agentId: 1, startTime: -1 });
    await agentLogs.createIndex({ status: 1 });
    console.log('✅ Agent logs indexes created');
    
    const settings = db.collection('settings');
    await settings.createIndex({ userId: 1 }, { unique: true });
    console.log('✅ Settings indexes created');
    
    // Insert default settings
    console.log('⚙️  Creating default settings...');
    try {
      await settings.insertOne({
        userId: 'default',
        searchCriteria: {
          jobTitles: ['Frontend Developer', 'Full Stack Developer', 'React Developer'],
          keywords: ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Next.js'],
          locations: ['Remote', 'Nashville, TN'],
          remoteOk: true,
          salaryRange: { min: 70000, max: 150000 },
          industries: ['Technology', 'Software', 'Fintech'],
          experienceLevel: 'mid'
        },
        contactInfo: {
          email: 'jeremytclegg@gmail.com',
          linkedin: 'https://linkedin.com/in/jeremyclegg',
          portfolio: 'https://jeremyclegg.dev'
        },
        agentSchedule: {
          frequency: 'daily',
          enabled: true
        },
        updatedAt: new Date()
      });
      console.log('✅ Default settings created');
    } catch (error) {
      if (error.code === 11000) {
        console.log('ℹ️  Default settings already exist');
      } else {
        throw error;
      }
    }
    
    // Show database stats
    console.log('\n📊 Database Setup Complete!');
    const stats = await db.stats();
    console.log(`Database: ${stats.db}`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n🎉 Your AI Job Finder database is ready!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupDatabase();
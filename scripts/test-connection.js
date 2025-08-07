#!/usr/bin/env node

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log('Connection string format:', process.env.MONGODB_URI?.replace(/:[^:@]*@/, ':***@'));
  
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connection successful!');
    
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('Database name:', db.databaseName);
    console.log('Existing collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check if your password contains special characters that need URL encoding');
    console.log('2. Verify your username and cluster name are correct');
    console.log('3. Make sure your IP is whitelisted in MongoDB Atlas');
  } finally {
    await client.close();
  }
}

testConnection();
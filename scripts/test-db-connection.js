#!/usr/bin/env node

const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    console.log('Please set it like this:');
    console.log('export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/ai-job-finder"');
    process.exit(1);
  }

  console.log('🔄 Testing MongoDB connection...');
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Test database operations
    const db = client.db('ai-job-finder');
    
    // Create a test document
    const testCollection = db.collection('connection-test');
    const testDoc = { 
      message: 'Connection test successful', 
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    const result = await testCollection.insertOne(testDoc);
    console.log('✅ Test document inserted with ID:', result.insertedId);
    
    // Read it back
    const retrieved = await testCollection.findOne({ _id: result.insertedId });
    console.log('✅ Test document retrieved:', retrieved.message);
    
    // Clean up
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('✅ Test document cleaned up');
    
    // List collections to verify access
    const collections = await db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));
    
    console.log('🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check your username and password in the connection string');
      console.log('2. Make sure the database user has proper permissions');
      console.log('3. Verify the cluster name in the connection string');
    }
    
    if (error.message.includes('network')) {
      console.log('\n💡 Network troubleshooting:');
      console.log('1. Check if your IP is whitelisted in MongoDB Atlas');
      console.log('2. Try allowing access from anywhere (0.0.0.0/0) temporarily');
      console.log('3. Check your internet connection');
    }
    
    process.exit(1);
  } finally {
    await client.close();
  }
}

testConnection();
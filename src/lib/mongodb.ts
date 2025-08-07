import { MongoClient, Db } from 'mongodb';

// Global variables for lazy initialization
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Detect if we're in build time (no environment variables available)
function isBuildTime(): boolean {
  return typeof process !== 'undefined' && 
         process.env.NODE_ENV === 'production' && 
         !process.env.MONGODB_URI;
}

// Lazy initialization function
async function getMongoClient(): Promise<MongoClient> {
  // Skip during build time
  if (isBuildTime()) {
    throw new Error('Database not available during build time');
  }

  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    throw new Error('MongoDB URI is not configured. Please check your environment variables.');
  }

  // Return existing promise if available
  if (clientPromise) {
    return clientPromise;
  }

  const options = {};

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db('ai-job-finder');
}

// Export a dummy promise for backward compatibility (not used in new code)
export default Promise.resolve(null as any);
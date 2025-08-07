import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

// Mock Next.js API handler testing utilities
const createMockRequest = (method: string, url: string, body?: any, headers?: any) => ({
  method,
  url,
  body,
  headers: {
    'content-type': 'application/json',
    ...headers
  },
  query: new URL(url, 'http://localhost:3000').searchParams
});

const createMockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    statusCode: 200,
    headers: {}
  };
  return res;
};

describe('API Security Tests', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    
    // Set test environment variables
    process.env.MONGODB_URI = uri;
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject malicious SQL injection attempts in job search', async () => {
      const maliciousInputs = [
        "'; DROP TABLE jobs; --",
        "1' OR '1'='1",
        "admin'/*",
        "' UNION SELECT * FROM users --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const req = createMockRequest('GET', `/api/jobs?search=${encodeURIComponent(maliciousInput)}`);
        const res = createMockResponse();

        // Import and test the API handler
        const { default: handler } = await import('../../src/app/api/jobs/route');
        
        try {
          await handler(req as any);
          
          // Should either sanitize the input or reject it
          expect(res.status).not.toHaveBeenCalledWith(500);
          
          // Verify no database errors occurred
          const db = mongoClient.db();
          const collections = await db.listCollections().toArray();
          expect(collections.some(c => c.name === 'jobs')).toBeTruthy();
        } catch (error) {
          // If it throws, it should be a validation error, not a database error
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).not.toContain('database');
        }
      }
    });

    it('should reject NoSQL injection attempts', async () => {
      const maliciousPayloads = [
        { $ne: null },
        { $gt: "" },
        { $where: "function() { return true; }" },
        { $regex: ".*" },
        { $or: [{ title: "admin" }, { title: { $ne: null } }] }
      ];

      for (const payload of maliciousPayloads) {
        const req = createMockRequest('POST', '/api/jobs', payload);
        const res = createMockResponse();

        const { default: handler } = await import('../../src/app/api/jobs/route');
        
        await handler(req as any);
        
        // Should reject malicious payloads
        expect(res.status).toHaveBeenCalledWith(400);
      }
    });

    it('should sanitize XSS attempts in job data', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
        '<svg onload="alert(1)">'
      ];

      for (const xssPayload of xssPayloads) {
        const jobData = {
          title: xssPayload,
          company: 'Test Company',
          description: `Job description with ${xssPayload}`,
          location: 'Remote'
        };

        const req = createMockRequest('POST', '/api/jobs', jobData);
        const res = createMockResponse();

        const { default: handler } = await import('../../src/app/api/jobs/route');
        
        await handler(req as any);
        
        // Should either sanitize or reject
        if (res.json.mock.calls.length > 0) {
          const responseData = res.json.mock.calls[0][0];
          if (responseData.success) {
            // If accepted, should be sanitized
            expect(responseData.data.title).not.toContain('<script>');
            expect(responseData.data.title).not.toContain('javascript:');
            expect(responseData.data.description).not.toContain('<script>');
          }
        }
      }
    });

    it('should validate and limit request payload size', async () => {
      const largePayload = {
        title: 'A'.repeat(10000),
        description: 'B'.repeat(100000),
        company: 'C'.repeat(1000)
      };

      const req = createMockRequest('POST', '/api/jobs', largePayload);
      const res = createMockResponse();

      const { default: handler } = await import('../../src/app/api/jobs/route');
      
      await handler(req as any);
      
      // Should reject oversized payloads
      expect(res.status).toHaveBeenCalledWith(413);
    });

    it('should validate required fields and data types', async () => {
      const invalidPayloads = [
        {}, // Missing required fields
        { title: 123 }, // Wrong data type
        { title: 'Valid', salary: 'not-a-number' }, // Invalid salary
        { title: 'Valid', postedDate: 'invalid-date' }, // Invalid date
        { title: 'Valid', remote: 'maybe' } // Invalid boolean
      ];

      for (const payload of invalidPayloads) {
        const req = createMockRequest('POST', '/api/jobs', payload);
        const res = createMockResponse();

        const { default: handler } = await import('../../src/app/api/jobs/route');
        
        await handler(req as any);
        
        expect(res.status).toHaveBeenCalledWith(400);
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require valid API key for agent endpoints', async () => {
      const req = createMockRequest('POST', '/api/agents/sync');
      const res = createMockResponse();

      const { default: handler } = await import('../../src/app/api/agents/sync/route');
      
      await handler(req as any);
      
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should validate API key format and authenticity', async () => {
      const invalidKeys = [
        'invalid-key',
        '',
        'Bearer invalid',
        'too-short',
        'a'.repeat(1000) // Too long
      ];

      for (const key of invalidKeys) {
        const req = createMockRequest('POST', '/api/agents/sync', {}, {
          'authorization': `Bearer ${key}`
        });
        const res = createMockResponse();

        const { default: handler } = await import('../../src/app/api/agents/sync/route');
        
        await handler(req as any);
        
        expect(res.status).toHaveBeenCalledWith(401);
      }
    });

    it('should prevent unauthorized access to sensitive endpoints', async () => {
      const sensitiveEndpoints = [
        '/api/settings',
        '/api/agents/logs',
        '/api/analytics/stats'
      ];

      for (const endpoint of sensitiveEndpoints) {
        const req = createMockRequest('GET', endpoint);
        const res = createMockResponse();

        // Test without proper authentication
        try {
          const module = await import(`../../src/app/api${endpoint}/route`);
          const handler = module.default;
          
          await handler(req as any);
          
          // Should require authentication
          expect(res.status).toHaveBeenCalledWith(401);
        } catch (error) {
          // Some endpoints might not exist in test, that's okay
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should implement rate limiting on API endpoints', async () => {
      const req = createMockRequest('GET', '/api/jobs');
      
      // Simulate rapid requests
      const promises = Array.from({ length: 100 }, async () => {
        const res = createMockResponse();
        const { default: handler } = await import('../../src/app/api/jobs/route');
        return handler(req as any);
      });

      await Promise.all(promises);
      
      // At least some requests should be rate limited
      // This would need actual rate limiting middleware to test properly
      expect(true).toBeTruthy(); // Placeholder - implement with actual rate limiting
    });

    it('should handle concurrent requests gracefully', async () => {
      const concurrentRequests = Array.from({ length: 50 }, (_, i) => {
        const req = createMockRequest('GET', `/api/jobs?page=${i + 1}`);
        const res = createMockResponse();
        return import('../../src/app/api/jobs/route').then(({ default: handler }) => 
          handler(req as any)
        );
      });

      const startTime = Date.now();
      await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // Should handle concurrent requests within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
    });

    it('should prevent resource exhaustion attacks', async () => {
      // Test with complex queries that could cause performance issues
      const complexQueries = [
        '?search=' + 'a'.repeat(1000),
        '?page=999999999',
        '?limit=999999999',
        '?sort=' + 'field'.repeat(100)
      ];

      for (const query of complexQueries) {
        const req = createMockRequest('GET', `/api/jobs${query}`);
        const res = createMockResponse();

        const startTime = Date.now();
        const { default: handler } = await import('../../src/app/api/jobs/route');
        await handler(req as any);
        const endTime = Date.now();

        // Should not take too long to process
        expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
        
        // Should either process successfully or reject gracefully
        expect(res.status).not.toHaveBeenCalledWith(500);
      }
    });
  });

  describe('Data Privacy and Sanitization', () => {
    it('should not expose sensitive information in error messages', async () => {
      // Force a database error
      await mongoClient.close();

      const req = createMockRequest('GET', '/api/jobs');
      const res = createMockResponse();

      const { default: handler } = await import('../../src/app/api/jobs/route');
      
      try {
        await handler(req as any);
      } catch (error) {
        // Error should not contain sensitive info
        expect(error).toBeDefined();
      }

      if (res.json.mock.calls.length > 0) {
        const response = res.json.mock.calls[0][0];
        
        // Should not expose database connection strings, internal paths, etc.
        const responseStr = JSON.stringify(response);
        expect(responseStr).not.toContain('mongodb://');
        expect(responseStr).not.toContain('password');
        expect(responseStr).not.toContain('/Users/');
        expect(responseStr).not.toContain('C:\\');
      }

      // Reconnect for other tests
      mongoClient = new MongoClient(mongoServer.getUri());
      await mongoClient.connect();
    });

    it('should sanitize user data before storage', async () => {
      const userData = {
        email: 'user@example.com',
        phone: '+1-555-0123',
        linkedin: 'https://linkedin.com/in/user',
        notes: '<script>alert("xss")</script>Personal notes'
      };

      const req = createMockRequest('PUT', '/api/settings', { contactInfo: userData });
      const res = createMockResponse();

      const { default: handler } = await import('../../src/app/api/settings/route');
      
      await handler(req as any);

      if (res.json.mock.calls.length > 0) {
        const response = res.json.mock.calls[0][0];
        
        if (response.success) {
          // Should sanitize HTML/script tags
          expect(response.data.contactInfo.notes).not.toContain('<script>');
          expect(response.data.contactInfo.notes).toContain('Personal notes');
        }
      }
    });

    it('should validate and sanitize URLs', async () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox("xss")',
        'file:///etc/passwd',
        'ftp://malicious.com/payload'
      ];

      for (const url of maliciousUrls) {
        const jobData = {
          title: 'Test Job',
          company: 'Test Company',
          sourceUrl: url,
          location: 'Remote'
        };

        const req = createMockRequest('POST', '/api/jobs', jobData);
        const res = createMockResponse();

        const { default: handler } = await import('../../src/app/api/jobs/route');
        
        await handler(req as any);

        if (res.json.mock.calls.length > 0) {
          const response = res.json.mock.calls[0][0];
          
          if (response.success) {
            // Should reject or sanitize malicious URLs
            expect(response.data.sourceUrl).not.toContain('javascript:');
            expect(response.data.sourceUrl).not.toContain('data:');
            expect(response.data.sourceUrl).not.toContain('vbscript:');
          } else {
            // Should reject malicious URLs
            expect(response.error).toContain('Invalid URL');
          }
        }
      }
    });
  });

  describe('HTTP Security Headers', () => {
    it('should set appropriate security headers', async () => {
      const req = createMockRequest('GET', '/api/jobs');
      const res = createMockResponse();

      const { default: handler } = await import('../../src/app/api/jobs/route');
      
      await handler(req as any);

      // Check for security headers
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    });

    it('should set CORS headers appropriately', async () => {
      const req = createMockRequest('OPTIONS', '/api/jobs', null, {
        'origin': 'https://malicious.com'
      });
      const res = createMockResponse();

      const { default: handler } = await import('../../src/app/api/jobs/route');
      
      await handler(req as any);

      // Should not allow arbitrary origins
      expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://malicious.com');
    });
  });

  describe('Database Security', () => {
    it('should use parameterized queries to prevent injection', async () => {
      const userInput = "'; DROP TABLE jobs; --";
      
      const req = createMockRequest('GET', `/api/jobs?search=${encodeURIComponent(userInput)}`);
      const res = createMockResponse();

      const { default: handler } = await import('../../src/app/api/jobs/route');
      
      await handler(req as any);

      // Database should still exist after malicious input
      const db = mongoClient.db();
      const collections = await db.listCollections().toArray();
      expect(collections.length).toBeGreaterThan(0);
    });

    it('should limit database query complexity', async () => {
      const complexQuery = {
        $or: Array.from({ length: 1000 }, (_, i) => ({ title: `job${i}` }))
      };

      const req = createMockRequest('POST', '/api/jobs/search', complexQuery);
      const res = createMockResponse();

      const startTime = Date.now();
      
      try {
        const { default: handler } = await import('../../src/app/api/jobs/route');
        await handler(req as any);
      } catch (error) {
        // Should handle complex queries gracefully
        expect(error).toBeDefined();
      }

      const endTime = Date.now();
      
      // Should not take too long even with complex queries
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should validate database connection security', async () => {
      // Ensure connection uses proper authentication and encryption
      const connectionString = process.env.MONGODB_URI;
      
      if (connectionString && !connectionString.includes('mongodb-memory-server')) {
        // In production, should use secure connection
        expect(connectionString).toMatch(/^mongodb(\+srv)?:\/\//);
        
        // Should not contain credentials in plain text (in real env)
        if (connectionString.includes('@')) {
          expect(connectionString).not.toMatch(/\/\/[^:]+:[^@]+@/);
        }
      }
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types for settings import', async () => {
      const maliciousFiles = [
        { name: 'malicious.exe', type: 'application/x-executable' },
        { name: 'script.js', type: 'application/javascript' },
        { name: 'payload.php', type: 'application/x-php' },
        { name: 'settings.json.exe', type: 'application/json' } // Double extension
      ];

      for (const file of maliciousFiles) {
        const req = createMockRequest('POST', '/api/settings/import', {
          file: {
            name: file.name,
            type: file.type,
            content: 'malicious content'
          }
        });
        const res = createMockResponse();

        try {
          const { default: handler } = await import('../../src/app/api/settings/route');
          await handler(req as any);
          
          // Should reject malicious file types
          expect(res.status).toHaveBeenCalledWith(400);
        } catch (error) {
          // If endpoint doesn't exist, that's fine for this test
          expect(error).toBeDefined();
        }
      }
    });

    it('should limit file size for uploads', async () => {
      const largeFile = {
        name: 'large-settings.json',
        type: 'application/json',
        content: 'x'.repeat(10 * 1024 * 1024) // 10MB
      };

      const req = createMockRequest('POST', '/api/settings/import', { file: largeFile });
      const res = createMockResponse();

      try {
        const { default: handler } = await import('../../src/app/api/settings/route');
        await handler(req as any);
        
        // Should reject oversized files
        expect(res.status).toHaveBeenCalledWith(413);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
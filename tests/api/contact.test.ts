import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/contact/route';
import { getDatabase } from '@/lib/mongodb';

// Mock the database
jest.mock('@/lib/mongodb');
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('/api/contact', () => {
  const mockCollection = {
    insertOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockDb = {
    collection: jest.fn(() => mockCollection),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabase.mockResolvedValue(mockDb as any);
  });

  describe('POST /api/contact', () => {
    const validContactData = {
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Tech Corp',
      subject: 'Job Opportunity',
      message: 'I would like to discuss a potential opportunity.',
    };

    it('should submit contact form successfully', async () => {
      mockCollection.insertOne.mockResolvedValue({
        insertedId: '507f1f77bcf86cd799439011',
      });

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        body: JSON.stringify(validContactData),
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 Test Browser',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.submissionId).toBe('507f1f77bcf86cd799439011');
      expect(data.message).toContain('Thank you for your message');

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          company: 'Tech Corp',
          subject: 'Job Opportunity',
          message: 'I would like to discuss a potential opportunity.',
          submittedAt: expect.any(Date),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Test Browser',
        })
      );
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        name: 'John Doe',
        email: 'john@example.com',
        // missing subject and message
      };

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });

    it('should validate email format', async () => {
      const invalidEmailData = {
        ...validContactData,
        email: 'invalid-email',
      };

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        body: JSON.stringify(invalidEmailData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid email format');
    });

    it('should reject messages that are too long', async () => {
      const longMessageData = {
        ...validContactData,
        message: 'x'.repeat(5001), // Exceeds 5000 character limit
      };

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        body: JSON.stringify(longMessageData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Message too long');
    });

    it('should trim whitespace from inputs', async () => {
      const dataWithWhitespace = {
        name: '  John Doe  ',
        email: '  JOHN@EXAMPLE.COM  ',
        company: '  Tech Corp  ',
        subject: '  Job Opportunity  ',
        message: '  I would like to discuss a potential opportunity.  ',
      };

      mockCollection.insertOne.mockResolvedValue({
        insertedId: '507f1f77bcf86cd799439011',
      });

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        body: JSON.stringify(dataWithWhitespace),
      });

      await POST(request);

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com', // Should be lowercase
          company: 'Tech Corp',
          subject: 'Job Opportunity',
          message: 'I would like to discuss a potential opportunity.',
        })
      );
    });

    it('should handle optional company field', async () => {
      const dataWithoutCompany = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Job Opportunity',
        message: 'I would like to discuss a potential opportunity.',
      };

      mockCollection.insertOne.mockResolvedValue({
        insertedId: '507f1f77bcf86cd799439011',
      });

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        body: JSON.stringify(dataWithoutCompany),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle database errors', async () => {
      mockCollection.insertOne.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        body: JSON.stringify(validContactData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to submit contact form');
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to submit contact form');
    });
  });

  describe('GET /api/contact', () => {
    const mockSubmissions = [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Tech Corp',
        subject: 'Job Opportunity',
        message: 'I would like to discuss a potential opportunity.',
        submittedAt: new Date('2024-01-01'),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      },
    ];

    it('should return contact submissions with pagination', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockSubmissions),
      };

      mockCollection.find.mockReturnValue(mockFind);
      mockCollection.countDocuments.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/contact?page=1&limit=20');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.submissions).toEqual(mockSubmissions);
      expect(data.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it('should handle empty submissions', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };

      mockCollection.find.mockReturnValue(mockFind);
      mockCollection.countDocuments.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/contact');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.submissions).toEqual([]);
      expect(data.data.pagination.total).toBe(0);
    });

    it('should handle database errors', async () => {
      mockCollection.find.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost:3000/api/contact');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch contact submissions');
    });
  });
});
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/jobs/route';
import { POST } from '@/app/api/jobs/[id]/status/route';
import { getDatabase } from '@/lib/mongodb';
import { JobPosting } from '@/lib/types';

// Mock the database
jest.mock('@/lib/mongodb');
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('/api/jobs', () => {
  const mockCollection = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockDb = {
    collection: jest.fn(() => mockCollection),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabase.mockResolvedValue(mockDb as any);
  });

  describe('GET /api/jobs', () => {
    const mockJobs: JobPosting[] = [
      {
        _id: '507f1f77bcf86cd799439011',
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        description: 'Great opportunity',
        requirements: ['JavaScript', 'React'],
        benefits: ['Health insurance'],
        jobType: 'full-time',
        remote: true,
        source: 'indeed',
        sourceUrl: 'https://indeed.com/job/123',
        postedDate: new Date('2024-01-01'),
        discoveredDate: new Date('2024-01-02'),
        relevanceScore: 85,
        status: 'new',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    it('should return jobs with pagination', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockJobs),
      };

      mockCollection.find.mockReturnValue(mockFind);
      mockCollection.countDocuments.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/jobs?page=1&limit=20');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.jobs).toEqual(mockJobs);
      expect(data.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it('should filter jobs by status', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockJobs),
      };

      mockCollection.find.mockReturnValue(mockFind);
      mockCollection.countDocuments.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/jobs?status=new');
      await GET(request);

      expect(mockCollection.find).toHaveBeenCalledWith({ status: 'new' });
    });

    it('should filter jobs by multiple criteria', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockJobs),
      };

      mockCollection.find.mockReturnValue(mockFind);
      mockCollection.countDocuments.mockResolvedValue(1);

      const request = new NextRequest(
        'http://localhost:3000/api/jobs?status=new&source=indeed&location=San Francisco&minSalary=80000'
      );
      await GET(request);

      expect(mockCollection.find).toHaveBeenCalledWith({
        status: 'new',
        source: 'indeed',
        location: { $regex: 'San Francisco', $options: 'i' },
        'salary.min': { $gte: 80000 },
      });
    });

    it('should handle database errors', async () => {
      mockCollection.find.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost:3000/api/jobs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch jobs');
    });
  });

  describe('POST /api/jobs/[id]/status', () => {
    it('should update job status successfully', async () => {
      const updatedJob = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        description: 'Great opportunity',
        requirements: ['JavaScript', 'React'],
        benefits: ['Health insurance'],
        jobType: 'full-time' as const,
        remote: true,
        source: 'indeed',
        sourceUrl: 'https://indeed.com/job/123',
        postedDate: new Date('2024-01-01'),
        discoveredDate: new Date('2024-01-02'),
        relevanceScore: 85,
        status: 'applied' as const,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date(),
      };

      mockCollection.findOneAndUpdate.mockResolvedValue(updatedJob);

      const request = new NextRequest('http://localhost:3000/api/jobs/507f1f77bcf86cd799439011/status', {
        method: 'POST',
        body: JSON.stringify({ status: 'applied' }),
      });

      const response = await POST(request, { params: { id: '507f1f77bcf86cd799439011' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('applied');
      expect(data.message).toBe('Job status updated to applied');
    });

    it('should reject invalid status', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/507f1f77bcf86cd799439011/status', {
        method: 'POST',
        body: JSON.stringify({ status: 'invalid' }),
      });

      const response = await POST(request, { params: { id: '507f1f77bcf86cd799439011' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid status');
    });

    it('should reject invalid ObjectId', async () => {
      const request = new NextRequest('http://localhost:3000/api/jobs/invalid-id/status', {
        method: 'POST',
        body: JSON.stringify({ status: 'applied' }),
      });

      const response = await POST(request, { params: { id: 'invalid-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid job ID format');
    });

    it('should handle job not found', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/jobs/507f1f77bcf86cd799439011/status', {
        method: 'POST',
        body: JSON.stringify({ status: 'applied' }),
      });

      const response = await POST(request, { params: { id: '507f1f77bcf86cd799439011' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Job not found');
    });
  });
});
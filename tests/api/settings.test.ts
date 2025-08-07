import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/settings/route';
import { getDatabase } from '@/lib/mongodb';
import { UserSettings } from '@/lib/types';

// Mock the database
jest.mock('@/lib/mongodb');
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('/api/settings', () => {
  const mockCollection = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockDb = {
    collection: jest.fn(() => mockCollection),
  };

  const mockSettings: UserSettings = {
    _id: '507f1f77bcf86cd799439011',
    searchCriteria: {
      jobTitles: ['Software Engineer', 'Frontend Developer'],
      keywords: ['React', 'TypeScript'],
      locations: ['San Francisco', 'Remote'],
      remoteOk: true,
      salaryRange: {
        min: 80000,
        max: 150000,
      },
      industries: ['Technology', 'Fintech'],
      experienceLevel: 'mid',
    },
    contactInfo: {
      email: 'test@example.com',
      phone: '+1-555-0123',
      linkedin: 'https://linkedin.com/in/test',
      portfolio: 'https://portfolio.com',
    },
    agentSchedule: {
      frequency: 'daily',
      enabled: true,
    },
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabase.mockResolvedValue(mockDb as any);
  });

  describe('GET /api/settings', () => {
    it('should return user settings', async () => {
      mockCollection.findOne.mockResolvedValue(mockSettings);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSettings);
    });

    it('should return null when no settings exist', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeNull();
    });

    it('should handle database errors', async () => {
      mockCollection.findOne.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch settings');
    });
  });

  describe('PUT /api/settings', () => {
    const updateData = {
      searchCriteria: {
        jobTitles: ['Senior Software Engineer'],
        keywords: ['React', 'Node.js'],
        locations: ['New York'],
        remoteOk: false,
        salaryRange: {
          min: 100000,
          max: 180000,
        },
        industries: ['Technology'],
        experienceLevel: 'senior' as const,
      },
    };

    it('should update settings successfully', async () => {
      const updatedSettings = {
        ...mockSettings,
        ...updateData,
        updatedAt: new Date(),
      };

      mockCollection.findOneAndUpdate.mockResolvedValue(updatedSettings);

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.searchCriteria.jobTitles).toEqual(['Senior Software Engineer']);
      expect(data.message).toBe('Settings updated successfully');
    });

    it('should create new settings if none exist (upsert)', async () => {
      const newSettings = {
        ...updateData,
        updatedAt: expect.any(Date),
      };

      mockCollection.findOneAndUpdate.mockResolvedValue(newSettings);

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        {},
        { $set: expect.objectContaining(updateData) },
        { upsert: true, returnDocument: 'after' }
      );
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        agentSchedule: {
          frequency: 'weekly' as const,
          enabled: false,
        },
      };

      const updatedSettings = {
        ...mockSettings,
        ...partialUpdate,
        updatedAt: new Date(),
      };

      mockCollection.findOneAndUpdate.mockResolvedValue(updatedSettings);

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: JSON.stringify(partialUpdate),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.agentSchedule.frequency).toBe('weekly');
      expect(data.data.agentSchedule.enabled).toBe(false);
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: 'invalid json',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update settings');
    });

    it('should handle database errors', async () => {
      mockCollection.findOneAndUpdate.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update settings');
    });
  });
});
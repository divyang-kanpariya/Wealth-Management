import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/goals/route';
import { GET as GET_BY_ID, PUT, DELETE } from '@/app/api/goals/[id]/route';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    goal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    investment: {
      updateMany: jest.fn(),
    },
  },
}));

describe('Goals API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/goals', () => {
    it('returns all goals', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          name: 'Retirement',
          targetAmount: 1000000,
          targetDate: new Date('2040-01-01'),
          priority: 1,
          description: 'Save for retirement',
          createdAt: new Date(),
          updatedAt: new Date(),
          investments: [],
        },
      ];

      (prisma.goal.findMany as jest.Mock).mockResolvedValue(mockGoals);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockGoals);
      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        include: {
          investments: true,
        },
        orderBy: {
          targetDate: 'asc',
        },
      });
    });

    it('handles errors', async () => {
      (prisma.goal.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/goals', () => {
    it('creates a new goal', async () => {
      const mockGoal = {
        id: 'goal-1',
        name: 'Retirement',
        targetAmount: 1000000,
        targetDate: new Date('2040-01-01'),
        priority: 1,
        description: 'Save for retirement',
        createdAt: new Date(),
        updatedAt: new Date(),
        investments: [],
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: 'Retirement',
          targetAmount: 1000000,
          targetDate: '2040-01-01',
          priority: 1,
          description: 'Save for retirement',
        }),
      } as unknown as NextRequest;

      (prisma.goal.create as jest.Mock).mockResolvedValue(mockGoal);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockGoal);
      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Retirement',
          targetAmount: 1000000,
          targetDate: expect.any(Date),
        }),
        include: {
          investments: true,
        },
      });
    });

    it('handles validation errors', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          // Missing required fields
          name: '',
          targetAmount: -100,
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation error');
    });
  });

  describe('GET /api/goals/[id]', () => {
    it('returns a specific goal', async () => {
      const mockGoal = {
        id: 'goal-1',
        name: 'Retirement',
        targetAmount: 1000000,
        targetDate: new Date('2040-01-01'),
        priority: 1,
        description: 'Save for retirement',
        createdAt: new Date(),
        updatedAt: new Date(),
        investments: [],
      };

      (prisma.goal.findUnique as jest.Mock).mockResolvedValue(mockGoal);

      const response = await GET_BY_ID({} as NextRequest, { params: { id: 'goal-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockGoal);
      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        include: {
          investments: {
            include: {
              account: true,
            },
          },
        },
      });
    });

    it('returns 404 when goal not found', async () => {
      (prisma.goal.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await GET_BY_ID({} as NextRequest, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Goal not found');
    });
  });

  describe('PUT /api/goals/[id]', () => {
    it('updates a goal', async () => {
      const mockGoal = {
        id: 'goal-1',
        name: 'Updated Retirement',
        targetAmount: 1200000,
        targetDate: new Date('2045-01-01'),
        priority: 2,
        description: 'Updated description',
        createdAt: new Date(),
        updatedAt: new Date(),
        investments: [],
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: 'Updated Retirement',
          targetAmount: 1200000,
          targetDate: '2045-01-01',
          priority: 2,
          description: 'Updated description',
        }),
      } as unknown as NextRequest;

      (prisma.goal.findUnique as jest.Mock).mockResolvedValue({ id: 'goal-1' });
      (prisma.goal.update as jest.Mock).mockResolvedValue(mockGoal);

      const response = await PUT(mockRequest, { params: { id: 'goal-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockGoal);
      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: expect.objectContaining({
          name: 'Updated Retirement',
          targetAmount: 1200000,
        }),
        include: {
          investments: true,
        },
      });
    });

    it('returns 404 when goal not found', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: 'Updated Retirement',
        }),
      } as unknown as NextRequest;

      (prisma.goal.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await PUT(mockRequest, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Goal not found');
    });
  });

  describe('DELETE /api/goals/[id]', () => {
    it('deletes a goal and updates linked investments', async () => {
      const mockGoal = {
        id: 'goal-1',
        name: 'Retirement',
        investments: [
          { id: 'inv-1', goalId: 'goal-1' },
          { id: 'inv-2', goalId: 'goal-1' },
        ],
      };

      (prisma.goal.findUnique as jest.Mock).mockResolvedValue(mockGoal);
      (prisma.investment.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.goal.delete as jest.Mock).mockResolvedValue(mockGoal);

      const response = await DELETE({} as NextRequest, { params: { id: 'goal-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message', 'Goal deleted successfully');
      
      // Check that investments were updated
      expect(prisma.investment.updateMany).toHaveBeenCalledWith({
        where: { goalId: 'goal-1' },
        data: { goalId: null },
      });
      
      // Check that goal was deleted
      expect(prisma.goal.delete).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
      });
    });

    it('returns 404 when goal not found', async () => {
      (prisma.goal.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await DELETE({} as NextRequest, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Goal not found');
    });

    it('deletes a goal with no linked investments', async () => {
      const mockGoal = {
        id: 'goal-1',
        name: 'Retirement',
        investments: [],
      };

      (prisma.goal.findUnique as jest.Mock).mockResolvedValue(mockGoal);
      (prisma.goal.delete as jest.Mock).mockResolvedValue(mockGoal);

      const response = await DELETE({} as NextRequest, { params: { id: 'goal-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message', 'Goal deleted successfully');
      
      // Check that investment update was not called
      expect(prisma.investment.updateMany).not.toHaveBeenCalled();
      
      // Check that goal was deleted
      expect(prisma.goal.delete).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
      });
    });
  });
});
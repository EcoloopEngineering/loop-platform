import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, PrismaHealthIndicator, DiskHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock.helper';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };

  beforeEach(async () => {
    healthCheckService = {
      check: jest.fn().mockImplementation((indicators: (() => Promise<any>)[]) =>
        Promise.all(indicators.map((fn) => fn())).then(() => ({
          status: 'ok',
          info: { database: { status: 'up' } },
        })),
      ),
    };

    const prismaHealth = {
      pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
    };

    const diskHealth = {
      checkStorage: jest.fn().mockResolvedValue({ disk: { status: 'up' } }),
    };

    const memoryHealth = {
      checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: PrismaHealthIndicator, useValue: prismaHealth },
        { provide: DiskHealthIndicator, useValue: diskHealth },
        { provide: MemoryHealthIndicator, useValue: memoryHealth },
        { provide: PrismaService, useValue: createMockPrismaService() },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  describe('check()', () => {
    it('returns full health check result', async () => {
      const result = await controller.check();
      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('handles health check failure', async () => {
      healthCheckService.check.mockRejectedValue(new Error('DB down'));
      await expect(controller.check()).rejects.toThrow('DB down');
    });
  });

  describe('ready()', () => {
    it('returns readiness status', async () => {
      const result = await controller.ready();
      expect(result.status).toBe('ok');
    });
  });

  describe('live()', () => {
    it('returns liveness status with uptime', () => {
      const result = controller.live();
      expect(result.status).toBe('ok');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });
  });
});

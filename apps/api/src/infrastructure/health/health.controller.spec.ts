import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock.helper';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;

  beforeEach(async () => {
    const prisma = createMockPrismaService();
    (prisma as any).$queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

    healthCheckService = {
      check: jest.fn().mockResolvedValue({ status: 'ok', details: {} }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: PrismaHealthIndicator, useValue: { pingCheck: jest.fn() } },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('check() returns health status', async () => {
    const result = await controller.check();
    expect(result).toEqual({ status: 'ok', details: {} });
    expect(healthCheckService.check).toHaveBeenCalled();
  });

  it('ready() returns ok when DB is accessible', async () => {
    const result = await controller.ready();
    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
  });

  it('live() returns uptime and memory', () => {
    const result = controller.live();
    expect(result.status).toBe('ok');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(result.memory).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });
});

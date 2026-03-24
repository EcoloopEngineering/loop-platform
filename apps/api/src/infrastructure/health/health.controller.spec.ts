import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock.helper';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const prisma = createMockPrismaService();
    (prisma as any).$queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('check() returns ok when DB connected', async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
  });

  it('ready() returns ok', async () => {
    const result = await controller.ready();
    expect(result.status).toBe('ok');
  });

  it('live() returns uptime', () => {
    const result = controller.live();
    expect(result.status).toBe('ok');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });
});

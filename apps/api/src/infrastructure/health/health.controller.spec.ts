import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock.helper';

describe('HealthController', () => {
  let controller: HealthController;
  let queryRawMock: jest.Mock;

  beforeEach(async () => {
    const prisma = createMockPrismaService();
    queryRawMock = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    (prisma as any).$queryRaw = queryRawMock;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get(HealthController);
  });

  describe('check()', () => {
    it('returns status ok and database connected when DB is reachable', async () => {
      const result = await controller.check();
      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
      expect(result.timestamp).toBeDefined();
    });

    it('returns status error and database disconnected when DB query fails', async () => {
      queryRawMock.mockRejectedValue(new Error('connection refused'));
      const result = await controller.check();
      expect(result.status).toBe('error');
      expect(result.database).toBe('disconnected');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('ready()', () => {
    it('returns status ok when DB is reachable', async () => {
      const result = await controller.ready();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });

    it('returns status error when DB query fails', async () => {
      queryRawMock.mockRejectedValue(new Error('connection refused'));
      const result = await controller.ready();
      expect(result.status).toBe('error');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('live()', () => {
    it('returns status ok with uptime', () => {
      const result = controller.live();
      expect(result.status).toBe('ok');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });
  });
});

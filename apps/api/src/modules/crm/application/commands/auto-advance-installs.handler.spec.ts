import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AutoAdvanceInstallsHandler } from './auto-advance-installs.handler';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('AutoAdvanceInstallsHandler', () => {
  let handler: AutoAdvanceInstallsHandler;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AutoAdvanceInstallsHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    handler = module.get(AutoAdvanceInstallsHandler);
  });

  it('should advance leads with matching scheduleDate to COMMISSION', async () => {
    const today = new Date().toISOString().split('T')[0];

    prisma.lead.findMany.mockResolvedValue([
      {
        id: 'lead-1',
        currentStage: 'INSTALL',
        createdById: 'user-1',
        metadata: { scheduleDate: today },
        customer: { firstName: 'John', lastName: 'Doe' },
      },
    ]);
    prisma.lead.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const count = await handler.advanceInstalls();

    expect(count).toBe(1);
    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { currentStage: 'COMMISSION' },
    });
    expect(emitter.emit).toHaveBeenCalledWith(
      'lead.stageChanged',
      expect.objectContaining({
        leadId: 'lead-1',
        previousStage: 'INSTALL',
        newStage: 'COMMISSION',
      }),
    );
  });

  it('should not advance leads whose scheduleDate does not match today', async () => {
    prisma.lead.findMany.mockResolvedValue([
      {
        id: 'lead-2',
        currentStage: 'INSTALL',
        createdById: 'user-1',
        metadata: { scheduleDate: '2025-01-01' },
        customer: { firstName: 'Jane', lastName: 'Doe' },
      },
    ]);

    const count = await handler.advanceInstalls();

    expect(count).toBe(0);
    expect(prisma.lead.update).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('should not advance leads without metadata.scheduleDate', async () => {
    prisma.lead.findMany.mockResolvedValue([
      {
        id: 'lead-3',
        currentStage: 'INSTALL',
        createdById: 'user-1',
        metadata: null,
        customer: { firstName: 'Bob', lastName: 'Smith' },
      },
    ]);

    const count = await handler.advanceInstalls();

    expect(count).toBe(0);
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it('should handle multiple leads and advance only matching ones', async () => {
    const today = new Date().toISOString().split('T')[0];

    prisma.lead.findMany.mockResolvedValue([
      {
        id: 'lead-a',
        currentStage: 'INSTALL',
        createdById: 'user-1',
        metadata: { scheduleDate: today },
        customer: { firstName: 'A', lastName: 'User' },
      },
      {
        id: 'lead-b',
        currentStage: 'INSTALL',
        createdById: 'user-2',
        metadata: { scheduleDate: '2020-01-01' },
        customer: { firstName: 'B', lastName: 'User' },
      },
      {
        id: 'lead-c',
        currentStage: 'INSTALL',
        createdById: 'user-3',
        metadata: { scheduleDate: today },
        customer: { firstName: 'C', lastName: 'User' },
      },
    ]);
    prisma.lead.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const count = await handler.advanceInstalls();

    expect(count).toBe(2);
    expect(prisma.lead.update).toHaveBeenCalledTimes(2);
    expect(emitter.emit).toHaveBeenCalledTimes(2);
  });

  it('should return 0 when no leads match', async () => {
    prisma.lead.findMany.mockResolvedValue([]);

    const count = await handler.advanceInstalls();

    expect(count).toBe(0);
  });
});

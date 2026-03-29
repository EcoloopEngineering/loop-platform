import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarkLeadCancelledCommand, MarkLeadCancelledHandler } from './mark-lead-cancelled.command';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('MarkLeadCancelledHandler', () => {
  let handler: MarkLeadCancelledHandler;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkLeadCancelledHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    handler = module.get(MarkLeadCancelledHandler);
  });

  it('should mark lead as cancelled, log activity, and emit statusChanged', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      currentStage: 'SIT',
      customer: { firstName: 'Alice', lastName: 'Smith' },
    });
    prisma.lead.update.mockResolvedValue({ id: 'lead-1', status: 'CANCELLED' });
    prisma.leadActivity.create.mockResolvedValue({});

    const command = new MarkLeadCancelledCommand('lead-1', 'Customer request', 'user-1');
    await handler.execute(command);

    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) }),
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      'lead.statusChanged',
      expect.objectContaining({ newStatus: 'CANCELLED', leadId: 'lead-1' }),
    );
  });

  it('should throw NotFoundException when lead not found', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);

    const command = new MarkLeadCancelledCommand('bad-id', undefined, 'user-1');
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});

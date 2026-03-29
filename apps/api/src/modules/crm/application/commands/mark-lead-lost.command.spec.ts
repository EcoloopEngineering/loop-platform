import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarkLeadLostCommand, MarkLeadLostHandler } from './mark-lead-lost.command';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('MarkLeadLostHandler', () => {
  let handler: MarkLeadLostHandler;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkLeadLostHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    handler = module.get(MarkLeadLostHandler);
  });

  it('should mark lead as lost, log activity, and emit statusChanged', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      currentStage: 'DESIGN_READY',
      customer: { firstName: 'John', lastName: 'Doe' },
    });
    prisma.lead.update.mockResolvedValue({ id: 'lead-1', status: 'LOST' });
    prisma.leadActivity.create.mockResolvedValue({});

    const command = new MarkLeadLostCommand('lead-1', 'No budget', 'user-1');
    await handler.execute(command);

    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'LOST' }) }),
    );
    expect(prisma.leadActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: 'Lead marked as LOST: No budget' }),
      }),
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      'lead.statusChanged',
      expect.objectContaining({ newStatus: 'LOST', leadId: 'lead-1' }),
    );
  });

  it('should work without a reason', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      currentStage: 'NEW_LEAD',
      customer: { firstName: 'Jane', lastName: 'Doe' },
    });
    prisma.lead.update.mockResolvedValue({ id: 'lead-1', status: 'LOST' });
    prisma.leadActivity.create.mockResolvedValue({});

    const command = new MarkLeadLostCommand('lead-1', undefined, 'user-1');
    await handler.execute(command);

    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lostReason: null }) }),
    );
  });

  it('should throw NotFoundException when lead not found', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);

    const command = new MarkLeadLostCommand('bad-id', undefined, 'user-1');
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});

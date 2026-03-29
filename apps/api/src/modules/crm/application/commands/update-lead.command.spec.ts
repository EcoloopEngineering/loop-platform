import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateLeadCommand, UpdateLeadHandler } from './update-lead.command';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('UpdateLeadHandler', () => {
  let handler: UpdateLeadHandler;
  let leadRepo: Record<string, jest.Mock>;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    leadRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLeadHandler,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    handler = module.get<UpdateLeadHandler>(UpdateLeadHandler);
  });

  it('should update lead and emit lead.updated event', async () => {
    leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
    leadRepo.update.mockResolvedValue({ id: 'lead-1', source: 'WEB' });
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      customer: { firstName: 'John', lastName: 'Doe' },
    });
    prisma.user.findUnique.mockResolvedValue({ firstName: 'Agent', lastName: 'Smith' });

    const command = new UpdateLeadCommand('lead-1', { source: 'WEB' } as any, 'user-1');
    const result = await handler.execute(command);

    expect(leadRepo.update).toHaveBeenCalledWith('lead-1', { source: 'WEB' });
    expect(emitter.emit).toHaveBeenCalledWith('lead.updated', {
      leadId: 'lead-1',
      customerName: 'John Doe',
      updatedByName: 'Agent Smith',
      changes: 'source',
    });
    expect(result).toEqual({ id: 'lead-1', source: 'WEB' });
  });

  it('should throw NotFoundException when lead not found', async () => {
    leadRepo.findById.mockResolvedValue(null);

    const command = new UpdateLeadCommand('bad-id', {}, 'user-1');
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should not emit event when lead or user lookup returns null', async () => {
    leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
    leadRepo.update.mockResolvedValue({ id: 'lead-1' });
    prisma.lead.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);

    const command = new UpdateLeadCommand('lead-1', { kw: 10 } as any, 'user-1');
    await handler.execute(command);

    expect(emitter.emit).not.toHaveBeenCalled();
  });
});

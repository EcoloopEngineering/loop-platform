import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarkLeadLostCommand, MarkLeadLostHandler } from './mark-lead-lost.command';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';

describe('MarkLeadLostHandler', () => {
  let handler: MarkLeadLostHandler;
  let leadRepo: Record<string, jest.Mock>;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    leadRepo = {
      findByIdWithCustomerName: jest.fn(),
      updateStatus: jest.fn(),
      createActivity: jest.fn().mockResolvedValue({}),
    };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkLeadLostHandler,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    handler = module.get(MarkLeadLostHandler);
  });

  it('should mark lead as lost, log activity, and emit statusChanged', async () => {
    leadRepo.findByIdWithCustomerName.mockResolvedValue({
      id: 'lead-1',
      currentStage: 'DESIGN_READY',
      customer: { firstName: 'John', lastName: 'Doe' },
    });
    leadRepo.updateStatus.mockResolvedValue({ id: 'lead-1', status: 'LOST' });

    const command = new MarkLeadLostCommand('lead-1', 'No budget', 'user-1');
    await handler.execute(command);

    expect(leadRepo.updateStatus).toHaveBeenCalledWith('lead-1', expect.objectContaining({ status: 'LOST' }));
    expect(leadRepo.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Lead marked as LOST: No budget',
      }),
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      'lead.statusChanged',
      expect.objectContaining({ newStatus: 'LOST', leadId: 'lead-1' }),
    );
  });

  it('should work without a reason', async () => {
    leadRepo.findByIdWithCustomerName.mockResolvedValue({
      id: 'lead-1',
      currentStage: 'NEW_LEAD',
      customer: { firstName: 'Jane', lastName: 'Doe' },
    });
    leadRepo.updateStatus.mockResolvedValue({ id: 'lead-1', status: 'LOST' });

    const command = new MarkLeadLostCommand('lead-1', undefined, 'user-1');
    await handler.execute(command);

    expect(leadRepo.updateStatus).toHaveBeenCalledWith('lead-1', expect.objectContaining({ lostReason: null }));
  });

  it('should throw NotFoundException when lead not found', async () => {
    leadRepo.findByIdWithCustomerName.mockResolvedValue(null);

    const command = new MarkLeadLostCommand('bad-id', undefined, 'user-1');
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarkLeadCancelledCommand, MarkLeadCancelledHandler } from './mark-lead-cancelled.command';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';

describe('MarkLeadCancelledHandler', () => {
  let handler: MarkLeadCancelledHandler;
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
        MarkLeadCancelledHandler,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    handler = module.get(MarkLeadCancelledHandler);
  });

  it('should mark lead as cancelled, log activity, and emit statusChanged', async () => {
    leadRepo.findByIdWithCustomerName.mockResolvedValue({
      id: 'lead-1',
      currentStage: 'SIT',
      customer: { firstName: 'Alice', lastName: 'Smith' },
    });
    leadRepo.updateStatus.mockResolvedValue({ id: 'lead-1', status: 'CANCELLED' });

    const command = new MarkLeadCancelledCommand('lead-1', 'Customer request', 'user-1');
    await handler.execute(command);

    expect(leadRepo.updateStatus).toHaveBeenCalledWith('lead-1', expect.objectContaining({ status: 'CANCELLED' }));
    expect(emitter.emit).toHaveBeenCalledWith(
      'lead.statusChanged',
      expect.objectContaining({ newStatus: 'CANCELLED', leadId: 'lead-1' }),
    );
  });

  it('should throw NotFoundException when lead not found', async () => {
    leadRepo.findByIdWithCustomerName.mockResolvedValue(null);

    const command = new MarkLeadCancelledCommand('bad-id', undefined, 'user-1');
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadStage } from '@loop/shared';
import { ChangeLeadStageCommand, ChangeLeadStageHandler } from './change-lead-stage.command';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';

describe('ChangeLeadStageHandler', () => {
  let handler: ChangeLeadStageHandler;
  let leadRepo: Record<string, jest.Mock>;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    leadRepo = {
      findById: jest.fn(),
      updateStage: jest.fn(),
      createActivity: jest.fn().mockResolvedValue({}),
      findByIdWithCustomer: jest.fn(),
    };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeLeadStageHandler,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    handler = module.get(ChangeLeadStageHandler);
  });

  it('should change stage, log activity, and emit event', async () => {
    leadRepo.findById.mockResolvedValue({ id: 'lead-1', currentStage: 'NEW_LEAD' });
    leadRepo.updateStage.mockResolvedValue({ id: 'lead-1', currentStage: 'REQUEST_DESIGN' });
    leadRepo.findByIdWithCustomer.mockResolvedValue({
      id: 'lead-1',
      customer: { firstName: 'John', lastName: 'Doe' },
    });

    const command = new ChangeLeadStageCommand('lead-1', LeadStage.REQUEST_DESIGN, 'user-1');
    await handler.execute(command);

    expect(leadRepo.updateStage).toHaveBeenCalledWith('lead-1', LeadStage.REQUEST_DESIGN);
    expect(leadRepo.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'STAGE_CHANGE', leadId: 'lead-1' }),
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      'lead.stageChanged',
      expect.objectContaining({ leadId: 'lead-1', newStage: LeadStage.REQUEST_DESIGN }),
    );
  });

  it('should throw NotFoundException when lead not found', async () => {
    leadRepo.findById.mockResolvedValue(null);

    const command = new ChangeLeadStageCommand('bad-id', LeadStage.REQUEST_DESIGN, 'user-1');
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});

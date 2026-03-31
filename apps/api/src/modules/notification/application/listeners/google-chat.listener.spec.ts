import { Test, TestingModule } from '@nestjs/testing';
import { GoogleChatListener } from './google-chat.listener';
import { GoogleChatNotificationService } from '../services/google-chat-notification.service';

describe('GoogleChatListener', () => {
  let listener: GoogleChatListener;
  let service: {
    handleLeadCreated: jest.Mock;
    handleStageChanged: jest.Mock;
    handleNoteAdded: jest.Mock;
    handlePMAssigned: jest.Mock;
    handleScoreboard: jest.Mock;
    handlePmPipelineEntry: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      handleLeadCreated: jest.fn().mockResolvedValue(undefined),
      handleStageChanged: jest.fn().mockResolvedValue(undefined),
      handleNoteAdded: jest.fn().mockResolvedValue(undefined),
      handlePMAssigned: jest.fn().mockResolvedValue(undefined),
      handleScoreboard: jest.fn().mockResolvedValue(undefined),
      handlePmPipelineEntry: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleChatListener,
        { provide: GoogleChatNotificationService, useValue: service },
      ],
    }).compile();

    listener = module.get(GoogleChatListener);
  });

  it('delegates handleLeadCreated to service', async () => {
    const payload = { leadId: '1', assignedTo: 'u1', customerName: 'Test' };
    await listener.handleLeadCreated(payload);
    expect(service.handleLeadCreated).toHaveBeenCalledWith(payload);
  });

  it('delegates handleStageChanged to service', async () => {
    const payload = { leadId: '1', customerName: 'Test', previousStage: 'NEW_LEAD', newStage: 'WON' };
    await listener.handleStageChanged(payload);
    expect(service.handleStageChanged).toHaveBeenCalledWith(payload);
  });

  it('delegates handleNoteAdded to service', async () => {
    const payload = { leadId: '1', customerName: 'Test', addedByName: 'Rafael', notePreview: 'Note' };
    await listener.handleNoteAdded(payload);
    expect(service.handleNoteAdded).toHaveBeenCalledWith(payload);
  });

  it('delegates handlePMAssigned to service', async () => {
    const payload = { leadId: '1', pmName: 'Bob', customerName: 'Test' };
    await listener.handlePMAssigned(payload);
    expect(service.handlePMAssigned).toHaveBeenCalledWith(payload);
  });

  it('delegates handlePmPipelineEntry on SITE_AUDIT stage', async () => {
    const payload = {
      leadId: '1',
      customerName: 'Test',
      previousStage: 'DESIGN_READY',
      newStage: 'SITE_AUDIT',
    };
    await listener.handleStageChanged(payload);
    expect(service.handleStageChanged).toHaveBeenCalledWith(payload);
    expect(service.handlePmPipelineEntry).toHaveBeenCalledWith(payload);
  });

  it('does not call handlePmPipelineEntry for non-SITE_AUDIT stages', async () => {
    const payload = {
      leadId: '1',
      customerName: 'Test',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    };
    await listener.handleStageChanged(payload);
    expect(service.handleStageChanged).toHaveBeenCalledWith(payload);
    expect(service.handlePmPipelineEntry).not.toHaveBeenCalled();
  });

  it('catches errors without rethrowing', async () => {
    service.handleLeadCreated.mockRejectedValue(new Error('API error'));
    await expect(
      listener.handleLeadCreated({ leadId: '1', assignedTo: 'u1', customerName: 'Test' }),
    ).resolves.toBeUndefined();
  });
});

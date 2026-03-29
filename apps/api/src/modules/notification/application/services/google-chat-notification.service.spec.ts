import { Test, TestingModule } from '@nestjs/testing';
import { GoogleChatNotificationService } from './google-chat-notification.service';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';
import { NOTIFICATION_REPOSITORY } from '../ports/notification.repository.port';

describe('GoogleChatNotificationService', () => {
  let service: GoogleChatNotificationService;
  let notificationRepo: {
    findLeadWithStakeholders: jest.Mock;
    findLeadMetadata: jest.Mock;
    findLeadWithPrimaryAssignment: jest.Mock;
    updateLeadMetadata: jest.Mock;
  };
  let chatService: {
    isConfigured: jest.Mock;
    createSpace: jest.Mock;
    sendMessage: jest.Mock;
    sendCard: jest.Mock;
  };

  beforeEach(async () => {
    notificationRepo = {
      findLeadWithStakeholders: jest.fn(),
      findLeadMetadata: jest.fn(),
      findLeadWithPrimaryAssignment: jest.fn(),
      updateLeadMetadata: jest.fn().mockResolvedValue(undefined),
    };
    chatService = {
      isConfigured: jest.fn().mockReturnValue(true),
      createSpace: jest.fn().mockResolvedValue({ spaceName: 'spaces/abc', displayName: 'Test' }),
      sendMessage: jest.fn().mockResolvedValue(undefined),
      sendCard: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleChatNotificationService,
        { provide: NOTIFICATION_REPOSITORY, useValue: notificationRepo },
        { provide: GoogleChatService, useValue: chatService },
      ],
    }).compile();

    service = module.get(GoogleChatNotificationService);
  });

  describe('handleLeadCreated', () => {
    it('creates space and saves metadata', async () => {
      notificationRepo.findLeadWithStakeholders.mockResolvedValue({
        id: '1',
        metadata: {},
        property: { streetAddress: '123 Main', city: 'Miami', state: 'FL' },
        assignments: [{ user: { email: 'rep@ecoloop.us' } }],
        projectManager: { email: 'pm@ecoloop.us' },
      });

      await service.handleLeadCreated({ leadId: '1', assignedTo: 'u1', customerName: 'John Doe' });

      expect(chatService.createSpace).toHaveBeenCalledWith({
        displayName: 'John Doe | 123 Main, Miami, FL',
        members: ['rep@ecoloop.us', 'pm@ecoloop.us'],
      });
      expect(notificationRepo.updateLeadMetadata).toHaveBeenCalledWith('1', {
        googleChatSpaceName: 'spaces/abc',
      });
    });

    it('skips when not configured', async () => {
      chatService.isConfigured.mockReturnValue(false);
      await service.handleLeadCreated({ leadId: '1', assignedTo: 'u1', customerName: 'Test' });
      expect(notificationRepo.findLeadWithStakeholders).not.toHaveBeenCalled();
    });

    it('skips when lead not found', async () => {
      notificationRepo.findLeadWithStakeholders.mockResolvedValue(null);
      await service.handleLeadCreated({ leadId: '1', assignedTo: 'u1', customerName: 'Test' });
      expect(chatService.createSpace).not.toHaveBeenCalled();
    });
  });

  describe('handleStageChanged', () => {
    it('sends message to space', async () => {
      notificationRepo.findLeadMetadata.mockResolvedValue({
        metadata: { googleChatSpaceName: 'spaces/abc' },
      });

      await service.handleStageChanged({
        leadId: '1',
        customerName: 'Test',
        previousStage: 'NEW_LEAD',
        newStage: 'DESIGN_READY',
      });

      expect(chatService.sendMessage).toHaveBeenCalledWith(
        'spaces/abc',
        expect.stringContaining('New Lead'),
      );
    });

    it('skips when no space name', async () => {
      notificationRepo.findLeadMetadata.mockResolvedValue({ metadata: {} });

      await service.handleStageChanged({
        leadId: '1',
        customerName: 'Test',
        previousStage: 'NEW_LEAD',
        newStage: 'WON',
      });

      expect(chatService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('handleNoteAdded', () => {
    it('sends note to space', async () => {
      notificationRepo.findLeadMetadata.mockResolvedValue({
        metadata: { googleChatSpaceName: 'spaces/abc' },
      });

      await service.handleNoteAdded({
        leadId: '1',
        customerName: 'Test',
        addedByName: 'Rafael',
        notePreview: 'Call scheduled',
      });

      expect(chatService.sendMessage).toHaveBeenCalledWith(
        'spaces/abc',
        expect.stringContaining('Rafael'),
      );
    });
  });

  describe('handlePMAssigned', () => {
    it('sends PM assignment to space', async () => {
      notificationRepo.findLeadMetadata.mockResolvedValue({
        metadata: { googleChatSpaceName: 'spaces/abc' },
      });

      await service.handlePMAssigned({
        leadId: '1',
        pmName: 'Bob',
        customerName: 'Test',
      });

      expect(chatService.sendMessage).toHaveBeenCalledWith(
        'spaces/abc',
        expect.stringContaining('Bob'),
      );
    });
  });

  describe('handleScoreboard', () => {
    it('sends card for milestone stages', async () => {
      const originalEnv = process.env.GOOGLE_CHAT_SCOREBOARD_SPACE;
      process.env.GOOGLE_CHAT_SCOREBOARD_SPACE = 'spaces/scoreboard';

      notificationRepo.findLeadWithPrimaryAssignment.mockResolvedValue({
        id: '1',
        assignments: [
          { isPrimary: true, user: { firstName: 'Jane', lastName: 'Doe' } },
        ],
      });

      await service.handleScoreboard({
        leadId: '1',
        customerName: 'Test Customer',
        newStage: 'WON',
      });

      expect(chatService.sendCard).toHaveBeenCalledWith(
        'spaces/scoreboard',
        expect.stringContaining('Won'),
        'Test Customer',
        expect.arrayContaining([
          expect.objectContaining({ label: 'Sales Rep', value: 'Jane Doe' }),
        ]),
      );

      process.env.GOOGLE_CHAT_SCOREBOARD_SPACE = originalEnv;
    });

    it('skips for non-milestone stages', async () => {
      await service.handleScoreboard({
        leadId: '1',
        customerName: 'Test',
        newStage: 'DESIGN_IN_PROGRESS',
      });

      expect(notificationRepo.findLeadWithPrimaryAssignment).not.toHaveBeenCalled();
    });
  });
});

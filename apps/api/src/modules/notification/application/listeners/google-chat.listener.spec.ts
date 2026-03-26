import { Test, TestingModule } from '@nestjs/testing';
import { GoogleChatListener } from './google-chat.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('GoogleChatListener', () => {
  let listener: GoogleChatListener;
  let prisma: MockPrismaService;
  let chatService: { isConfigured: jest.Mock; createSpace: jest.Mock; sendMessage: jest.Mock; sendCard: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    chatService = {
      isConfigured: jest.fn().mockReturnValue(true),
      createSpace: jest.fn().mockResolvedValue({ spaceName: 'spaces/abc', displayName: 'Test' }),
      sendMessage: jest.fn().mockResolvedValue(undefined),
      sendCard: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleChatListener,
        { provide: PrismaService, useValue: prisma },
        { provide: GoogleChatService, useValue: chatService },
      ],
    }).compile();

    listener = module.get(GoogleChatListener);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleLeadCreated', () => {
    it('skips when not configured', async () => {
      chatService.isConfigured.mockReturnValue(false);
      await listener.handleLeadCreated({ leadId: '1', assignedTo: 'u1', customerName: 'Test' });
      expect(chatService.createSpace).not.toHaveBeenCalled();
    });

    it('creates space and saves to metadata', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        id: '1',
        metadata: {},
        property: { streetAddress: '123 Main', city: 'Miami', state: 'FL' },
        assignments: [{ user: { email: 'rep@ecoloop.us' } }],
        projectManager: { email: 'pm@ecoloop.us' },
      });
      prisma.lead.update.mockResolvedValue({});

      await listener.handleLeadCreated({ leadId: '1', assignedTo: 'u1', customerName: 'John Doe' });

      expect(chatService.createSpace).toHaveBeenCalledWith({
        displayName: 'John Doe | 123 Main, Miami, FL',
        members: ['rep@ecoloop.us', 'pm@ecoloop.us'],
      });
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { metadata: { googleChatSpaceName: 'spaces/abc' } },
      });
    });
  });

  describe('handleStageChanged', () => {
    it('sends message to space', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        metadata: { googleChatSpaceName: 'spaces/abc' },
      });

      await listener.handleStageChanged({
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
      prisma.lead.findUnique.mockResolvedValue({ metadata: {} });

      await listener.handleStageChanged({
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
      prisma.lead.findUnique.mockResolvedValue({
        metadata: { googleChatSpaceName: 'spaces/abc' },
      });

      await listener.handleNoteAdded({
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
});

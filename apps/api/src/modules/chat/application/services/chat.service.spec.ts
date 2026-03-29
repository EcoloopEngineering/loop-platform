import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { CHAT_REPOSITORY } from '../ports/chat.repository.port';

describe('ChatService', () => {
  let service: ChatService;
  let mockRepo: {
    createConversation: jest.Mock;
    addMessage: jest.Mock;
    touchConversation: jest.Mock;
    findConversationById: jest.Mock;
    findConversations: jest.Mock;
    updateConversation: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      createConversation: jest.fn(),
      addMessage: jest.fn(),
      touchConversation: jest.fn(),
      findConversationById: jest.fn(),
      findConversations: jest.fn(),
      updateConversation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: CHAT_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('createConversation', () => {
    it('should create a conversation', async () => {
      const params = {
        userId: 'user-1',
        visitorName: 'John Doe',
        visitorEmail: 'john@example.com',
        subject: 'Help needed',
      };
      const expected = { id: 'conv-1', ...params, status: 'OPEN', messages: [] };
      mockRepo.createConversation.mockResolvedValue(expected);

      const result = await service.createConversation(params);

      expect(result).toEqual(expected);
      expect(mockRepo.createConversation).toHaveBeenCalledWith(params);
    });

    it('should create a conversation without optional fields', async () => {
      mockRepo.createConversation.mockResolvedValue({ id: 'conv-2', status: 'OPEN', messages: [] });

      await service.createConversation({});

      expect(mockRepo.createConversation).toHaveBeenCalledWith({});
    });
  });

  describe('addMessage', () => {
    it('should create a message and update conversation', async () => {
      const msg = { id: 'msg-1', content: 'Hello', senderType: 'USER' };
      mockRepo.addMessage.mockResolvedValue(msg);
      mockRepo.touchConversation.mockResolvedValue(undefined);

      const result = await service.addMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        senderType: 'USER',
        content: 'Hello',
      });

      expect(result).toEqual(msg);
      expect(mockRepo.addMessage).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        senderId: 'user-1',
        senderType: 'USER',
        content: 'Hello',
        isAutoReply: false,
      });
      expect(mockRepo.touchConversation).toHaveBeenCalledWith('conv-1');
    });

    it('should default isAutoReply to false', async () => {
      mockRepo.addMessage.mockResolvedValue({});
      mockRepo.touchConversation.mockResolvedValue(undefined);

      await service.addMessage({
        conversationId: 'conv-1',
        senderType: 'BOT',
        content: 'Auto reply',
      });

      expect(mockRepo.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({ isAutoReply: false }),
      );
    });
  });

  describe('getConversation', () => {
    it('should find conversation by id', async () => {
      const conv = { id: 'conv-1', messages: [], user: null, agent: null };
      mockRepo.findConversationById.mockResolvedValue(conv);

      const result = await service.getConversation('conv-1');

      expect(result).toEqual(conv);
      expect(mockRepo.findConversationById).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('assignAgent', () => {
    it('should update conversation with agent and WITH_AGENT status', async () => {
      const updated = { id: 'conv-1', assignedTo: 'agent-1', status: 'WITH_AGENT' };
      mockRepo.updateConversation.mockResolvedValue(updated);

      const result = await service.assignAgent('conv-1', 'agent-1');

      expect(result).toEqual(updated);
      expect(mockRepo.updateConversation).toHaveBeenCalledWith('conv-1', {
        assignedTo: 'agent-1',
        status: 'WITH_AGENT',
      });
    });
  });

  describe('closeConversation', () => {
    it('should set status to CLOSED with closedAt timestamp', async () => {
      mockRepo.updateConversation.mockResolvedValue({ id: 'conv-1', status: 'CLOSED' });

      await service.closeConversation('conv-1');

      expect(mockRepo.updateConversation).toHaveBeenCalledWith('conv-1', {
        status: 'CLOSED',
        closedAt: expect.any(Date),
      });
    });
  });

  describe('requestAgent', () => {
    it('should set status to WAITING_AGENT', async () => {
      mockRepo.updateConversation.mockResolvedValue({ id: 'conv-1', status: 'WAITING_AGENT' });

      await service.requestAgent('conv-1');

      expect(mockRepo.updateConversation).toHaveBeenCalledWith('conv-1', {
        status: 'WAITING_AGENT',
      });
    });
  });
});

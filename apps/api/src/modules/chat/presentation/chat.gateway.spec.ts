import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from '../application/services/chat.service';
import { FaqService } from '../application/services/faq.service';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: {
    createConversation: jest.Mock;
    getConversation: jest.Mock;
    addMessage: jest.Mock;
    requestAgent: jest.Mock;
    assignAgent: jest.Mock;
    closeConversation: jest.Mock;
  };
  let faqService: { findAnswer: jest.Mock };

  beforeEach(async () => {
    chatService = {
      createConversation: jest.fn(),
      getConversation: jest.fn(),
      addMessage: jest.fn(),
      requestAgent: jest.fn(),
      assignAgent: jest.fn(),
      closeConversation: jest.fn(),
    };
    faqService = {
      findAnswer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ChatService, useValue: chatService },
        { provide: FaqService, useValue: faqService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    // Mock the server
    (gateway as any).server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
  });

  describe('handleJoinConversation', () => {
    it('should emit error when conversation is not found', async () => {
      chatService.getConversation.mockResolvedValue(null);
      const client = {
        join: jest.fn(),
        emit: jest.fn(),
      } as any;

      await gateway.handleJoinConversation(client, { conversationId: 'bad-id' });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Conversation not found' });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should join room and load conversation when found', async () => {
      const conv = { id: 'conv-1', messages: [] };
      chatService.getConversation.mockResolvedValue(conv);
      const client = {
        join: jest.fn(),
        emit: jest.fn(),
      } as any;

      await gateway.handleJoinConversation(client, { conversationId: 'conv-1' });

      expect(client.join).toHaveBeenCalledWith('conv:conv-1');
      expect(client.emit).toHaveBeenCalledWith('conversation_loaded', conv);
    });
  });

  describe('handleConnection', () => {
    it('should log client connection', () => {
      const client = { id: 'socket-1' } as any;
      // Should not throw
      expect(() => gateway.handleConnection(client)).not.toThrow();
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      const client = { id: 'socket-1' } as any;
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });
});

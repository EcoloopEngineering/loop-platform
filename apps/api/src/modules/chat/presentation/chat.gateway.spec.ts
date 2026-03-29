import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { ChatGateway } from './chat.gateway';
import { ChatService } from '../application/services/chat.service';
import { FaqService } from '../application/services/faq.service';

const JWT_SECRET = 'test-chat-secret';

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
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              if (key === 'JWT_SECRET') return JWT_SECRET;
              return defaultVal;
            }),
          },
        },
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
    it('should authenticate client with valid token from handshake.auth', () => {
      const token = jwt.sign({ sub: 'user-1', email: 'agent@ecoloop.us' }, JWT_SECRET);
      const client = {
        id: 'socket-1',
        handshake: { auth: { token }, query: {} },
        data: {},
      } as any;

      gateway.handleConnection(client);

      expect(client.data.user).toBeDefined();
      expect(client.data.user.sub).toBe('user-1');
    });

    it('should authenticate client with valid token from handshake.query', () => {
      const token = jwt.sign({ sub: 'user-2', email: 'agent2@ecoloop.us' }, JWT_SECRET);
      const client = {
        id: 'socket-2',
        handshake: { auth: {}, query: { token } },
        data: {},
      } as any;

      gateway.handleConnection(client);

      expect(client.data.user).toBeDefined();
      expect(client.data.user.sub).toBe('user-2');
    });

    it('should allow anonymous connection without token', () => {
      const client = {
        id: 'socket-3',
        handshake: { auth: {}, query: {} },
        data: {},
      } as any;

      expect(() => gateway.handleConnection(client)).not.toThrow();
      expect(client.data.user).toBeUndefined();
    });

    it('should allow connection with invalid token but not set user', () => {
      const client = {
        id: 'socket-4',
        handshake: { auth: { token: 'invalid-token' }, query: {} },
        data: {},
      } as any;

      expect(() => gateway.handleConnection(client)).not.toThrow();
      expect(client.data.user).toBeUndefined();
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      const client = { id: 'socket-1' } as any;
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('agent_message auth guard', () => {
    it('should reject unauthenticated agent_message', async () => {
      const client = { data: {}, emit: jest.fn() } as any;

      await gateway.handleAgentMessage(client, {
        conversationId: 'conv-1',
        content: 'hello',
        agentId: 'agent-1',
      });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
      expect(chatService.addMessage).not.toHaveBeenCalled();
    });

    it('should allow authenticated agent_message', async () => {
      const client = {
        data: { user: { sub: 'agent-1' } },
        emit: jest.fn(),
      } as any;
      chatService.addMessage.mockResolvedValue({ id: 'msg-1' });

      await gateway.handleAgentMessage(client, {
        conversationId: 'conv-1',
        content: 'hello',
        agentId: 'agent-1',
      });

      expect(chatService.addMessage).toHaveBeenCalled();
    });
  });

  describe('agent_join auth guard', () => {
    it('should reject unauthenticated agent_join', async () => {
      const client = { data: {}, emit: jest.fn() } as any;

      await gateway.handleAgentJoin(client, {
        conversationId: 'conv-1',
        agentId: 'agent-1',
      });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
      expect(chatService.assignAgent).not.toHaveBeenCalled();
    });

    it('should allow authenticated agent_join', async () => {
      const client = {
        data: { user: { sub: 'agent-1' } },
        emit: jest.fn(),
        join: jest.fn(),
      } as any;
      chatService.assignAgent.mockResolvedValue({});
      chatService.addMessage.mockResolvedValue({ id: 'msg-1' });

      await gateway.handleAgentJoin(client, {
        conversationId: 'conv-1',
        agentId: 'agent-1',
      });

      expect(client.join).toHaveBeenCalledWith('conv:conv-1');
      expect(chatService.assignAgent).toHaveBeenCalled();
    });
  });
});

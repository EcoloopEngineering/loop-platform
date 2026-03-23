import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      conversation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      message: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('createConversation', () => {
    it('should create a conversation with OPEN status', async () => {
      const params = {
        userId: 'user-1',
        visitorName: 'John Doe',
        visitorEmail: 'john@example.com',
        subject: 'Help needed',
      };
      const expected = { id: 'conv-1', ...params, status: 'OPEN', messages: [] };
      prisma.conversation.create.mockResolvedValue(expected);

      const result = await service.createConversation(params);

      expect(result).toEqual(expected);
      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          visitorName: 'John Doe',
          visitorEmail: 'john@example.com',
          subject: 'Help needed',
          status: 'OPEN',
        },
        include: { messages: true },
      });
    });

    it('should create a conversation without optional fields', async () => {
      prisma.conversation.create.mockResolvedValue({ id: 'conv-2', status: 'OPEN', messages: [] });

      await service.createConversation({});

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: {
          userId: undefined,
          visitorName: undefined,
          visitorEmail: undefined,
          subject: undefined,
          status: 'OPEN',
        },
        include: { messages: true },
      });
    });
  });

  describe('addMessage', () => {
    it('should create a message and update conversation', async () => {
      const msg = { id: 'msg-1', content: 'Hello', senderType: 'USER' };
      prisma.message.create.mockResolvedValue(msg);
      prisma.conversation.update.mockResolvedValue({});

      const result = await service.addMessage({
        conversationId: 'conv-1',
        senderId: 'user-1',
        senderType: 'USER',
        content: 'Hello',
      });

      expect(result).toEqual(msg);
      expect(prisma.message.create).toHaveBeenCalled();
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it('should default isAutoReply to false', async () => {
      prisma.message.create.mockResolvedValue({});
      prisma.conversation.update.mockResolvedValue({});

      await service.addMessage({
        conversationId: 'conv-1',
        senderType: 'BOT',
        content: 'Auto reply',
      });

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isAutoReply: false }),
      });
    });
  });

  describe('getConversation', () => {
    it('should find conversation by id with messages and user', async () => {
      const conv = { id: 'conv-1', messages: [], user: null, agent: null };
      prisma.conversation.findUnique.mockResolvedValue(conv);

      const result = await service.getConversation('conv-1');

      expect(result).toEqual(conv);
      expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          agent: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });
  });

  describe('assignAgent', () => {
    it('should update conversation with agent and WITH_AGENT status', async () => {
      const updated = { id: 'conv-1', assignedTo: 'agent-1', status: 'WITH_AGENT' };
      prisma.conversation.update.mockResolvedValue(updated);

      const result = await service.assignAgent('conv-1', 'agent-1');

      expect(result).toEqual(updated);
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { assignedTo: 'agent-1', status: 'WITH_AGENT' },
      });
    });
  });

  describe('closeConversation', () => {
    it('should set status to CLOSED with closedAt timestamp', async () => {
      prisma.conversation.update.mockResolvedValue({ id: 'conv-1', status: 'CLOSED' });

      await service.closeConversation('conv-1');

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { status: 'CLOSED', closedAt: expect.any(Date) },
      });
    });
  });

  describe('requestAgent', () => {
    it('should set status to WAITING_AGENT', async () => {
      prisma.conversation.update.mockResolvedValue({ id: 'conv-1', status: 'WAITING_AGENT' });

      await service.requestAgent('conv-1');

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { status: 'WAITING_AGENT' },
      });
    });
  });
});

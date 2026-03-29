import { Test, TestingModule } from '@nestjs/testing';
import { PrismaChatRepository } from './prisma-chat.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaChatRepository', () => {
  let repository: PrismaChatRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaChatRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaChatRepository>(PrismaChatRepository);
  });

  describe('createConversation', () => {
    it('should create a conversation with messages include', async () => {
      const data = { userId: 'user-1', subject: 'Help' };
      const created = { id: 'conv-1', ...data, status: 'OPEN', messages: [] };
      prisma.conversation.create.mockResolvedValue(created);

      const result = await repository.createConversation(data);

      expect(result).toEqual(created);
      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          subject: 'Help',
          status: 'OPEN',
        }),
        include: { messages: true },
      });
    });

    it('should handle visitor data without userId', async () => {
      const data = { visitorName: 'John', visitorEmail: 'john@test.com' };
      prisma.conversation.create.mockResolvedValue({ id: 'conv-1', ...data, messages: [] });

      await repository.createConversation(data);

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          visitorName: 'John',
          visitorEmail: 'john@test.com',
        }),
        include: { messages: true },
      });
    });
  });

  describe('addMessage', () => {
    it('should add a message to a conversation', async () => {
      const data = {
        conversationId: 'conv-1',
        senderId: 'user-1',
        senderType: 'USER',
        content: 'Hello',
        isAutoReply: false,
      };
      prisma.message.create.mockResolvedValue({ id: 'msg-1', ...data });

      const result = await repository.addMessage(data);

      expect(result).toEqual(expect.objectContaining({ id: 'msg-1' }));
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          conversationId: 'conv-1',
          content: 'Hello',
          senderType: 'USER',
        }),
      });
    });
  });

  describe('touchConversation', () => {
    it('should update the updatedAt timestamp', async () => {
      prisma.conversation.update.mockResolvedValue({ id: 'conv-1' });

      await repository.touchConversation('conv-1');

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { updatedAt: expect.any(Date) },
      });
    });
  });

  describe('findConversationById', () => {
    it('should return conversation with messages, user, and agent', async () => {
      const conv = { id: 'conv-1', messages: [], user: { id: 'u1' }, agent: { id: 'a1' } };
      prisma.conversation.findUnique.mockResolvedValue(conv);

      const result = await repository.findConversationById('conv-1');

      expect(result).toEqual(conv);
      expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        include: expect.objectContaining({
          messages: { orderBy: { createdAt: 'asc' } },
          user: expect.any(Object),
          agent: expect.any(Object),
        }),
      });
    });

    it('should return null when not found', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);

      const result = await repository.findConversationById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findConversations', () => {
    it('should return all conversations without filters', async () => {
      const convs = [{ id: 'conv-1' }];
      prisma.conversation.findMany.mockResolvedValue(convs);

      const result = await repository.findConversations();

      expect(result).toEqual(convs);
      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: { updatedAt: 'desc' },
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.conversation.findMany.mockResolvedValue([]);

      await repository.findConversations({ status: 'OPEN' });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'OPEN' },
        }),
      );
    });

    it('should filter by userId', async () => {
      prisma.conversation.findMany.mockResolvedValue([]);

      await repository.findConversations({ userId: 'user-1' });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });
  });

  describe('updateConversation', () => {
    it('should update conversation data', async () => {
      prisma.conversation.update.mockResolvedValue({ id: 'conv-1', status: 'CLOSED' });

      const result = await repository.updateConversation('conv-1', { status: 'CLOSED' });

      expect(result).toEqual(expect.objectContaining({ status: 'CLOSED' }));
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { status: 'CLOSED' },
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from '../application/services/chat.service';
import { FaqService } from '../application/services/faq.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: Record<string, jest.Mock>;
  let faqService: Record<string, jest.Mock>;

  beforeEach(async () => {
    chatService = {
      getConversations: jest.fn(),
      getConversation: jest.fn(),
      assignAgent: jest.fn(),
      closeConversation: jest.fn(),
    };

    faqService = {
      getAllFaqs: jest.fn(),
      createFaq: jest.fn(),
      updateFaq: jest.fn(),
      deleteFaq: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: chatService },
        { provide: FaqService, useValue: faqService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatController>(ChatController);
  });

  describe('listConversations', () => {
    it('should return conversations filtered by status', async () => {
      const conversations = [{ id: 'conv-1', status: 'OPEN' }];
      chatService.getConversations.mockResolvedValue(conversations);

      const result = await controller.listConversations('OPEN');

      expect(chatService.getConversations).toHaveBeenCalledWith({ status: 'OPEN' });
      expect(result).toEqual(conversations);
    });

    it('should return all conversations when no status filter', async () => {
      chatService.getConversations.mockResolvedValue([]);
      await controller.listConversations();
      expect(chatService.getConversations).toHaveBeenCalledWith({ status: undefined });
    });
  });

  describe('getConversation', () => {
    it('should return conversation with messages', async () => {
      const conversation = {
        id: 'conv-1',
        messages: [{ id: 'msg-1', content: 'Hello' }],
      };
      chatService.getConversation.mockResolvedValue(conversation);

      const result = await controller.getConversation('conv-1');

      expect(chatService.getConversation).toHaveBeenCalledWith('conv-1');
      expect(result).toEqual(conversation);
    });
  });

  describe('assignAgent', () => {
    it('should assign agent to conversation', async () => {
      const updated = { id: 'conv-1', assignedTo: 'agent-1', status: 'WITH_AGENT' };
      chatService.assignAgent.mockResolvedValue(updated);

      const result = await controller.assignAgent('conv-1', 'agent-1');

      expect(chatService.assignAgent).toHaveBeenCalledWith('conv-1', 'agent-1');
      expect(result).toEqual(updated);
    });
  });

  describe('closeConversation', () => {
    it('should close the conversation', async () => {
      const closed = { id: 'conv-1', status: 'CLOSED' };
      chatService.closeConversation.mockResolvedValue(closed);

      const result = await controller.closeConversation('conv-1');

      expect(chatService.closeConversation).toHaveBeenCalledWith('conv-1');
      expect(result).toEqual(closed);
    });
  });

  describe('listFaqs', () => {
    it('should return all FAQ entries', async () => {
      const faqs = [{ id: 'faq-1', question: 'What is solar?', answer: 'Energy from sun' }];
      faqService.getAllFaqs.mockResolvedValue(faqs);

      const result = await controller.listFaqs();

      expect(faqService.getAllFaqs).toHaveBeenCalled();
      expect(result).toEqual(faqs);
    });
  });

  describe('createFaq', () => {
    it('should create a new FAQ entry', async () => {
      const dto = { question: 'How much?', answer: '$10k-$30k', keywords: ['cost', 'price'] };
      const created = { id: 'faq-2', ...dto };
      faqService.createFaq.mockResolvedValue(created);

      const result = await controller.createFaq(dto);

      expect(faqService.createFaq).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });
});

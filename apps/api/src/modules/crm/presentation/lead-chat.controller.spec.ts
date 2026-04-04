import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LeadChatController } from './lead-chat.controller';
import { LeadChatService } from '../application/services/lead-chat.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('LeadChatController', () => {
  let controller: LeadChatController;
  let service: Record<string, jest.Mock>;

  const leadId = '11111111-1111-1111-1111-111111111111';
  const userId = '22222222-2222-2222-2222-222222222222';

  const mockMessage = {
    id: '33333333-3333-3333-3333-333333333333',
    leadId,
    userId,
    message: 'Hello team',
    createdAt: new Date(),
    user: { id: userId, firstName: 'John', lastName: 'Doe', profileImage: null },
  };

  beforeEach(async () => {
    service = {
      sendMessage: jest.fn().mockResolvedValue(mockMessage),
      getMessages: jest.fn().mockResolvedValue([mockMessage]),
      follow: jest.fn().mockResolvedValue({ following: true }),
      unfollow: jest.fn().mockResolvedValue({ following: false }),
      isFollowing: jest.fn().mockResolvedValue({ following: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadChatController],
      providers: [{ provide: LeadChatService, useValue: service }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(LeadChatController);
  });

  describe('create', () => {
    it('should delegate to service.sendMessage', async () => {
      const result = await controller.create(leadId, { message: 'Hello team' }, userId);

      expect(service.sendMessage).toHaveBeenCalledWith(leadId, userId, 'Hello team');
      expect(result).toEqual(mockMessage);
    });
  });

  describe('findAll', () => {
    it('should delegate to service.getMessages', async () => {
      const result = await controller.findAll(leadId);

      expect(service.getMessages).toHaveBeenCalledWith(leadId);
      expect(result).toEqual([mockMessage]);
    });
  });

  describe('follow', () => {
    it('should delegate to service.follow', async () => {
      const result = await controller.follow(leadId, userId);

      expect(service.follow).toHaveBeenCalledWith(leadId, userId);
      expect(result).toEqual({ following: true });
    });
  });

  describe('unfollow', () => {
    it('should delegate to service.unfollow', async () => {
      const result = await controller.unfollow(leadId, userId);

      expect(service.unfollow).toHaveBeenCalledWith(leadId, userId);
      expect(result).toEqual({ following: false });
    });
  });

  describe('isFollowing', () => {
    it('should delegate to service.isFollowing', async () => {
      const result = await controller.isFollowing(leadId, userId);

      expect(service.isFollowing).toHaveBeenCalledWith(leadId, userId);
      expect(result).toEqual({ following: true });
    });
  });
});

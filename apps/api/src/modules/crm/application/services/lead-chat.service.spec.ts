import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadChatService } from './lead-chat.service';
import { LEAD_CHAT_REPOSITORY } from '../ports/lead-chat.repository.port';
import { NotificationService } from '../../../notification/application/services/notification.service';

describe('LeadChatService', () => {
  let service: LeadChatService;
  let repo: Record<string, jest.Mock>;
  let eventEmitter: { emit: jest.Mock };
  let notificationService: { create: jest.Mock };

  const leadId = 'lead-1';
  const userId = 'user-1';

  const mockLead = {
    id: leadId,
    customer: { firstName: 'Jane', lastName: 'Smith' },
    assignments: [{ userId: 'user-2' }],
  };

  const mockMessage = {
    id: 'msg-1',
    leadId,
    userId,
    message: 'Hello',
    createdAt: new Date(),
    user: { id: userId, firstName: 'John', lastName: 'Doe', profileImage: null },
  };

  beforeEach(async () => {
    repo = {
      findLeadWithAssignments: jest.fn().mockResolvedValue(mockLead),
      createMessage: jest.fn().mockResolvedValue(mockMessage),
      findMessagesByLead: jest.fn().mockResolvedValue([mockMessage]),
      createActivity: jest.fn().mockResolvedValue({}),
      upsertFollow: jest.fn().mockResolvedValue(undefined),
      deleteFollow: jest.fn().mockResolvedValue(undefined),
      findFollow: jest.fn().mockResolvedValue({ leadId, userId }),
      findFollowersByLead: jest.fn().mockResolvedValue([]),
    };
    eventEmitter = { emit: jest.fn() };
    notificationService = { create: jest.fn().mockResolvedValue({}) };

    const module = await Test.createTestingModule({
      providers: [
        LeadChatService,
        { provide: LEAD_CHAT_REPOSITORY, useValue: repo },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(LeadChatService);
  });

  describe('sendMessage', () => {
    it('should create message, activity, emit event, and notify', async () => {
      const result = await service.sendMessage(leadId, userId, 'Hello');

      expect(repo.createMessage).toHaveBeenCalledWith({ leadId, userId, message: 'Hello' });
      expect(repo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId,
          userId,
          type: 'NOTE_ADDED',
          description: 'Team chat: Hello',
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('lead.chat.message', {
        leadId,
        message: mockMessage,
      });
      expect(result).toEqual(mockMessage);
    });

    it('should truncate long messages', async () => {
      const long = 'A'.repeat(100);
      await service.sendMessage(leadId, userId, long);

      expect(repo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          description: `Team chat: ${'A'.repeat(80)}...`,
        }),
      );
    });

    it('should throw NotFoundException if lead not found', async () => {
      repo.findLeadWithAssignments.mockResolvedValue(null);

      await expect(service.sendMessage(leadId, userId, 'Hi')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should notify assigned users excluding sender', async () => {
      await service.sendMessage(leadId, userId, 'Hello');

      // Wait for async notification
      await new Promise((r) => setTimeout(r, 50));

      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          event: 'lead.chat.message',
        }),
      );
    });
  });

  describe('getMessages', () => {
    it('should return messages for a lead', async () => {
      const result = await service.getMessages(leadId);

      expect(repo.findMessagesByLead).toHaveBeenCalledWith(leadId);
      expect(result).toEqual([mockMessage]);
    });

    it('should throw NotFoundException if lead not found', async () => {
      repo.findLeadWithAssignments.mockResolvedValue(null);

      await expect(service.getMessages(leadId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('follow / unfollow / isFollowing', () => {
    it('should follow a lead chat', async () => {
      const result = await service.follow(leadId, userId);

      expect(repo.upsertFollow).toHaveBeenCalledWith(leadId, userId);
      expect(result).toEqual({ following: true });
    });

    it('should unfollow a lead chat', async () => {
      const result = await service.unfollow(leadId, userId);

      expect(repo.deleteFollow).toHaveBeenCalledWith(leadId, userId);
      expect(result).toEqual({ following: false });
    });

    it('should check following status', async () => {
      const result = await service.isFollowing(leadId, userId);

      expect(repo.findFollow).toHaveBeenCalledWith(leadId, userId);
      expect(result).toEqual({ following: true });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { GamificationEventListener } from './gamification-event.listener';
import { CoinService } from '../services/coin.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('GamificationEventListener', () => {
  let listener: GamificationEventListener;
  let prisma: MockPrismaService;
  let coinService: { addCoins: jest.Mock };
  let chatService: { isConfigured: jest.Mock; sendCard: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    coinService = { addCoins: jest.fn() };
    chatService = { isConfigured: jest.fn().mockReturnValue(false), sendCard: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationEventListener,
        { provide: PrismaService, useValue: prisma },
        { provide: CoinService, useValue: coinService },
        { provide: GoogleChatService, useValue: chatService },
      ],
    }).compile();

    listener = module.get<GamificationEventListener>(GamificationEventListener);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  const mockLead = {
    id: 'lead-1',
    kw: 8.5,
    assignments: [
      {
        user: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          closedDealEmoji: '🎉',
        },
      },
    ],
  };

  describe('CONNECTED stage', () => {
    it('should create a CONNECTED event with 2 points and no coins', async () => {
      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.gamificationEvent.findUnique.mockResolvedValue(null);
      prisma.gamificationEvent.create.mockResolvedValue({ id: 'event-1' });

      await listener.handleStageChanged({
        leadId: 'lead-1',
        customerName: 'Test Customer',
        previousStage: 'DESIGN_READY',
        newStage: 'CONNECTED',
      });

      expect(prisma.gamificationEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          leadId: 'lead-1',
          eventType: 'CONNECTED',
          points: 2,
          coins: 0,
        }),
      });

      // No coins for CONNECTED
      expect(coinService.addCoins).not.toHaveBeenCalled();
    });
  });

  describe('WON stage', () => {
    it('should create a SALE event with 4 points and 2*kw coins', async () => {
      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.gamificationEvent.findUnique.mockResolvedValue(null);
      prisma.gamificationEvent.create.mockResolvedValue({ id: 'event-2' });

      await listener.handleStageChanged({
        leadId: 'lead-1',
        customerName: 'Test Customer',
        previousStage: 'CONNECTED',
        newStage: 'WON',
      });

      expect(prisma.gamificationEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'SALE',
          points: 4,
          coins: 17, // 2 * 8.5
        }),
      });

      expect(coinService.addCoins).toHaveBeenCalledWith(
        'user-1',
        17,
        expect.stringContaining('SALE'),
        'event-2',
      );
    });
  });

  describe('CUSTOMER_SUCCESS stage', () => {
    it('should create a CUSTOMER_SUCCESS event with 8 points and 5*kw coins', async () => {
      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.gamificationEvent.findUnique.mockResolvedValue(null);
      prisma.gamificationEvent.create.mockResolvedValue({ id: 'event-3' });

      await listener.handleStageChanged({
        leadId: 'lead-1',
        customerName: 'Test Customer',
        previousStage: 'INSTALL',
        newStage: 'CUSTOMER_SUCCESS',
      });

      expect(prisma.gamificationEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'CUSTOMER_SUCCESS',
          points: 8,
          coins: 42.5, // 5 * 8.5
        }),
      });

      expect(coinService.addCoins).toHaveBeenCalledWith(
        'user-1',
        42.5,
        expect.stringContaining('CUSTOMER_SUCCESS'),
        'event-3',
      );
    });
  });

  describe('deduplication', () => {
    it('should skip if event already exists in the same minute bucket', async () => {
      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.gamificationEvent.findUnique.mockResolvedValue({
        id: 'existing-event',
      });

      await listener.handleStageChanged({
        leadId: 'lead-1',
        customerName: 'Test Customer',
        previousStage: 'CONNECTED',
        newStage: 'WON',
      });

      expect(prisma.gamificationEvent.create).not.toHaveBeenCalled();
      expect(coinService.addCoins).not.toHaveBeenCalled();
    });
  });

  describe('non-milestone stages', () => {
    it('should ignore non-milestone stages', async () => {
      await listener.handleStageChanged({
        leadId: 'lead-1',
        customerName: 'Test Customer',
        previousStage: 'NEW_LEAD',
        newStage: 'REQUEST_DESIGN',
      });

      expect(prisma.lead.findUnique).not.toHaveBeenCalled();
      expect(prisma.gamificationEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('missing lead or assignment', () => {
    it('should skip if lead is not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await listener.handleStageChanged({
        leadId: 'lead-1',
        customerName: 'Test Customer',
        previousStage: 'CONNECTED',
        newStage: 'WON',
      });

      expect(prisma.gamificationEvent.create).not.toHaveBeenCalled();
    });

    it('should skip if no primary assignment', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        ...mockLead,
        assignments: [],
      });

      await listener.handleStageChanged({
        leadId: 'lead-1',
        customerName: 'Test Customer',
        previousStage: 'CONNECTED',
        newStage: 'WON',
      });

      expect(prisma.gamificationEvent.create).not.toHaveBeenCalled();
    });
  });
});

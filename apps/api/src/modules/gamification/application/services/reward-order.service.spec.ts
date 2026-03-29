import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RewardOrderService } from './reward-order.service';
import { CoinService } from './coin.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { UserRole } from '@loop/shared';

describe('RewardOrderService', () => {
  let service: RewardOrderService;
  let prisma: MockPrismaService;
  let coinService: { deductCoins: jest.Mock; addCoins: jest.Mock };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.SALES_REP,
    isActive: true,
    profileImage: null,
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    coinService = { deductCoins: jest.fn(), addCoins: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardOrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: CoinService, useValue: coinService },
      ],
    }).compile();

    service = module.get<RewardOrderService>(RewardOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listProducts', () => {
    it('should return active reward products ordered by price', async () => {
      const mockProducts = [
        { id: 'p1', code: 'HAT', name: 'Hat', price: 30, isActive: true },
        { id: 'p2', code: 'TSHIRT', name: 'T-Shirt', price: 50, isActive: true },
      ];
      prisma.rewardProduct.findMany.mockResolvedValue(mockProducts);

      const result = await service.listProducts();

      expect(result).toEqual(mockProducts);
      expect(prisma.rewardProduct.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
    });
  });

  describe('placeOrder', () => {
    const product = {
      id: 'p1',
      code: 'TSHIRT',
      name: 'T-Shirt',
      price: 50,
      isActive: true,
    };

    it('should deduct coins and create an order', async () => {
      prisma.rewardProduct.findUnique.mockResolvedValue(product);
      coinService.deductCoins.mockResolvedValue(undefined);
      const createdOrder = {
        id: 'order-1',
        userId: 'user-1',
        productId: 'p1',
        coinsSpent: 50,
        product,
      };
      prisma.rewardOrder.create.mockResolvedValue(createdOrder);

      const result = await service.placeOrder(mockUser, 'p1');

      expect(coinService.deductCoins).toHaveBeenCalledWith(
        'user-1',
        50,
        'Reward order: T-Shirt',
      );
      expect(prisma.rewardOrder.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          productId: 'p1',
          coinsSpent: 50,
        },
        include: { product: true },
      });
      expect(result).toEqual(createdOrder);
    });

    it('should throw BadRequestException when productId is empty', async () => {
      await expect(service.placeOrder(mockUser, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when product is not found', async () => {
      prisma.rewardProduct.findUnique.mockResolvedValue(null);

      await expect(
        service.placeOrder(mockUser, 'nonexistent'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when product is inactive', async () => {
      prisma.rewardProduct.findUnique.mockResolvedValue({
        id: 'p1',
        price: 50,
        isActive: false,
      });

      await expect(service.placeOrder(mockUser, 'p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate error when coins are insufficient', async () => {
      prisma.rewardProduct.findUnique.mockResolvedValue(product);
      coinService.deductCoins.mockRejectedValue(
        new BadRequestException('Insufficient coin balance'),
      );

      await expect(service.placeOrder(mockUser, 'p1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getOrders', () => {
    it('should return orders for a given user', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          userId: 'user-1',
          coinsSpent: 50,
          product: { name: 'T-Shirt' },
        },
      ];
      prisma.rewardOrder.findMany.mockResolvedValue(mockOrders);

      const result = await service.getOrders('user-1');

      expect(result).toEqual(mockOrders);
      expect(prisma.rewardOrder.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        include: { product: true },
      });
    });
  });

  describe('fulfillOrder', () => {
    it('should fulfill a pending order', async () => {
      prisma.rewardOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
      });
      prisma.rewardOrder.update.mockResolvedValue({
        id: 'order-1',
        status: 'FULFILLED',
        product: { name: 'T-Shirt' },
      });

      const result = await service.fulfillOrder('order-1');

      expect(result.status).toBe('FULFILLED');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      prisma.rewardOrder.findUnique.mockResolvedValue(null);

      await expect(service.fulfillOrder('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when order is not PENDING', async () => {
      prisma.rewardOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'FULFILLED',
      });

      await expect(service.fulfillOrder('order-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order and refund coins', async () => {
      prisma.rewardOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        coinsSpent: 50,
        status: 'PENDING',
        product: { name: 'T-Shirt' },
      });
      coinService.addCoins.mockResolvedValue(undefined);
      prisma.rewardOrder.update.mockResolvedValue({
        id: 'order-1',
        status: 'CANCELLED',
        product: { name: 'T-Shirt' },
      });

      const result = await service.cancelOrder('order-1');

      expect(coinService.addCoins).toHaveBeenCalledWith(
        'user-1',
        50,
        'Refund: T-Shirt order cancelled',
      );
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      prisma.rewardOrder.findUnique.mockResolvedValue(null);

      await expect(service.cancelOrder('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when order is already cancelled', async () => {
      prisma.rewardOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CANCELLED',
        product: { name: 'T-Shirt' },
      });

      await expect(service.cancelOrder('order-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

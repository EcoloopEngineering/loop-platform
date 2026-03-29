import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RewardOrderService } from './reward-order.service';
import { CoinService } from './coin.service';
import { REWARD_REPOSITORY } from '../ports/reward.repository.port';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { UserRole } from '@loop/shared';

describe('RewardOrderService', () => {
  let service: RewardOrderService;
  let mockRepo: Record<string, jest.Mock>;
  let coinService: { deductCoins: jest.Mock; addCoins: jest.Mock };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: null,
    role: UserRole.SALES_REP,
    isActive: true,
    profileImage: null,
  };

  beforeEach(async () => {
    mockRepo = {
      findActiveProducts: jest.fn(),
      findProductById: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      createOrder: jest.fn(),
      findOrdersByUser: jest.fn(),
      findAllOrders: jest.fn(),
      findOrderById: jest.fn(),
      findOrderByIdWithProduct: jest.fn(),
      updateOrderStatus: jest.fn(),
    };
    coinService = { deductCoins: jest.fn(), addCoins: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardOrderService,
        { provide: REWARD_REPOSITORY, useValue: mockRepo },
        { provide: CoinService, useValue: coinService },
      ],
    }).compile();

    service = module.get<RewardOrderService>(RewardOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listProducts', () => {
    it('should return active reward products', async () => {
      const mockProducts = [
        { id: 'p1', code: 'HAT', name: 'Hat', price: 30, isActive: true },
        { id: 'p2', code: 'TSHIRT', name: 'T-Shirt', price: 50, isActive: true },
      ];
      mockRepo.findActiveProducts.mockResolvedValue(mockProducts);

      const result = await service.listProducts();

      expect(result).toEqual(mockProducts);
      expect(mockRepo.findActiveProducts).toHaveBeenCalled();
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
      mockRepo.findProductById.mockResolvedValue(product);
      coinService.deductCoins.mockResolvedValue(undefined);
      const createdOrder = {
        id: 'order-1',
        userId: 'user-1',
        productId: 'p1',
        coinsSpent: 50,
        product,
      };
      mockRepo.createOrder.mockResolvedValue(createdOrder);

      const result = await service.placeOrder(mockUser, 'p1');

      expect(coinService.deductCoins).toHaveBeenCalledWith(
        'user-1',
        50,
        'Reward order: T-Shirt',
      );
      expect(mockRepo.createOrder).toHaveBeenCalledWith({
        userId: 'user-1',
        productId: 'p1',
        coinsSpent: 50,
      });
      expect(result).toEqual(createdOrder);
    });

    it('should throw BadRequestException when productId is empty', async () => {
      await expect(service.placeOrder(mockUser, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when product is not found', async () => {
      mockRepo.findProductById.mockResolvedValue(null);

      await expect(
        service.placeOrder(mockUser, 'nonexistent'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when product is inactive', async () => {
      mockRepo.findProductById.mockResolvedValue({
        id: 'p1',
        price: 50,
        isActive: false,
      });

      await expect(service.placeOrder(mockUser, 'p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate error when coins are insufficient', async () => {
      mockRepo.findProductById.mockResolvedValue(product);
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
      mockRepo.findOrdersByUser.mockResolvedValue(mockOrders);

      const result = await service.getOrders('user-1');

      expect(result).toEqual(mockOrders);
      expect(mockRepo.findOrdersByUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('fulfillOrder', () => {
    it('should fulfill a pending order', async () => {
      mockRepo.findOrderById.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
      });
      mockRepo.updateOrderStatus.mockResolvedValue({
        id: 'order-1',
        status: 'FULFILLED',
        product: { name: 'T-Shirt' },
      });

      const result = await service.fulfillOrder('order-1');

      expect(result.status).toBe('FULFILLED');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockRepo.findOrderById.mockResolvedValue(null);

      await expect(service.fulfillOrder('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when order is not PENDING', async () => {
      mockRepo.findOrderById.mockResolvedValue({
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
      mockRepo.findOrderByIdWithProduct.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        coinsSpent: 50,
        status: 'PENDING',
        product: { name: 'T-Shirt' },
      });
      coinService.addCoins.mockResolvedValue(undefined);
      mockRepo.updateOrderStatus.mockResolvedValue({
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
      mockRepo.findOrderByIdWithProduct.mockResolvedValue(null);

      await expect(service.cancelOrder('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when order is already cancelled', async () => {
      mockRepo.findOrderByIdWithProduct.mockResolvedValue({
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

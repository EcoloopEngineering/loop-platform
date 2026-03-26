import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RewardsController } from './rewards.controller';
import { CoinService } from '../application/services/coin.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../test/prisma-mock.helper';

describe('RewardsController', () => {
  let controller: RewardsController;
  let prisma: MockPrismaService;
  let coinService: {
    deductCoins: jest.Mock;
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    coinService = { deductCoins: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RewardsController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: CoinService, useValue: coinService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RewardsController>(RewardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listProducts', () => {
    it('should return active reward products', async () => {
      const mockProducts = [
        { id: 'p1', code: 'TSHIRT', name: 'T-Shirt', price: 50, isActive: true },
        { id: 'p2', code: 'HAT', name: 'Hat', price: 30, isActive: true },
      ];
      prisma.rewardProduct.findMany.mockResolvedValue(mockProducts);

      const result = await controller.listProducts();

      expect(result).toEqual(mockProducts);
      expect(prisma.rewardProduct.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
    });
  });

  describe('placeOrder', () => {
    it('should deduct coins and create an order', async () => {
      const product = { id: 'p1', code: 'TSHIRT', name: 'T-Shirt', price: 50, isActive: true };
      prisma.rewardProduct.findUnique.mockResolvedValue(product);
      coinService.deductCoins.mockResolvedValue(undefined);
      prisma.rewardOrder.create.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        productId: 'p1',
        coinsSpent: 50,
        product,
      });

      const result = await controller.placeOrder(
        { id: 'user-1' },
        { productId: 'p1' },
      );

      expect(coinService.deductCoins).toHaveBeenCalledWith(
        'user-1',
        50,
        'Reward order: T-Shirt',
      );
      expect(result.coinsSpent).toBe(50);
    });

    it('should throw when productId is missing', async () => {
      await expect(
        controller.placeOrder({ id: 'user-1' }, { productId: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when product is not found', async () => {
      prisma.rewardProduct.findUnique.mockResolvedValue(null);

      await expect(
        controller.placeOrder({ id: 'user-1' }, { productId: 'nonexistent' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when product is inactive', async () => {
      prisma.rewardProduct.findUnique.mockResolvedValue({
        id: 'p1',
        price: 50,
        isActive: false,
      });

      await expect(
        controller.placeOrder({ id: 'user-1' }, { productId: 'p1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyOrders', () => {
    it('should return orders for the current user', async () => {
      const mockOrders = [
        { id: 'order-1', userId: 'user-1', coinsSpent: 50, product: { name: 'T-Shirt' } },
      ];
      prisma.rewardOrder.findMany.mockResolvedValue(mockOrders);

      const result = await controller.getMyOrders({ id: 'user-1' });

      expect(result).toEqual(mockOrders);
      expect(prisma.rewardOrder.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        include: { product: true },
      });
    });
  });

  describe('createProduct', () => {
    it('should create a new reward product', async () => {
      const productData = {
        code: 'MUG',
        name: 'Coffee Mug',
        description: 'Nice mug',
        price: 20,
        imageUrl: 'https://example.com/mug.jpg',
      };
      prisma.rewardProduct.create.mockResolvedValue({
        id: 'p3',
        ...productData,
        isActive: true,
      });

      const result = await controller.createProduct(productData);

      expect(result.code).toBe('MUG');
      expect(prisma.rewardProduct.create).toHaveBeenCalledWith({
        data: productData,
      });
    });
  });

  describe('updateProduct', () => {
    it('should update an existing product', async () => {
      prisma.rewardProduct.update.mockResolvedValue({
        id: 'p1',
        name: 'Updated T-Shirt',
        price: 60,
      });

      const result = await controller.updateProduct('p1', {
        name: 'Updated T-Shirt',
        price: 60,
      });

      expect(result.name).toBe('Updated T-Shirt');
      expect(prisma.rewardProduct.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { name: 'Updated T-Shirt', price: 60 },
      });
    });
  });
});

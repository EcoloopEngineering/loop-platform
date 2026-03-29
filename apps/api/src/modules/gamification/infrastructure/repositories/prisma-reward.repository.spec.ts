import { Test, TestingModule } from '@nestjs/testing';
import { PrismaRewardRepository } from './prisma-reward.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaRewardRepository', () => {
  let repository: PrismaRewardRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaRewardRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaRewardRepository>(PrismaRewardRepository);
  });

  describe('findActiveProducts', () => {
    it('should return active products ordered by price', async () => {
      const products = [{ id: 'p1', price: 10 }, { id: 'p2', price: 20 }];
      prisma.rewardProduct.findMany.mockResolvedValue(products);

      const result = await repository.findActiveProducts();

      expect(result).toEqual(products);
      expect(prisma.rewardProduct.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
    });
  });

  describe('findProductById', () => {
    it('should return product by id', async () => {
      const product = { id: 'p1', name: 'Gift Card' };
      prisma.rewardProduct.findUnique.mockResolvedValue(product);

      const result = await repository.findProductById('p1');

      expect(result).toEqual(product);
      expect(prisma.rewardProduct.findUnique).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('should return null when not found', async () => {
      prisma.rewardProduct.findUnique.mockResolvedValue(null);

      const result = await repository.findProductById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createProduct', () => {
    it('should create a product', async () => {
      const data = { code: 'GC50', name: 'Gift Card $50', price: 50 };
      prisma.rewardProduct.create.mockResolvedValue({ id: 'p1', ...data });

      const result = await repository.createProduct(data);

      expect(result).toEqual(expect.objectContaining({ code: 'GC50' }));
      expect(prisma.rewardProduct.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('updateProduct', () => {
    it('should update a product', async () => {
      prisma.rewardProduct.update.mockResolvedValue({ id: 'p1', name: 'Updated' });

      const result = await repository.updateProduct('p1', { name: 'Updated' });

      expect(result).toEqual(expect.objectContaining({ name: 'Updated' }));
      expect(prisma.rewardProduct.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { name: 'Updated' },
      });
    });
  });

  describe('createOrder', () => {
    it('should create an order with product include', async () => {
      const data = { userId: 'u1', productId: 'p1', coinsSpent: 50 };
      prisma.rewardOrder.create.mockResolvedValue({ id: 'o1', ...data, product: { id: 'p1' } });

      const result = await repository.createOrder(data);

      expect(result).toEqual(expect.objectContaining({ id: 'o1' }));
      expect(prisma.rewardOrder.create).toHaveBeenCalledWith({
        data,
        include: { product: true },
      });
    });
  });

  describe('findOrdersByUser', () => {
    it('should return orders for a user', async () => {
      const orders = [{ id: 'o1', product: { id: 'p1' } }];
      prisma.rewardOrder.findMany.mockResolvedValue(orders);

      const result = await repository.findOrdersByUser('u1');

      expect(result).toEqual(orders);
      expect(prisma.rewardOrder.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        include: { product: true },
      });
    });
  });

  describe('findAllOrders', () => {
    it('should return all orders with product and user', async () => {
      const orders = [{ id: 'o1' }];
      prisma.rewardOrder.findMany.mockResolvedValue(orders);

      const result = await repository.findAllOrders();

      expect(result).toEqual(orders);
      expect(prisma.rewardOrder.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: expect.objectContaining({
          product: true,
          user: expect.any(Object),
        }),
      });
    });
  });

  describe('findOrderById', () => {
    it('should return order by id', async () => {
      prisma.rewardOrder.findUnique.mockResolvedValue({ id: 'o1' });

      const result = await repository.findOrderById('o1');

      expect(result).toEqual({ id: 'o1' });
      expect(prisma.rewardOrder.findUnique).toHaveBeenCalledWith({ where: { id: 'o1' } });
    });
  });

  describe('findOrderByIdWithProduct', () => {
    it('should return order with product', async () => {
      prisma.rewardOrder.findUnique.mockResolvedValue({ id: 'o1', product: { id: 'p1' } });

      const result = await repository.findOrderByIdWithProduct('o1');

      expect(result).toEqual(expect.objectContaining({ id: 'o1', product: { id: 'p1' } }));
      expect(prisma.rewardOrder.findUnique).toHaveBeenCalledWith({
        where: { id: 'o1' },
        include: { product: true },
      });
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      prisma.rewardOrder.update.mockResolvedValue({ id: 'o1', status: 'DELIVERED' });

      const result = await repository.updateOrderStatus('o1', 'DELIVERED');

      expect(result).toEqual(expect.objectContaining({ status: 'DELIVERED' }));
      expect(prisma.rewardOrder.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { status: 'DELIVERED' },
        include: { product: true },
      });
    });
  });
});

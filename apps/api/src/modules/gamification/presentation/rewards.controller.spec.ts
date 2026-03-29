import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { RewardsController } from './rewards.controller';
import { RewardOrderService } from '../application/services/reward-order.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { UserRole } from '@loop/shared';

describe('RewardsController', () => {
  let controller: RewardsController;
  let service: {
    listProducts: jest.Mock;
    placeOrder: jest.Mock;
    getOrders: jest.Mock;
    createProduct: jest.Mock;
    updateProduct: jest.Mock;
    listAllOrders: jest.Mock;
    fulfillOrder: jest.Mock;
    cancelOrder: jest.Mock;
  };

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
    service = {
      listProducts: jest.fn(),
      placeOrder: jest.fn(),
      getOrders: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      listAllOrders: jest.fn(),
      fulfillOrder: jest.fn(),
      cancelOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RewardsController],
      providers: [{ provide: RewardOrderService, useValue: service }],
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
    it('should delegate to service.listProducts', async () => {
      const mockProducts = [
        { id: 'p1', code: 'TSHIRT', name: 'T-Shirt', price: 50, isActive: true },
      ];
      service.listProducts.mockResolvedValue(mockProducts);

      const result = await controller.listProducts();

      expect(service.listProducts).toHaveBeenCalled();
      expect(result).toEqual(mockProducts);
    });
  });

  describe('placeOrder', () => {
    it('should delegate to service.placeOrder', async () => {
      const order = { id: 'order-1', coinsSpent: 50 };
      service.placeOrder.mockResolvedValue(order);

      const result = await controller.placeOrder(mockUser, { productId: 'p1' });

      expect(service.placeOrder).toHaveBeenCalledWith(mockUser, 'p1');
      expect(result).toEqual(order);
    });
  });

  describe('getMyOrders', () => {
    it('should delegate to service.getOrders with user id', async () => {
      const orders = [{ id: 'order-1' }];
      service.getOrders.mockResolvedValue(orders);

      const result = await controller.getMyOrders(mockUser);

      expect(service.getOrders).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(orders);
    });
  });

  describe('createProduct', () => {
    it('should delegate to service.createProduct', async () => {
      const productData = { code: 'MUG', name: 'Coffee Mug', price: 20 };
      const created = { id: 'p3', ...productData, isActive: true };
      service.createProduct.mockResolvedValue(created);

      const result = await controller.createProduct(productData);

      expect(service.createProduct).toHaveBeenCalledWith(productData);
      expect(result).toEqual(created);
    });
  });

  describe('updateProduct', () => {
    it('should delegate to service.updateProduct', async () => {
      const updateData = { name: 'Updated T-Shirt', price: 60 };
      const updated = { id: 'p1', ...updateData };
      service.updateProduct.mockResolvedValue(updated);

      const result = await controller.updateProduct('p1', updateData);

      expect(service.updateProduct).toHaveBeenCalledWith('p1', updateData);
      expect(result).toEqual(updated);
    });
  });

  describe('getAllOrders', () => {
    it('should delegate to service.listAllOrders', async () => {
      const orders = [{ id: 'order-1' }];
      service.listAllOrders.mockResolvedValue(orders);

      const result = await controller.getAllOrders();

      expect(service.listAllOrders).toHaveBeenCalled();
      expect(result).toEqual(orders);
    });
  });

  describe('fulfillOrder', () => {
    it('should delegate to service.fulfillOrder', async () => {
      const fulfilled = { id: 'order-1', status: 'FULFILLED' };
      service.fulfillOrder.mockResolvedValue(fulfilled);

      const result = await controller.fulfillOrder('order-1');

      expect(service.fulfillOrder).toHaveBeenCalledWith('order-1');
      expect(result).toEqual(fulfilled);
    });
  });

  describe('cancelOrder', () => {
    it('should delegate to service.cancelOrder', async () => {
      const cancelled = { id: 'order-1', status: 'CANCELLED' };
      service.cancelOrder.mockResolvedValue(cancelled);

      const result = await controller.cancelOrder('order-1');

      expect(service.cancelOrder).toHaveBeenCalledWith('order-1');
      expect(result).toEqual(cancelled);
    });
  });
});

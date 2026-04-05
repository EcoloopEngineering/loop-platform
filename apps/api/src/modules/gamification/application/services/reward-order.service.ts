import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CoinService } from './coin.service';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import {
  REWARD_REPOSITORY,
  RewardRepositoryPort,
} from '../ports/reward.repository.port';

@Injectable()
export class RewardOrderService {
  constructor(
    @Inject(REWARD_REPOSITORY)
    private readonly rewardRepo: RewardRepositoryPort,
    private readonly coinService: CoinService,
  ) {}

  async listProducts() {
    return this.rewardRepo.findActiveProducts();
  }

  async listAllProducts() {
    return this.rewardRepo.findAllProducts();
  }

  async placeOrder(user: AuthenticatedUser, productId: string) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    const product = await this.rewardRepo.findProductById(productId);

    if (!product || !product.isActive) {
      throw new BadRequestException('Product not found or inactive');
    }

    if (product.stock !== null && product.stock !== undefined && product.stock <= 0) {
      throw new BadRequestException('Product is out of stock');
    }

    await this.coinService.deductCoins(
      user.id,
      product.price,
      `Reward order: ${product.name}`,
    );

    const order = await this.rewardRepo.createOrder({
      userId: user.id,
      productId: product.id,
      coinsSpent: product.price,
    });

    // Decrement stock if tracked
    if (product.stock !== null && product.stock !== undefined) {
      await this.rewardRepo.updateProduct(product.id, { stock: product.stock - 1 });
    }

    return order;
  }

  async getOrders(userId: string) {
    return this.rewardRepo.findOrdersByUser(userId);
  }

  async createProduct(body: {
    code?: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
  }) {
    const code =
      body.code ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now().toString(36);

    return this.rewardRepo.createProduct({
      code,
      name: body.name,
      description: body.description,
      price: body.price,
      imageUrl: body.imageUrl,
    });
  }

  async updateProduct(
    id: string,
    body: {
      name?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
      isActive?: boolean;
    },
  ) {
    return this.rewardRepo.updateProduct(id, body);
  }

  async deleteProduct(id: string) {
    return this.rewardRepo.deleteProduct(id);
  }

  async listAllOrders() {
    return this.rewardRepo.findAllOrders();
  }

  async fulfillOrder(id: string) {
    const order = await this.rewardRepo.findOrderById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Only PENDING orders can be fulfilled',
      );
    }

    return this.rewardRepo.updateOrderStatus(id, 'FULFILLED');
  }

  async cancelOrder(id: string) {
    const order = await this.rewardRepo.findOrderByIdWithProduct(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Order already cancelled');
    }

    await this.coinService.addCoins(
      order.userId,
      order.coinsSpent,
      `Refund: ${order.product.name} order cancelled`,
    );

    return this.rewardRepo.updateOrderStatus(id, 'CANCELLED');
  }
}

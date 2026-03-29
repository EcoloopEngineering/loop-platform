import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CoinService } from './coin.service';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';

@Injectable()
export class RewardOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coinService: CoinService,
  ) {}

  async listProducts() {
    return this.prisma.rewardProduct.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async placeOrder(user: AuthenticatedUser, productId: string) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    const product = await this.prisma.rewardProduct.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new BadRequestException('Product not found or inactive');
    }

    await this.coinService.deductCoins(
      user.id,
      product.price,
      `Reward order: ${product.name}`,
    );

    return this.prisma.rewardOrder.create({
      data: {
        userId: user.id,
        productId: product.id,
        coinsSpent: product.price,
      },
      include: { product: true },
    });
  }

  async getOrders(userId: string) {
    return this.prisma.rewardOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { product: true },
    });
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

    return this.prisma.rewardProduct.create({
      data: {
        code,
        name: body.name,
        description: body.description,
        price: body.price,
        imageUrl: body.imageUrl,
      },
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
    return this.prisma.rewardProduct.update({
      where: { id },
      data: body,
    });
  }

  async listAllOrders() {
    return this.prisma.rewardOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async fulfillOrder(id: string) {
    const order = await this.prisma.rewardOrder.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Only PENDING orders can be fulfilled',
      );
    }

    return this.prisma.rewardOrder.update({
      where: { id },
      data: { status: 'FULFILLED' },
      include: { product: true },
    });
  }

  async cancelOrder(id: string) {
    const order = await this.prisma.rewardOrder.findUnique({
      where: { id },
      include: { product: true },
    });

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

    return this.prisma.rewardOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { product: true },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { RewardRepositoryPort } from '../../application/ports/reward.repository.port';

@Injectable()
export class PrismaRewardRepository implements RewardRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveProducts(): Promise<any[]> {
    return this.prisma.rewardProduct.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async findProductById(id: string): Promise<any | null> {
    return this.prisma.rewardProduct.findUnique({ where: { id } });
  }

  async createProduct(data: {
    code: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
  }): Promise<any> {
    return this.prisma.rewardProduct.create({ data });
  }

  async updateProduct(id: string, data: Record<string, unknown>): Promise<any> {
    return this.prisma.rewardProduct.update({
      where: { id },
      data: data as any,
    });
  }

  async createOrder(data: {
    userId: string;
    productId: string;
    coinsSpent: number;
  }): Promise<any> {
    return this.prisma.rewardOrder.create({
      data,
      include: { product: true },
    });
  }

  async findOrdersByUser(userId: string): Promise<any[]> {
    return this.prisma.rewardOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { product: true },
    });
  }

  async findAllOrders(): Promise<any[]> {
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

  async findOrderById(id: string): Promise<any | null> {
    return this.prisma.rewardOrder.findUnique({ where: { id } });
  }

  async findOrderByIdWithProduct(id: string): Promise<any | null> {
    return this.prisma.rewardOrder.findUnique({
      where: { id },
      include: { product: true },
    });
  }

  async updateOrderStatus(id: string, status: string): Promise<any> {
    return this.prisma.rewardOrder.update({
      where: { id },
      data: { status: status as any },
      include: { product: true },
    });
  }
}

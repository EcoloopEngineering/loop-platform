import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@loop/shared';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CoinService } from '../application/services/coin.service';

@ApiTags('rewards')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('rewards')
export class RewardsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coinService: CoinService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active reward products' })
  async listProducts() {
    return this.prisma.rewardProduct.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  @Post('order')
  @ApiOperation({ summary: 'Place a reward order (deducts coins)' })
  async placeOrder(
    @CurrentUser() user: any,
    @Body() body: { productId: string },
  ) {
    if (!body.productId) {
      throw new BadRequestException('productId is required');
    }

    const product = await this.prisma.rewardProduct.findUnique({
      where: { id: body.productId },
    });

    if (!product || !product.isActive) {
      throw new BadRequestException('Product not found or inactive');
    }

    // Deduct coins (throws if insufficient)
    await this.coinService.deductCoins(
      user.id,
      product.price,
      `Reward order: ${product.name}`,
    );

    const order = await this.prisma.rewardOrder.create({
      data: {
        userId: user.id,
        productId: product.id,
        coinsSpent: product.price,
      },
      include: { product: true },
    });

    return order;
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get my reward orders' })
  async getMyOrders(@CurrentUser() user: any) {
    return this.prisma.rewardOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { product: true },
    });
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a reward product (admin only)' })
  async createProduct(
    @Body()
    body: {
      code?: string;
      name: string;
      description?: string;
      price: number;
      imageUrl?: string;
    },
  ) {
    const code = body.code || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
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

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a reward product (admin only)' })
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
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

  @Get('orders/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all orders (admin)' })
  async getAllOrders() {
    return this.prisma.rewardOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  @Patch('orders/:id/fulfill')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Fulfill an order (admin)' })
  async fulfillOrder(@Param('id', ParseUUIDPipe) id: string) {
    const order = await this.prisma.rewardOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PENDING') throw new BadRequestException('Only PENDING orders can be fulfilled');

    return this.prisma.rewardOrder.update({
      where: { id },
      data: { status: 'FULFILLED' },
      include: { product: true },
    });
  }

  @Patch('orders/:id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel an order and refund coins (admin)' })
  async cancelOrder(@Param('id', ParseUUIDPipe) id: string) {
    const order = await this.prisma.rewardOrder.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'CANCELLED') throw new BadRequestException('Order already cancelled');

    // Refund coins
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

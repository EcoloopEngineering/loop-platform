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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { UserRole } from '@loop/shared';
import { RewardOrderService } from '../application/services/reward-order.service';

@ApiTags('rewards')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardOrderService: RewardOrderService) {}

  @Get()
  @ApiOperation({ summary: 'List active reward products' })
  async listProducts() {
    return this.rewardOrderService.listProducts();
  }

  @Post('order')
  @ApiOperation({ summary: 'Place a reward order (deducts coins)' })
  async placeOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { productId: string },
  ) {
    return this.rewardOrderService.placeOrder(user, body.productId);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get my reward orders' })
  async getMyOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.rewardOrderService.getOrders(user.id);
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
    return this.rewardOrderService.createProduct(body);
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
    return this.rewardOrderService.updateProduct(id, body);
  }

  @Get('orders/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all orders (admin)' })
  async getAllOrders() {
    return this.rewardOrderService.listAllOrders();
  }

  @Patch('orders/:id/fulfill')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Fulfill an order (admin)' })
  async fulfillOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.rewardOrderService.fulfillOrder(id);
  }

  @Patch('orders/:id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel an order and refund coins (admin)' })
  async cancelOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.rewardOrderService.cancelOrder(id);
  }
}

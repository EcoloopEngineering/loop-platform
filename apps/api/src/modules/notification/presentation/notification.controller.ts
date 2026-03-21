import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { NotificationService } from '../application/services/notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for the current user' })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.notificationService.getByUser(
      user.id,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
    );
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@Param('id') id: string) {
    return this.notificationService.markRead(id);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: any) {
    return this.notificationService.markAllRead(user.id);
  }
}

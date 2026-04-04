import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@loop/shared';
import { LeadChatService } from '../application/services/lead-chat.service';
import { CreateLeadChatDto } from '../application/dto/create-lead-chat.dto';

@ApiTags('Lead Chat')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('leads')
export class LeadChatController {
  constructor(private readonly leadChatService: LeadChatService) {}

  @Post(':leadId/chat')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Send a message in lead deal chat' })
  async create(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: CreateLeadChatDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.leadChatService.sendMessage(leadId, userId, dto.message);
  }

  @Get(':leadId/chat')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP, UserRole.REFERRAL)
  @ApiOperation({ summary: 'List all deal chat messages for a lead' })
  async findAll(@Param('leadId', ParseUUIDPipe) leadId: string) {
    return this.leadChatService.getMessages(leadId);
  }

  @Post(':leadId/chat/follow')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Follow lead chat notifications' })
  async follow(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leadChatService.follow(leadId, userId);
  }

  @Delete(':leadId/chat/follow')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Unfollow lead chat notifications' })
  async unfollow(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leadChatService.unfollow(leadId, userId);
  }

  @Get(':leadId/chat/follow')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Check if current user follows this lead chat' })
  async isFollowing(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leadChatService.isFollowing(leadId, userId);
  }
}

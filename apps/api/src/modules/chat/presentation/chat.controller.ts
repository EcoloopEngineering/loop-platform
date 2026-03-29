import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseUUIDPipe, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { UserRole } from '@loop/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ChatService } from '../application/services/chat.service';
import { FaqService } from '../application/services/faq.service';

class CreateFaqDto {
  @IsNotEmpty() @IsString() question: string;
  @IsNotEmpty() @IsString() answer: string;
  @IsOptional() @IsString({ each: true }) keywords?: string[];
  @IsOptional() @IsString() category?: string;
}

class UpdateFaqDto {
  @IsOptional() @IsString() question?: string;
  @IsOptional() @IsString() answer?: string;
  @IsOptional() @IsString({ each: true }) keywords?: string[];
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('Chat')
@Controller()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly faqService: FaqService,
  ) {}

  // ---- Conversations ----
  @Get('chat/conversations')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List conversations (for agents)' })
  async listConversations(@Query('status') status?: string) {
    return this.chatService.getConversations({ status });
  }

  @Get('chat/conversations/:id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get conversation with messages' })
  async getConversation(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatService.getConversation(id);
  }

  @Post('chat/conversations/:id/assign')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign agent to conversation' })
  async assignAgent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') agentId: string,
  ) {
    return this.chatService.assignAgent(id, agentId);
  }

  @Post('chat/conversations/:id/close')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close conversation' })
  async closeConversation(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatService.closeConversation(id);
  }

  // ---- FAQ Management ----
  @Get('chat/faq')
  @SetMetadata('isPublic', true)
  @ApiOperation({ summary: 'List all FAQ entries' })
  async listFaqs() {
    return this.faqService.getAllFaqs();
  }

  @Post('chat/faq')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create FAQ entry' })
  async createFaq(@Body() dto: CreateFaqDto) {
    return this.faqService.createFaq(dto);
  }

  @Put('chat/faq/:id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update FAQ entry' })
  async updateFaq(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFaqDto,
  ) {
    return this.faqService.updateFaq(id, dto);
  }

  @Delete('chat/faq/:id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete FAQ entry' })
  async deleteFaq(@Param('id', ParseUUIDPipe) id: string) {
    return this.faqService.deleteFaq(id);
  }
}

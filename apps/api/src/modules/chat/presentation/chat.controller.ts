import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ChatService } from '../application/services/chat.service';
import { FaqService } from '../application/services/faq.service';

@ApiTags('Chat')
@Controller()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly faqService: FaqService,
  ) {}

  // ---- Conversations ----
  @Get('chat/conversations')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List conversations (for agents)' })
  async listConversations(@Query('status') status?: string) {
    return this.chatService.getConversations({ status });
  }

  @Get('chat/conversations/:id')
  @ApiOperation({ summary: 'Get conversation with messages' })
  async getConversation(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatService.getConversation(id);
  }

  @Post('chat/conversations/:id/assign')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign agent to conversation' })
  async assignAgent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') agentId: string,
  ) {
    return this.chatService.assignAgent(id, agentId);
  }

  @Post('chat/conversations/:id/close')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close conversation' })
  async closeConversation(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatService.closeConversation(id);
  }

  // ---- FAQ Management ----
  @Get('chat/faq')
  @ApiOperation({ summary: 'List all FAQ entries' })
  async listFaqs() {
    return this.faqService.getAllFaqs();
  }

  @Post('chat/faq')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create FAQ entry' })
  async createFaq(@Body() dto: { question: string; answer: string; keywords?: string[]; category?: string }) {
    return this.faqService.createFaq(dto);
  }

  @Put('chat/faq/:id')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update FAQ entry' })
  async updateFaq(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { question?: string; answer?: string; keywords?: string[]; category?: string; isActive?: boolean },
  ) {
    return this.faqService.updateFaq(id, dto);
  }

  @Delete('chat/faq/:id')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete FAQ entry' })
  async deleteFaq(@Param('id', ParseUUIDPipe) id: string) {
    return this.faqService.deleteFaq(id);
  }
}

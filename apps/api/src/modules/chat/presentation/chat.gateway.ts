import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../application/services/chat.service';
import { FaqService } from '../application/services/faq.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly faqService: FaqService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('start_conversation')
  async handleStartConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId?: string; visitorName?: string; visitorEmail?: string; subject?: string },
  ) {
    const conversation = await this.chatService.createConversation(data);

    // Join the conversation room
    client.join(`conv:${conversation.id}`);

    // Send welcome message from bot
    const welcomeMsg = await this.chatService.addMessage({
      conversationId: conversation.id,
      senderType: 'BOT',
      content: 'Hi! Welcome to ecoLoop Support. How can I help you today? You can ask me a question or type "agent" to talk to a real person.',
      isAutoReply: true,
    });

    client.emit('conversation_started', { conversation, message: welcomeMsg });
    return { conversationId: conversation.id };
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conv:${data.conversationId}`);
    const conversation = await this.chatService.getConversation(data.conversationId);
    client.emit('conversation_loaded', conversation);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string; senderId?: string },
  ) {
    // Save user message
    const userMessage = await this.chatService.addMessage({
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderType: 'USER',
      content: data.content,
    });

    // Broadcast to room (agents listening)
    this.server.to(`conv:${data.conversationId}`).emit('new_message', userMessage);

    // Check if requesting human agent
    if (data.content.toLowerCase().includes('agent') || data.content.toLowerCase().includes('human') || data.content.toLowerCase().includes('person')) {
      await this.chatService.requestAgent(data.conversationId);
      const botMsg = await this.chatService.addMessage({
        conversationId: data.conversationId,
        senderType: 'BOT',
        content: "I'm connecting you with a team member. Please hold on, someone will be with you shortly!",
        isAutoReply: true,
      });
      this.server.to(`conv:${data.conversationId}`).emit('new_message', botMsg);

      // Notify agents
      this.server.emit('agent_requested', { conversationId: data.conversationId });
      return;
    }

    // Try FAQ auto-reply
    const conversation = await this.chatService.getConversation(data.conversationId);
    if (conversation?.status === 'OPEN') {
      const faqAnswer = await this.faqService.findAnswer(data.content);
      if (faqAnswer) {
        const botMsg = await this.chatService.addMessage({
          conversationId: data.conversationId,
          senderType: 'BOT',
          content: faqAnswer.answer,
          isAutoReply: true,
        });
        this.server.to(`conv:${data.conversationId}`).emit('new_message', botMsg);

        // Follow up
        const followUp = await this.chatService.addMessage({
          conversationId: data.conversationId,
          senderType: 'BOT',
          content: 'Did that answer your question? If not, type "agent" to talk to a real person.',
          isAutoReply: true,
        });
        setTimeout(() => {
          this.server.to(`conv:${data.conversationId}`).emit('new_message', followUp);
        }, 1000);
      } else {
        // No FAQ match — suggest agent
        const botMsg = await this.chatService.addMessage({
          conversationId: data.conversationId,
          senderType: 'BOT',
          content: "I'm not sure about that. Would you like me to connect you with a team member? Just type \"agent\" and I'll get someone for you.",
          isAutoReply: true,
        });
        this.server.to(`conv:${data.conversationId}`).emit('new_message', botMsg);
      }
    }
  }

  @SubscribeMessage('agent_message')
  async handleAgentMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string; agentId: string },
  ) {
    const message = await this.chatService.addMessage({
      conversationId: data.conversationId,
      senderId: data.agentId,
      senderType: 'AGENT',
      content: data.content,
    });
    this.server.to(`conv:${data.conversationId}`).emit('new_message', message);
  }

  @SubscribeMessage('agent_join')
  async handleAgentJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; agentId: string },
  ) {
    client.join(`conv:${data.conversationId}`);
    await this.chatService.assignAgent(data.conversationId, data.agentId);

    const joinMsg = await this.chatService.addMessage({
      conversationId: data.conversationId,
      senderType: 'BOT',
      content: 'A team member has joined the conversation. How can we help?',
      isAutoReply: true,
    });
    this.server.to(`conv:${data.conversationId}`).emit('new_message', joinMsg);
    this.server.to(`conv:${data.conversationId}`).emit('agent_joined', { agentId: data.agentId });
  }

  @SubscribeMessage('close_conversation')
  async handleClose(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.chatService.closeConversation(data.conversationId);

    const closeMsg = await this.chatService.addMessage({
      conversationId: data.conversationId,
      senderType: 'BOT',
      content: 'This conversation has been closed. Thank you for contacting ecoLoop Support!',
      isAutoReply: true,
    });
    this.server.to(`conv:${data.conversationId}`).emit('new_message', closeMsg);
    this.server.to(`conv:${data.conversationId}`).emit('conversation_closed');
  }
}

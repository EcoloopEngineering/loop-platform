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
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: {
    origin: [
      'https://loop.ecoloop.app',
      'https://app.ecoloop.us',
      'https://develop.ecoloop.us',
      ...(process.env.NODE_ENV !== 'production'
        ? ['http://localhost:9000', 'http://localhost:9001']
        : []),
    ],
    credentials: true,
  },
  namespace: '/lead-chat',
})
export class LeadChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(LeadChatGateway.name);
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.jwtSecret = this.configService.get<string>(
      'JWT_SECRET',
      'loop-platform-jwt-secret-change-in-prod',
    );
  }

  handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token || (client.handshake.query?.token as string);
    if (!token) {
      this.logger.warn(`Unauthenticated client rejected: ${client.id}`);
      client.disconnect();
      return;
    }
    try {
      client.data.user = jwt.verify(token, this.jwtSecret);
      this.logger.log(`Lead-chat client connected: ${client.id}`);
    } catch {
      this.logger.warn(`Invalid token, disconnecting: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Lead-chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_lead')
  handleJoinLead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { leadId: string },
  ) {
    if (!client.data?.user) return;
    client.join(`lead:${data.leadId}`);
    this.logger.debug(`Client ${client.id} joined lead:${data.leadId}`);
  }

  @SubscribeMessage('leave_lead')
  handleLeaveLead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { leadId: string },
  ) {
    client.leave(`lead:${data.leadId}`);
  }

  /** Broadcast when a new lead chat message is created via REST */
  @OnEvent('lead.chat.message')
  handleLeadChatMessage(payload: {
    leadId: string;
    message: {
      id: string;
      leadId: string;
      userId: string;
      message: string;
      createdAt: Date;
      user: { id: string; firstName: string; lastName: string; profileImage: string | null };
    };
  }) {
    this.server
      .to(`lead:${payload.leadId}`)
      .emit('new_message', payload.message);
  }

  /** Broadcast typing indicator */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { leadId: string },
  ) {
    if (!client.data?.user) return;
    const user = client.data.user as { sub?: string; firstName?: string; lastName?: string };
    client.to(`lead:${data.leadId}`).emit('user_typing', {
      userId: user.sub,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    });
  }
}

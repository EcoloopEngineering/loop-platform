import { ConfigService } from '@nestjs/config';
import { LeadChatGateway } from './lead-chat.gateway';

describe('LeadChatGateway', () => {
  let gateway: LeadChatGateway;
  let mockServer: { to: jest.Mock; emit: jest.Mock };

  beforeEach(() => {
    const configService = { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService;
    gateway = new LeadChatGateway(configService);
    mockServer = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    (gateway as unknown as { server: typeof mockServer }).server = mockServer;
  });

  describe('handleLeadChatMessage', () => {
    it('should broadcast message to lead room', () => {
      const payload = {
        leadId: 'lead-1',
        message: {
          id: 'msg-1',
          leadId: 'lead-1',
          userId: 'user-1',
          message: 'Hello team',
          createdAt: new Date(),
          user: { id: 'user-1', firstName: 'John', lastName: 'Doe', profileImage: null },
        },
      };

      gateway.handleLeadChatMessage(payload);

      expect(mockServer.to).toHaveBeenCalledWith('lead:lead-1');
      expect(mockServer.emit).toHaveBeenCalledWith('new_message', payload.message);
    });
  });

  describe('handleJoinLead', () => {
    it('should join the lead room when authenticated', () => {
      const client = {
        data: { user: { sub: 'user-1' } },
        join: jest.fn(),
      } as unknown as Parameters<typeof gateway.handleJoinLead>[0];

      gateway.handleJoinLead(client, { leadId: 'lead-1' });

      expect(client.join).toHaveBeenCalledWith('lead:lead-1');
    });

    it('should not join when unauthenticated', () => {
      const client = {
        data: {},
        join: jest.fn(),
      } as unknown as Parameters<typeof gateway.handleJoinLead>[0];

      gateway.handleJoinLead(client, { leadId: 'lead-1' });

      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('handleLeaveLead', () => {
    it('should leave the lead room', () => {
      const client = {
        leave: jest.fn(),
      } as unknown as Parameters<typeof gateway.handleLeaveLead>[0];

      gateway.handleLeaveLead(client, { leadId: 'lead-1' });

      expect(client.leave).toHaveBeenCalledWith('lead:lead-1');
    });
  });

  describe('handleTyping', () => {
    it('should broadcast typing to other clients in lead room', () => {
      const client = {
        data: { user: { sub: 'user-1', firstName: 'John', lastName: 'Doe' } },
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      } as unknown as Parameters<typeof gateway.handleTyping>[0];

      gateway.handleTyping(client, { leadId: 'lead-1' });

      expect(client.to).toHaveBeenCalledWith('lead:lead-1');
    });

    it('should not broadcast typing when unauthenticated', () => {
      const client = {
        data: {},
        to: jest.fn(),
      } as unknown as Parameters<typeof gateway.handleTyping>[0];

      gateway.handleTyping(client, { leadId: 'lead-1' });

      expect(client.to).not.toHaveBeenCalled();
    });
  });
});

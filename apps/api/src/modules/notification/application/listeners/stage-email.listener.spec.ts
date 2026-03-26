import { Test, TestingModule } from '@nestjs/testing';
import { StageEmailListener } from './stage-email.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../../infrastructure/email/email.service';

describe('StageEmailListener', () => {
  let listener: StageEmailListener;
  let prisma: any;
  let emailService: { send: jest.Mock; isConfigured: jest.Mock };

  const mockLead = {
    id: 'lead-1',
    customer: { id: 'cust-1', firstName: 'John', email: 'john@example.com' },
    assignments: [
      { isPrimary: true, user: { email: 'owner@ecoloop.us', firstName: 'Alice' } },
    ],
    projectManager: { email: 'pm@ecoloop.us', firstName: 'Bob' },
  };

  beforeEach(async () => {
    prisma = {
      lead: { findUnique: jest.fn() },
    };
    emailService = {
      send: jest.fn().mockResolvedValue(true),
      isConfigured: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StageEmailListener,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    listener = module.get<StageEmailListener>(StageEmailListener);
  });

  it('should return early when email is not configured', async () => {
    emailService.isConfigured.mockReturnValue(false);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(prisma.lead.findUnique).not.toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('should send install-ready email to owner for INSTALL_READY stage', async () => {
    prisma.lead.findUnique.mockResolvedValue(mockLead);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'CONNECTED',
      newStage: 'INSTALL_READY',
    });

    expect(emailService.send).toHaveBeenCalledTimes(1);
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@ecoloop.us',
        subject: expect.stringContaining('Install Ready'),
      }),
    );
  });

  it('should send two emails for WON stage (owner + customer)', async () => {
    prisma.lead.findUnique.mockResolvedValue(mockLead);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'DESIGN_READY',
      newStage: 'WON',
    });

    expect(emailService.send).toHaveBeenCalledTimes(2);
    // Owner email
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@ecoloop.us',
        subject: expect.stringContaining('Deal Won'),
      }),
    );
    // Customer email
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'john@example.com',
        subject: expect.stringContaining('Welcome'),
      }),
    );
  });

  it('should send generic stage email for non-special stages', async () => {
    prisma.lead.findUnique.mockResolvedValue(mockLead);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'DESIGN_READY',
      newStage: 'SITE_AUDIT',
    });

    expect(emailService.send).toHaveBeenCalled();
  });

  it('should send generic stage email to owner and PM for other stages', async () => {
    prisma.lead.findUnique.mockResolvedValue(mockLead);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_IN_PROGRESS',
    });

    expect(emailService.send).toHaveBeenCalledTimes(1);
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['owner@ecoloop.us', 'pm@ecoloop.us'],
        subject: expect.stringContaining('Design In Progress'),
      }),
    );
  });

  it('should return early when lead is not found', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);

    await listener.handleStageChanged({
      leadId: 'nonexistent',
      customerName: 'Ghost',
      previousStage: 'NEW_LEAD',
      newStage: 'WON',
    });

    expect(emailService.send).not.toHaveBeenCalled();
  });
});

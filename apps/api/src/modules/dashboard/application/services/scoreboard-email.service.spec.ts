import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { ScoreboardEmailService } from './scoreboard-email.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { GetScoreboardQuery } from '../queries/get-scoreboard.handler';

describe('ScoreboardEmailService', () => {
  let service: ScoreboardEmailService;
  let queryBus: { execute: jest.Mock };
  let emailService: { send: jest.Mock };

  const mockScoreboard = [
    { userId: 'u1', userName: 'Alice Smith', wonDeals: 5, totalCommission: 12000 },
    { userId: 'u2', userName: 'Bob Jones', wonDeals: 3, totalCommission: 8500 },
  ];

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };
    emailService = { send: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreboardEmailService,
        { provide: QueryBus, useValue: queryBus },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<ScoreboardEmailService>(ScoreboardEmailService);
  });

  it('should fetch scoreboard and send email', async () => {
    queryBus.execute.mockResolvedValue(mockScoreboard);
    emailService.send.mockResolvedValue(true);

    const result = await service.sendScoreboardEmail(
      new Date('2026-01-01'),
      new Date('2026-03-31'),
      ['admin@ecoloop.us'],
    );

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetScoreboardQuery('2026-01-01T00:00:00.000Z', '2026-03-31T00:00:00.000Z', 50),
    );
    expect(emailService.send).toHaveBeenCalledWith({
      to: ['admin@ecoloop.us'],
      subject: expect.stringContaining('Scoreboard'),
      html: expect.stringContaining('Alice Smith'),
    });
    expect(result).toEqual({ sent: true, recipientCount: 1 });
  });

  it('should return sent false when email fails', async () => {
    queryBus.execute.mockResolvedValue(mockScoreboard);
    emailService.send.mockResolvedValue(false);

    const result = await service.sendScoreboardEmail(
      new Date('2026-01-01'),
      new Date('2026-03-31'),
      ['admin@ecoloop.us'],
    );

    expect(result).toEqual({ sent: false, recipientCount: 1 });
  });

  it('should send to multiple recipients', async () => {
    queryBus.execute.mockResolvedValue([]);
    emailService.send.mockResolvedValue(true);

    const recipients = ['a@ecoloop.us', 'b@ecoloop.us', 'c@ecoloop.us'];
    const result = await service.sendScoreboardEmail(
      new Date('2026-02-01'),
      new Date('2026-02-28'),
      recipients,
    );

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: recipients }),
    );
    expect(result).toEqual({ sent: true, recipientCount: 3 });
  });

  it('should include date range in email subject', async () => {
    queryBus.execute.mockResolvedValue([]);
    emailService.send.mockResolvedValue(true);

    await service.sendScoreboardEmail(
      new Date('2026-01-01'),
      new Date('2026-03-31'),
      ['admin@ecoloop.us'],
    );

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('2026-01-01'),
      }),
    );
  });

  it('should include all scoreboard entries in the HTML', async () => {
    queryBus.execute.mockResolvedValue(mockScoreboard);
    emailService.send.mockResolvedValue(true);

    await service.sendScoreboardEmail(
      new Date('2026-01-01'),
      new Date('2026-03-31'),
      ['admin@ecoloop.us'],
    );

    const html = emailService.send.mock.calls[0][0].html;
    expect(html).toContain('Alice Smith');
    expect(html).toContain('Bob Jones');
    expect(html).toContain('$12,000.00');
    expect(html).toContain('$8,500.00');
  });

  it('should handle empty scoreboard gracefully', async () => {
    queryBus.execute.mockResolvedValue([]);
    emailService.send.mockResolvedValue(true);

    await service.sendScoreboardEmail(
      new Date('2026-01-01'),
      new Date('2026-03-31'),
      ['admin@ecoloop.us'],
    );

    const html = emailService.send.mock.calls[0][0].html;
    expect(html).toContain('No data for this period');
  });
});

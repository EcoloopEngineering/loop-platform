import { EmailProcessor, EmailJobData } from './email.processor';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let emailService: { send: jest.Mock };

  beforeEach(() => {
    emailService = { send: jest.fn() };
    processor = new EmailProcessor(emailService as any);
  });

  const makeJob = (data: EmailJobData, id = 'job-1') =>
    ({ data, id } as any);

  it('should call emailService.send with correct data', async () => {
    emailService.send.mockResolvedValue(true);

    const job = makeJob({
      to: 'john@example.com',
      subject: 'Welcome',
      html: '<p>Hello</p>',
    });

    await processor.process(job);

    expect(emailService.send).toHaveBeenCalledWith({
      to: 'john@example.com',
      subject: 'Welcome',
      html: '<p>Hello</p>',
    });
  });

  it('should throw when email send returns false (so BullMQ retries)', async () => {
    emailService.send.mockResolvedValue(false);

    const job = makeJob(
      {
        to: 'fail@example.com',
        subject: 'Test',
        html: '<p>Fail</p>',
      },
      'job-fail',
    );

    await expect(processor.process(job)).rejects.toThrow(
      'Email delivery failed for job job-fail',
    );
  });

  it('should pass through email data correctly for array recipients', async () => {
    emailService.send.mockResolvedValue(true);

    const recipients = ['a@test.com', 'b@test.com'];
    const job = makeJob({
      to: recipients,
      subject: 'Bulk',
      html: '<p>Bulk mail</p>',
    });

    await processor.process(job);

    expect(emailService.send).toHaveBeenCalledWith({
      to: recipients,
      subject: 'Bulk',
      html: '<p>Bulk mail</p>',
    });
  });

  it('should propagate errors from emailService.send', async () => {
    emailService.send.mockRejectedValue(new Error('SMTP connection failed'));

    const job = makeJob({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    await expect(processor.process(job)).rejects.toThrow(
      'SMTP connection failed',
    );
  });
});

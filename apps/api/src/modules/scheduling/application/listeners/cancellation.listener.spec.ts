import { Test, TestingModule } from '@nestjs/testing';
import { CancellationListener } from './cancellation.listener';
import { CancellationService } from '../services/cancellation.service';

describe('CancellationListener', () => {
  let listener: CancellationListener;
  let service: { handleStatusChanged: jest.Mock };

  const basePayload = {
    leadId: 'lead-1',
    customerName: 'John Doe',
    newStatus: 'CANCELLED',
    previousStage: 'CONNECTED',
  };

  beforeEach(async () => {
    service = { handleStatusChanged: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancellationListener,
        { provide: CancellationService, useValue: service },
      ],
    }).compile();

    listener = module.get(CancellationListener);
  });

  it('delegates to CancellationService', async () => {
    await listener.handleStatusChanged(basePayload);
    expect(service.handleStatusChanged).toHaveBeenCalledWith(basePayload);
  });

  it('catches and logs errors without rethrowing', async () => {
    service.handleStatusChanged.mockRejectedValue(new Error('DB error'));
    await expect(
      listener.handleStatusChanged(basePayload),
    ).resolves.toBeUndefined();
  });
});

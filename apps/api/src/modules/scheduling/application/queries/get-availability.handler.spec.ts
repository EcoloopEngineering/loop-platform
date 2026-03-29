import { Test } from '@nestjs/testing';
import {
  GetAvailabilityHandler,
  GetAvailabilityQuery,
} from './get-availability.handler';
import { APPOINTMENT_REPOSITORY } from '../ports/appointment.repository.port';
import { JobberService } from '../../../../integrations/jobber/jobber.service';

describe('GetAvailabilityHandler', () => {
  let handler: GetAvailabilityHandler;
  let repo: Record<string, jest.Mock>;
  let jobberService: { getAvailabilitySlots: jest.Mock };

  beforeEach(async () => {
    repo = {
      findAppointmentsInRange: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      findActiveByLeadId: jest.fn(),
      findLeadWithStakeholders: jest.fn(),
      findLeadMetadata: jest.fn(),
      createLeadActivity: jest.fn(),
      findConflictingAppointment: jest.fn(),
      findLeadWithRelationsForBooking: jest.fn(),
      createAppointment: jest.fn(),
    };
    jobberService = {
      getAvailabilitySlots: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        GetAvailabilityHandler,
        { provide: APPOINTMENT_REPOSITORY, useValue: repo },
        { provide: JobberService, useValue: jobberService },
      ],
    }).compile();

    handler = module.get(GetAvailabilityHandler);
  });

  it('should use Jobber slots when coordinates are provided', async () => {
    const query = new GetAvailabilityQuery(
      'user-1',
      '2026-04-01',
      'SITE_AUDIT',
      30.0,
      -97.0,
    );

    const jobberSlots = [
      {
        start: new Date('2026-04-01T09:00:00Z'),
        end: new Date('2026-04-01T10:00:00Z'),
        available: true,
      },
      {
        start: new Date('2026-04-01T10:00:00Z'),
        end: new Date('2026-04-01T11:00:00Z'),
        available: false,
      },
    ];
    jobberService.getAvailabilitySlots.mockResolvedValue(jobberSlots);

    const result = await handler.execute(query);

    expect(jobberService.getAvailabilitySlots).toHaveBeenCalledWith(
      'SITE_AUDIT',
      30.0,
      -97.0,
      '2026-04-01T08:00:00Z',
      '2026-04-01T18:00:00Z',
    );
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe('jobber');
    expect(result[0].available).toBe(true);
    expect(result[1].available).toBe(false);
  });

  it('should fall back to local slots when Jobber fails', async () => {
    const query = new GetAvailabilityQuery(
      'user-1',
      '2026-04-01',
      'SITE_AUDIT',
      30.0,
      -97.0,
    );

    jobberService.getAvailabilitySlots.mockRejectedValue(
      new Error('Jobber API timeout'),
    );

    const result = await handler.execute(query);

    expect(result).toHaveLength(10); // 8am-6pm = 10 slots
    expect(result.every((s) => s.source === 'local')).toBe(true);
    expect(result.every((s) => s.available === true)).toBe(true);
  });

  it('should use local slots when no coordinates are provided', async () => {
    const query = new GetAvailabilityQuery('user-1', '2026-04-01');

    const result = await handler.execute(query);

    expect(jobberService.getAvailabilitySlots).not.toHaveBeenCalled();
    expect(result).toHaveLength(10);
    expect(result[0].source).toBe('local');
  });

  it('should mark slots as unavailable when appointments exist', async () => {
    const query = new GetAvailabilityQuery('user-1', '2026-04-01');

    const existingAppointment = {
      id: 'appt-1',
      scheduledAt: new Date('2026-04-01T10:00:00Z'),
      duration: 60, // 60 minutes
      status: 'CONFIRMED',
    };
    repo.findAppointmentsInRange.mockResolvedValue([existingAppointment]);

    const result = await handler.execute(query);

    // 10:00-11:00 slot should be unavailable
    const slot10am = result.find(
      (s) => s.start.getTime() === new Date('2026-04-01T10:00:00Z').getTime(),
    );
    expect(slot10am?.available).toBe(false);

    // 9:00-10:00 slot should be available
    const slot9am = result.find(
      (s) => s.start.getTime() === new Date('2026-04-01T09:00:00Z').getTime(),
    );
    expect(slot9am?.available).toBe(true);
  });

  it('should default type to SITE_AUDIT when not provided', async () => {
    const query = new GetAvailabilityQuery(
      'user-1',
      '2026-04-01',
      undefined,
      30.0,
      -97.0,
    );

    jobberService.getAvailabilitySlots.mockResolvedValue([]);

    await handler.execute(query);

    expect(jobberService.getAvailabilitySlots).toHaveBeenCalledWith(
      'SITE_AUDIT',
      expect.any(Number),
      expect.any(Number),
      expect.any(String),
      expect.any(String),
    );
  });

  it('should handle overlapping appointments marking multiple slots unavailable', async () => {
    const query = new GetAvailabilityQuery('user-1', '2026-04-01');

    // 2-hour appointment starting at 14:00
    const longAppointment = {
      id: 'appt-2',
      scheduledAt: new Date('2026-04-01T14:00:00Z'),
      duration: 120,
      status: 'PENDING',
    };
    repo.findAppointmentsInRange.mockResolvedValue([longAppointment]);

    const result = await handler.execute(query);

    const slot14 = result.find(
      (s) => s.start.getTime() === new Date('2026-04-01T14:00:00Z').getTime(),
    );
    const slot15 = result.find(
      (s) => s.start.getTime() === new Date('2026-04-01T15:00:00Z').getTime(),
    );
    const slot13 = result.find(
      (s) => s.start.getTime() === new Date('2026-04-01T13:00:00Z').getTime(),
    );

    expect(slot14?.available).toBe(false);
    expect(slot15?.available).toBe(false);
    expect(slot13?.available).toBe(true);
  });
});

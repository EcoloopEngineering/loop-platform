import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentService } from './appointment.service';
import { JobberService } from '../../../../integrations/jobber/jobber.service';
import { APPOINTMENT_REPOSITORY } from '../ports/appointment.repository.port';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let mockRepo: Record<string, jest.Mock>;
  let jobberService: { rescheduleVisit: jest.Mock; cancelVisit: jest.Mock };

  beforeEach(async () => {
    mockRepo = {
      update: jest.fn(),
    };
    jobberService = {
      rescheduleVisit: jest.fn().mockResolvedValue({}),
      cancelVisit: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
        { provide: APPOINTMENT_REPOSITORY, useValue: mockRepo },
        { provide: JobberService, useValue: jobberService },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
  });

  describe('reschedule', () => {
    it('should update appointment and sync to Jobber when jobberVisitId exists', async () => {
      const updated = {
        id: 'appt-1',
        jobberVisitId: 'jobber-1',
        duration: 60,
        scheduledAt: new Date('2026-04-02T10:00:00Z'),
      };
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.reschedule(
        'appt-1',
        '2026-04-02T10:00:00Z',
        90,
      );

      expect(mockRepo.update).toHaveBeenCalledWith('appt-1', {
        scheduledAt: new Date('2026-04-02T10:00:00Z'),
        duration: 90,
        status: 'PENDING',
      });
      expect(result).toEqual(updated);
      expect(jobberService.rescheduleVisit).toHaveBeenCalledWith(
        'jobber-1',
        '2026-04-02T10:00:00Z',
        expect.any(String),
      );
    });

    it('should not sync to Jobber when no jobberVisitId', async () => {
      const updated = { id: 'appt-1', jobberVisitId: null, duration: 60 };
      mockRepo.update.mockResolvedValue(updated);

      await service.reschedule('appt-1', '2026-04-02T10:00:00Z');

      expect(jobberService.rescheduleVisit).not.toHaveBeenCalled();
    });

    it('should use appointment duration when no override provided', async () => {
      const updated = {
        id: 'appt-1',
        jobberVisitId: 'jobber-1',
        duration: 45,
        scheduledAt: new Date('2026-04-02T10:00:00Z'),
      };
      mockRepo.update.mockResolvedValue(updated);

      await service.reschedule('appt-1', '2026-04-02T10:00:00Z');

      expect(mockRepo.update).toHaveBeenCalledWith('appt-1', {
        scheduledAt: new Date('2026-04-02T10:00:00Z'),
        status: 'PENDING',
      });
      // Should use appointment.duration (45) for end time calculation
      const expectedEnd = new Date(
        new Date('2026-04-02T10:00:00Z').getTime() + 45 * 60_000,
      ).toISOString();
      expect(jobberService.rescheduleVisit).toHaveBeenCalledWith(
        'jobber-1',
        '2026-04-02T10:00:00Z',
        expectedEnd,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel appointment and sync to Jobber', async () => {
      const cancelled = {
        id: 'appt-1',
        jobberVisitId: 'jobber-1',
        status: 'CANCELLED',
      };
      mockRepo.update.mockResolvedValue(cancelled);

      const result = await service.cancel('appt-1', 'Customer request');

      expect(mockRepo.update).toHaveBeenCalledWith('appt-1', {
        status: 'CANCELLED',
        notes: 'Customer request',
      });
      expect(result).toEqual(cancelled);
      expect(jobberService.cancelVisit).toHaveBeenCalledWith('jobber-1');
    });

    it('should not sync to Jobber when no jobberVisitId', async () => {
      const cancelled = {
        id: 'appt-1',
        jobberVisitId: null,
        status: 'CANCELLED',
      };
      mockRepo.update.mockResolvedValue(cancelled);

      await service.cancel('appt-1', 'No show');

      expect(jobberService.cancelVisit).not.toHaveBeenCalled();
    });
  });

  describe('calculateEndTime', () => {
    it('should add duration in minutes to the start time', () => {
      const result = service.calculateEndTime('2026-04-01T10:00:00Z', 90);

      expect(result).toEqual(new Date('2026-04-01T11:30:00Z'));
    });

    it('should handle zero duration', () => {
      const result = service.calculateEndTime('2026-04-01T10:00:00Z', 0);

      expect(result).toEqual(new Date('2026-04-01T10:00:00Z'));
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SchedulingController } from './scheduling.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { JobberService } from '../../../integrations/jobber/jobber.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { createMockPrismaService, MockPrismaService } from '../../../test/prisma-mock.helper';
import { GetAvailabilityQuery } from '../application/queries/get-availability.handler';
import { BookAppointmentCommand } from '../application/commands/book-appointment.handler';

describe('SchedulingController', () => {
  let controller: SchedulingController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let prisma: MockPrismaService;
  let jobberService: { rescheduleVisit: jest.Mock; cancelVisit: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    prisma = createMockPrismaService();
    jobberService = {
      rescheduleVisit: jest.fn().mockResolvedValue({}),
      cancelVisit: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulingController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: PrismaService, useValue: prisma },
        { provide: JobberService, useValue: jobberService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SchedulingController>(SchedulingController);
  });

  describe('getAvailability', () => {
    it('should execute GetAvailabilityQuery with userId and date', async () => {
      const slots = [{ time: '09:00', available: true }];
      queryBus.execute.mockResolvedValue(slots);

      const result = await controller.getAvailability('user-1', '2026-04-01');

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetAvailabilityQuery('user-1', '2026-04-01'),
      );
      expect(result).toEqual(slots);
    });
  });

  describe('bookAppointment', () => {
    it('should execute BookAppointmentCommand', async () => {
      const appointment = { id: 'appt-1', leadId: 'lead-1' };
      commandBus.execute.mockResolvedValue(appointment);

      const result = await controller.bookAppointment(
        'lead-1',
        { type: 'SITE_SURVEY' as any, scheduledAt: '2026-04-01T10:00:00Z', duration: 60 },
        { id: 'user-1' },
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(BookAppointmentCommand),
      );
      expect(result).toEqual(appointment);
    });
  });

  describe('reschedule', () => {
    it('should update appointment and sync to Jobber', async () => {
      const updated = {
        id: 'appt-1',
        jobberVisitId: 'jobber-1',
        duration: 60,
        scheduledAt: new Date('2026-04-02T10:00:00Z'),
      };
      prisma.appointment.update.mockResolvedValue(updated);

      const result = await controller.reschedule('appt-1', {
        scheduledAt: '2026-04-02T10:00:00Z',
        duration: 90,
      });

      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: {
          scheduledAt: new Date('2026-04-02T10:00:00Z'),
          duration: 90,
          status: 'PENDING',
        },
      });
      expect(result).toEqual(updated);
      expect(jobberService.rescheduleVisit).toHaveBeenCalled();
    });

    it('should not sync to Jobber when no jobberVisitId', async () => {
      const updated = { id: 'appt-1', jobberVisitId: null, duration: 60 };
      prisma.appointment.update.mockResolvedValue(updated);

      await controller.reschedule('appt-1', { scheduledAt: '2026-04-02T10:00:00Z' });

      expect(jobberService.rescheduleVisit).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel appointment and sync to Jobber', async () => {
      const cancelled = { id: 'appt-1', jobberVisitId: 'jobber-1', status: 'CANCELLED' };
      prisma.appointment.update.mockResolvedValue(cancelled);

      const result = await controller.cancel('appt-1', { reason: 'Customer request' });

      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: { status: 'CANCELLED', notes: 'Customer request' },
      });
      expect(result).toEqual(cancelled);
      expect(jobberService.cancelVisit).toHaveBeenCalledWith('jobber-1');
    });

    it('should not sync to Jobber when no jobberVisitId', async () => {
      const cancelled = { id: 'appt-1', jobberVisitId: null, status: 'CANCELLED' };
      prisma.appointment.update.mockResolvedValue(cancelled);

      await controller.cancel('appt-1', { reason: 'No show' });

      expect(jobberService.cancelVisit).not.toHaveBeenCalled();
    });
  });
});

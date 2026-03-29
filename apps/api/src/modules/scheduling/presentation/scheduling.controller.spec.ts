import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SchedulingController } from './scheduling.controller';
import { AppointmentService } from '../application/services/appointment.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { GetAvailabilityQuery } from '../application/queries/get-availability.handler';
import { BookAppointmentCommand } from '../application/commands/book-appointment.handler';

describe('SchedulingController', () => {
  let controller: SchedulingController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let appointmentService: {
    reschedule: jest.Mock;
    cancel: jest.Mock;
  };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    appointmentService = {
      reschedule: jest.fn(),
      cancel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulingController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: AppointmentService, useValue: appointmentService },
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
        { id: 'user-1', email: 'u@test.com', firstName: 'U', lastName: 'T', phone: null, role: 'ADMIN' as any, isActive: true, profileImage: null },
      );

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(BookAppointmentCommand),
      );
      expect(result).toEqual(appointment);
    });
  });

  describe('reschedule', () => {
    it('should delegate to AppointmentService', async () => {
      const updated = { id: 'appt-1', status: 'PENDING' };
      appointmentService.reschedule.mockResolvedValue(updated);

      const result = await controller.reschedule('appt-1', {
        scheduledAt: '2026-04-02T10:00:00Z',
        duration: 90,
      });

      expect(appointmentService.reschedule).toHaveBeenCalledWith(
        'appt-1',
        '2026-04-02T10:00:00Z',
        90,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('cancel', () => {
    it('should delegate to AppointmentService', async () => {
      const cancelled = { id: 'appt-1', status: 'CANCELLED' };
      appointmentService.cancel.mockResolvedValue(cancelled);

      const result = await controller.cancel('appt-1', { reason: 'Customer request' });

      expect(appointmentService.cancel).toHaveBeenCalledWith(
        'appt-1',
        'Customer request',
      );
      expect(result).toEqual(cancelled);
    });
  });
});

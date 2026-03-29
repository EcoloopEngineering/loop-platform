import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { ConflictException } from '@nestjs/common';
import { BookAppointmentHandler, BookAppointmentCommand } from './book-appointment.handler';
import { APPOINTMENT_REPOSITORY } from '../ports/appointment.repository.port';
import { JobberService } from '../../../../integrations/jobber/jobber.service';
import { AppointmentType } from '../../domain/entities/appointment.entity';

describe('BookAppointmentHandler', () => {
  let handler: BookAppointmentHandler;
  let repo: Record<string, jest.Mock>;
  let eventBus: { publish: jest.Mock };
  let jobberService: { createBooking: jest.Mock };

  beforeEach(async () => {
    repo = {
      findConflictingAppointment: jest.fn().mockResolvedValue(null),
      findLeadWithRelationsForBooking: jest.fn(),
      createAppointment: jest.fn(),
      createLeadActivity: jest.fn().mockResolvedValue({}),
      update: jest.fn(),
      findActiveByLeadId: jest.fn(),
      findLeadWithStakeholders: jest.fn(),
      findLeadMetadata: jest.fn(),
      findAppointmentsInRange: jest.fn(),
    };
    eventBus = { publish: jest.fn() };
    jobberService = { createBooking: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookAppointmentHandler,
        { provide: APPOINTMENT_REPOSITORY, useValue: repo },
        { provide: EventBus, useValue: eventBus },
        { provide: JobberService, useValue: jobberService },
      ],
    }).compile();

    handler = module.get<BookAppointmentHandler>(BookAppointmentHandler);
  });

  const baseCommand = new BookAppointmentCommand(
    'lead-1',
    AppointmentType.SITE_SURVEY,
    new Date('2026-04-01T10:00:00Z'),
    60,
    'Test notes',
  );

  it('should create an appointment and publish event', async () => {
    repo.findLeadWithRelationsForBooking.mockResolvedValue({
      id: 'lead-1',
      createdById: 'user-1',
      customer: { firstName: 'John', lastName: 'Doe' },
      property: { streetAddress: '123 Main', city: 'Miami', state: 'FL', zip: '33101' },
    });
    repo.createAppointment.mockResolvedValue({
      id: 'apt-1',
      leadId: 'lead-1',
      type: 'SITE_SURVEY',
      status: 'PENDING',
      scheduledAt: baseCommand.scheduledAt,
      duration: 60,
      notes: 'Test notes',
    });
    jobberService.createBooking.mockResolvedValue({ visitId: 'jobber-1' });

    const result = await handler.execute(baseCommand);

    expect(result.id).toBe('apt-1');
    expect(repo.createAppointment).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should throw ConflictException when time slot conflicts', async () => {
    repo.findConflictingAppointment.mockResolvedValue({ id: 'existing-apt' });

    await expect(handler.execute(baseCommand)).rejects.toThrow(ConflictException);
  });

  it('should still succeed if Jobber sync fails', async () => {
    repo.findLeadWithRelationsForBooking.mockResolvedValue({
      id: 'lead-1',
      createdById: 'user-1',
      customer: { firstName: 'John', lastName: 'Doe' },
      property: { streetAddress: '123 Main', city: 'Miami', state: 'FL', zip: '33101' },
    });
    repo.createAppointment.mockResolvedValue({
      id: 'apt-2',
      leadId: 'lead-1',
      type: 'SITE_SURVEY',
      status: 'PENDING',
      scheduledAt: baseCommand.scheduledAt,
      duration: 60,
      notes: null,
    });
    jobberService.createBooking.mockRejectedValue(new Error('Jobber down'));

    const result = await handler.execute(baseCommand);
    expect(result.id).toBe('apt-2');
    expect(result.status).toBe('PENDING');
  });

  it('should create appointment even if lead has no customer/property', async () => {
    repo.findLeadWithRelationsForBooking.mockResolvedValue(null);
    repo.createAppointment.mockResolvedValue({
      id: 'apt-3',
      leadId: 'lead-1',
      type: 'CONSULTATION',
      status: 'PENDING',
      scheduledAt: baseCommand.scheduledAt,
      duration: 60,
      notes: 'Test notes',
    });

    const result = await handler.execute(baseCommand);
    expect(result.id).toBe('apt-3');
  });

  it('should calculate correct end time based on duration', async () => {
    repo.findLeadWithRelationsForBooking.mockResolvedValue(null);
    repo.createAppointment.mockResolvedValue({
      id: 'apt-4',
      leadId: 'lead-1',
      type: 'SITE_SURVEY',
      status: 'PENDING',
      scheduledAt: baseCommand.scheduledAt,
      duration: 60,
      notes: null,
    });

    await handler.execute(baseCommand);

    // Conflict check should use endAt = scheduledAt + 60 minutes
    expect(repo.findConflictingAppointment).toHaveBeenCalledWith(
      'lead-1',
      new Date('2026-04-01T11:00:00Z'),
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { ConflictException } from '@nestjs/common';
import { BookAppointmentHandler, BookAppointmentCommand } from './book-appointment.handler';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { JobberService } from '../../../../integrations/jobber/jobber.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';
import { AppointmentType } from '../../domain/entities/appointment.entity';

describe('BookAppointmentHandler', () => {
  let handler: BookAppointmentHandler;
  let prisma: MockPrismaService;
  let eventBus: { publish: jest.Mock };
  let jobberService: { createBooking: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    eventBus = { publish: jest.fn() };
    jobberService = { createBooking: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookAppointmentHandler,
        { provide: PrismaService, useValue: prisma },
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
    prisma.appointment.findFirst.mockResolvedValue(null); // no conflict
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      createdById: 'user-1',
      customer: { firstName: 'John', lastName: 'Doe' },
      property: { streetAddress: '123 Main', city: 'Miami', state: 'FL', zip: '33101' },
    });
    prisma.appointment.create.mockResolvedValue({
      id: 'apt-1',
      leadId: 'lead-1',
      type: 'SITE_SURVEY',
      status: 'PENDING',
      scheduledAt: baseCommand.scheduledAt,
      duration: 60,
      notes: 'Test notes',
    });
    prisma.leadActivity.create.mockResolvedValue({});
    jobberService.createBooking.mockResolvedValue({ visitId: 'jobber-1' });

    const result = await handler.execute(baseCommand);

    expect(result.id).toBe('apt-1');
    expect(prisma.appointment.create).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should throw ConflictException when time slot conflicts', async () => {
    prisma.appointment.findFirst.mockResolvedValue({
      id: 'existing-apt',
      scheduledAt: new Date('2026-04-01T09:30:00Z'),
    });

    await expect(handler.execute(baseCommand)).rejects.toThrow(ConflictException);
  });

  it('should still succeed if Jobber sync fails', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      createdById: 'user-1',
      customer: { firstName: 'John', lastName: 'Doe' },
      property: { streetAddress: '123 Main', city: 'Miami', state: 'FL', zip: '33101' },
    });
    prisma.appointment.create.mockResolvedValue({
      id: 'apt-2',
      leadId: 'lead-1',
      type: 'SITE_SURVEY',
      status: 'PENDING',
      scheduledAt: baseCommand.scheduledAt,
      duration: 60,
      notes: null,
    });
    prisma.leadActivity.create.mockResolvedValue({});
    jobberService.createBooking.mockRejectedValue(new Error('Jobber down'));

    const result = await handler.execute(baseCommand);
    expect(result.id).toBe('apt-2');
    expect(result.status).toBe('PENDING');
  });

  it('should create appointment even if lead has no customer/property', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.lead.findUnique.mockResolvedValue(null);
    prisma.appointment.create.mockResolvedValue({
      id: 'apt-3',
      leadId: 'lead-1',
      type: 'CONSULTATION',
      status: 'PENDING',
      scheduledAt: baseCommand.scheduledAt,
      duration: 60,
      notes: 'Test notes',
    });
    prisma.leadActivity.create.mockResolvedValue({});

    const result = await handler.execute(baseCommand);
    expect(result.id).toBe('apt-3');
  });

  it('should calculate correct end time based on duration', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.lead.findUnique.mockResolvedValue(null);
    prisma.appointment.create.mockResolvedValue({
      id: 'apt-4',
      leadId: 'lead-1',
      type: 'SITE_SURVEY',
      status: 'PENDING',
      scheduledAt: baseCommand.scheduledAt,
      duration: 60,
      notes: null,
    });
    prisma.leadActivity.create.mockResolvedValue({});

    await handler.execute(baseCommand);

    // Conflict check should use endAt = scheduledAt + 60 minutes
    expect(prisma.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scheduledAt: { lt: new Date('2026-04-01T11:00:00Z') },
        }),
      }),
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaAppointmentRepository } from './prisma-appointment.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaAppointmentRepository', () => {
  let repository: PrismaAppointmentRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaAppointmentRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaAppointmentRepository>(PrismaAppointmentRepository);
  });

  describe('update', () => {
    it('should update an appointment', async () => {
      const updated = { id: 'apt-1', status: 'CONFIRMED' };
      prisma.appointment.update.mockResolvedValue(updated);

      const result = await repository.update('apt-1', { status: 'CONFIRMED' });

      expect(result).toEqual(updated);
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'apt-1' },
        data: { status: 'CONFIRMED' },
      });
    });
  });

  describe('findActiveByLeadId', () => {
    it('should return active appointment for a lead', async () => {
      const appointment = { id: 'apt-1', leadId: 'lead-1', status: 'PENDING', jobberVisitId: 'jv-1' };
      prisma.appointment.findFirst.mockResolvedValue(appointment);

      const result = await repository.findActiveByLeadId('lead-1');

      expect(result).toEqual(appointment);
      expect(prisma.appointment.findFirst).toHaveBeenCalledWith({
        where: {
          leadId: 'lead-1',
          status: { in: ['PENDING', 'CONFIRMED'] },
          jobberVisitId: { not: null },
        },
      });
    });

    it('should return null when no active appointment', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);

      const result = await repository.findActiveByLeadId('lead-1');

      expect(result).toBeNull();
    });
  });

  describe('findLeadWithStakeholders', () => {
    it('should return lead with assignments and PM', async () => {
      const lead = {
        id: 'lead-1',
        assignments: [{ user: { email: 'rep@test.com', firstName: 'John' } }],
        projectManager: { email: 'pm@test.com', firstName: 'Jane' },
      };
      prisma.lead.findUnique.mockResolvedValue(lead);

      const result = await repository.findLeadWithStakeholders('lead-1');

      expect(result).toEqual(lead);
      expect(prisma.lead.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1' },
          include: expect.objectContaining({
            assignments: expect.objectContaining({ where: { isPrimary: true } }),
            projectManager: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('findLeadMetadata', () => {
    it('should return lead metadata', async () => {
      prisma.lead.findUnique.mockResolvedValue({ metadata: { jobberClientId: '123' } });

      const result = await repository.findLeadMetadata('lead-1');

      expect(result).toEqual({ metadata: { jobberClientId: '123' } });
      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        select: { metadata: true },
      });
    });
  });

  describe('createLeadActivity', () => {
    it('should create a lead activity', async () => {
      const data = {
        leadId: 'lead-1',
        userId: 'user-1',
        type: 'APPOINTMENT_SCHEDULED',
        description: 'Appointment scheduled',
      };
      prisma.leadActivity.create.mockResolvedValue({ id: 'act-1', ...data });

      const result = await repository.createLeadActivity(data);

      expect(result).toEqual(expect.objectContaining({ id: 'act-1' }));
      expect(prisma.leadActivity.create).toHaveBeenCalledWith({ data: data as any });
    });
  });
});

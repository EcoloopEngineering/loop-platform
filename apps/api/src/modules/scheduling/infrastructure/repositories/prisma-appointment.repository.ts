import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AppointmentRepositoryPort } from '../../application/ports/appointment.repository.port';

@Injectable()
export class PrismaAppointmentRepository implements AppointmentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async update(id: string, data: Record<string, unknown>): Promise<any> {
    return this.prisma.appointment.update({
      where: { id },
      data: data as any,
    });
  }
}

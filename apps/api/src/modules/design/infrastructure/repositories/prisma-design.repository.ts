import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { DesignRepositoryPort } from '../../application/ports/design.repository.port';

@Injectable()
export class PrismaDesignRepository implements DesignRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByLead(leadId: string): Promise<any[]> {
    return this.prisma.designRequest.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<any> {
    return this.prisma.designRequest.findUniqueOrThrow({
      where: { id },
    });
  }
}

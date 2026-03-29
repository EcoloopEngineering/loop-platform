import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class DesignQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getDesignsByLead(leadId: string) {
    return this.prisma.designRequest.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDesignById(id: string) {
    return this.prisma.designRequest.findUniqueOrThrow({
      where: { id },
    });
  }
}

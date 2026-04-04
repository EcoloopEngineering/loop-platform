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

  async createDesignRequest(data: {
    leadId: string;
    designType: string;
    treeRemoval?: boolean;
    notes?: string | null;
    status: string;
  }): Promise<{ id: string; leadId: string; designType: string; status: string }> {
    return this.prisma.designRequest.create({
      data: {
        leadId: data.leadId,
        designType: data.designType as any,
        treeRemoval: data.treeRemoval ?? false,
        notes: data.notes,
        status: data.status as any,
      },
    }) as any;
  }

  async findLeadMetadata(leadId: string): Promise<{ metadata: unknown } | null> {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { metadata: true },
    });
  }

  async updateLeadFinancing(
    leadId: string,
    data: { kw?: number; epc?: number; metadata: Record<string, unknown> },
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (data.kw != null) updateData.kw = data.kw;
    if (data.epc != null) updateData.epc = data.epc;
    updateData.metadata = data.metadata as any;

    await this.prisma.lead.update({ where: { id: leadId }, data: updateData as any });
  }

  async createLeadActivity(data: {
    leadId: string;
    userId: string;
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<any> {
    return this.prisma.leadActivity.create({ data: data as any });
  }
}

import { Test } from '@nestjs/testing';
import { AuroraDesignListener } from './aurora-design.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AuroraService } from '../../../../integrations/aurora/aurora.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('AuroraDesignListener', () => {
  let listener: AuroraDesignListener;
  let prisma: MockPrismaService;
  let auroraService: { createProject: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    auroraService = {
      createProject: jest.fn().mockResolvedValue({ projectId: 'aurora-p1' }),
    };

    prisma.designRequest.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const module = await Test.createTestingModule({
      providers: [
        AuroraDesignListener,
        { provide: PrismaService, useValue: prisma },
        { provide: AuroraService, useValue: auroraService },
      ],
    }).compile();

    listener = module.get(AuroraDesignListener);
  });

  const payload = {
    designRequestId: 'dr-1',
    leadId: 'l1',
    propertyAddress: '123 Main, Austin, TX 78701',
    customerName: 'John Doe',
    monthlyBill: 200,
    roofCondition: 'GOOD',
    propertyType: 'RESIDENTIAL',
    userId: 'u1',
  };

  it('should create aurora project and update design request', async () => {
    await listener.handleAiDesignRequested(payload);

    expect(auroraService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'John Doe - 123 Main' }),
    );
    expect(prisma.designRequest.update).toHaveBeenCalledWith({
      where: { id: 'dr-1' },
      data: expect.objectContaining({
        auroraProjectId: 'aurora-p1',
        auroraProjectUrl: expect.stringContaining('aurora-p1'),
      }),
    });
  });

  it('should log activity on success', async () => {
    await listener.handleAiDesignRequested(payload);

    expect(prisma.leadActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        leadId: 'l1',
        type: 'DESIGN_COMPLETED',
      }),
    });
  });

  it('should handle aurora failure gracefully without rethrowing', async () => {
    auroraService.createProject.mockRejectedValue(new Error('Aurora down'));

    await expect(listener.handleAiDesignRequested(payload)).resolves.not.toThrow();

    expect(prisma.leadActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'DESIGN_REQUESTED',
        description: expect.stringContaining('Aurora integration failed'),
      }),
    });
  });

  it('should estimate kWh from monthly bill when annualKwhUsage is absent', async () => {
    await listener.handleAiDesignRequested({ ...payload, annualKwhUsage: undefined });

    expect(auroraService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ utilityBillKwh: Math.round((200 / 0.16) * 12) }),
    );
  });
});

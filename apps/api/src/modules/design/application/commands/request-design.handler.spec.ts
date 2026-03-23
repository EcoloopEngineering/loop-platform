import { Test } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { RequestDesignHandler, RequestDesignCommand } from './request-design.handler';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';
import { DesignType } from '../../domain/entities/design-request.entity';

describe('RequestDesignHandler', () => {
  let handler: RequestDesignHandler;
  let prisma: MockPrismaService;
  let eventBus: { publish: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    eventBus = { publish: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        RequestDesignHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get(RequestDesignHandler);
  });

  it('should create a design request with PENDING status', async () => {
    const created = { id: 'dr-1', leadId: 'l1', designType: 'STANDARD', status: 'PENDING' };
    prisma.designRequest.create.mockResolvedValue(created);

    const result = await handler.execute(
      new RequestDesignCommand('l1', DesignType.STANDARD, false, null, 'u1'),
    );

    expect(result).toEqual(created);
    expect(prisma.designRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ leadId: 'l1', status: 'PENDING' }),
    });
  });

  it('should publish a DesignRequestedEvent', async () => {
    prisma.designRequest.create.mockResolvedValue({ id: 'dr-2', leadId: 'l1', designType: 'CUSTOM' });

    await handler.execute(
      new RequestDesignCommand('l1', DesignType.CUSTOM, true, 'notes', 'u1'),
    );

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ designRequestId: 'dr-2', leadId: 'l1', createdBy: 'u1' }),
    );
  });
});

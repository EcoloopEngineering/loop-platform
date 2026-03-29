import { Test } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { RequestDesignHandler, RequestDesignCommand } from './request-design.handler';
import { DESIGN_REPOSITORY } from '../ports/design.repository.port';
import { DesignType } from '../../domain/entities/design-request.entity';

describe('RequestDesignHandler', () => {
  let handler: RequestDesignHandler;
  let repo: Record<string, jest.Mock>;
  let eventBus: { publish: jest.Mock };

  beforeEach(async () => {
    repo = {
      findByLead: jest.fn(),
      findById: jest.fn(),
      createDesignRequest: jest.fn(),
      createLeadActivity: jest.fn(),
    };
    eventBus = { publish: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        RequestDesignHandler,
        { provide: DESIGN_REPOSITORY, useValue: repo },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get(RequestDesignHandler);
  });

  it('should create a design request with PENDING status', async () => {
    const created = { id: 'dr-1', leadId: 'l1', designType: 'STANDARD', status: 'PENDING' };
    repo.createDesignRequest.mockResolvedValue(created);

    const result = await handler.execute(
      new RequestDesignCommand('l1', DesignType.STANDARD, false, null, 'u1'),
    );

    expect(result).toEqual(created);
    expect(repo.createDesignRequest).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: 'l1', status: 'PENDING' }),
    );
  });

  it('should publish a DesignRequestedEvent', async () => {
    repo.createDesignRequest.mockResolvedValue({ id: 'dr-2', leadId: 'l1', designType: 'CUSTOM' });

    await handler.execute(
      new RequestDesignCommand('l1', DesignType.CUSTOM, true, 'notes', 'u1'),
    );

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ designRequestId: 'dr-2', leadId: 'l1', createdBy: 'u1' }),
    );
  });
});

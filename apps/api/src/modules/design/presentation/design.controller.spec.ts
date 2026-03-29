import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { DesignController } from './design.controller';
import { DesignQueryService } from '../application/services/design-query.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RequestDesignCommand } from '../application/commands/request-design.handler';
import { DesignType } from '../domain/entities/design-request.entity';

describe('DesignController', () => {
  let controller: DesignController;
  let commandBus: { execute: jest.Mock };
  let designQueryService: Record<string, jest.Mock>;

  const mockUser = {
    id: 'user-1',
    email: 'test@ecoloop.us',
    firstName: 'Test',
    lastName: 'User',
    role: 'ADMIN',
    isActive: true,
    profileImage: null,
  } as any;

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    designQueryService = {
      getDesignsByLead: jest.fn(),
      getDesignById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DesignController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: DesignQueryService, useValue: designQueryService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DesignController>(DesignController);
  });

  describe('requestDesign', () => {
    it('should execute RequestDesignCommand via CommandBus', async () => {
      const dto = {
        designType: DesignType.STANDARD,
        treeRemoval: false,
        notes: 'South-facing panels',
      };
      const expected = { id: 'design-1', leadId: 'lead-1' };
      commandBus.execute.mockResolvedValue(expected);

      const result = await controller.requestDesign('lead-1', dto as any, mockUser);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new RequestDesignCommand('lead-1', DesignType.STANDARD, false, 'South-facing panels', 'user-1'),
      );
      expect(result).toEqual(expected);
    });

    it('should pass null notes when not provided', async () => {
      const dto = {
        designType: DesignType.STANDARD,
        treeRemoval: true,
        notes: undefined,
      };
      commandBus.execute.mockResolvedValue({});

      await controller.requestDesign('lead-2', dto as any, mockUser);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new RequestDesignCommand('lead-2', DesignType.STANDARD, true, null, 'user-1'),
      );
    });
  });

  describe('getDesignsByLead', () => {
    it('should delegate to DesignQueryService.getDesignsByLead', async () => {
      const designs = [{ id: 'design-1' }, { id: 'design-2' }];
      designQueryService.getDesignsByLead.mockResolvedValue(designs);

      const result = await controller.getDesignsByLead('lead-1');

      expect(designQueryService.getDesignsByLead).toHaveBeenCalledWith('lead-1');
      expect(result).toEqual(designs);
    });

    it('should return empty array when no designs', async () => {
      designQueryService.getDesignsByLead.mockResolvedValue([]);

      const result = await controller.getDesignsByLead('lead-1');

      expect(result).toEqual([]);
    });
  });

  describe('getDesignById', () => {
    it('should delegate to DesignQueryService.getDesignById', async () => {
      const design = { id: 'design-1', leadId: 'lead-1', designType: 'STANDARD' };
      designQueryService.getDesignById.mockResolvedValue(design);

      const result = await controller.getDesignById('design-1');

      expect(designQueryService.getDesignById).toHaveBeenCalledWith('design-1');
      expect(result).toEqual(design);
    });
  });
});

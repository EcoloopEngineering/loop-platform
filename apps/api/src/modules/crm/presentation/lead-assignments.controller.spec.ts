import { Test, TestingModule } from '@nestjs/testing';
import { LeadAssignmentsController } from './lead-assignments.controller';
import { LeadAssignmentService } from '../application/services/lead-assignment.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('LeadAssignmentsController', () => {
  let controller: LeadAssignmentsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      getAssignments: jest.fn(),
      setAssignments: jest.fn(),
      setPm: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadAssignmentsController],
      providers: [{ provide: LeadAssignmentService, useValue: service }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(LeadAssignmentsController);
  });

  describe('assign', () => {
    it('should delegate to LeadAssignmentService.setAssignments', async () => {
      const expected = { leadId: 'lead-1', userId: 'user-2', isPrimary: true };
      service.setAssignments.mockResolvedValue(expected);

      const result = await controller.assign('lead-1', 'user-2', 100, true, 'manager-1');

      expect(service.setAssignments).toHaveBeenCalledWith(
        'lead-1',
        { assigneeId: 'user-2', splitPct: 100, isPrimary: true },
        'manager-1',
      );
      expect(result).toEqual(expected);
    });
  });

  describe('assignPM', () => {
    it('should delegate to LeadAssignmentService.setPm', async () => {
      const expected = { id: 'lead-1', projectManagerId: 'pm-1' };
      service.setPm.mockResolvedValue(expected);

      const result = await controller.assignPM('lead-1', 'pm-1', 'user-1');

      expect(service.setPm).toHaveBeenCalledWith('lead-1', 'pm-1', 'user-1');
      expect(result).toEqual(expected);
    });

    it('should delegate PM removal to LeadAssignmentService.setPm', async () => {
      const expected = { id: 'lead-1', projectManagerId: null };
      service.setPm.mockResolvedValue(expected);

      const result = await controller.assignPM('lead-1', null, 'user-1');

      expect(service.setPm).toHaveBeenCalledWith('lead-1', null, 'user-1');
      expect(result).toEqual(expected);
    });
  });
});

import { Test } from '@nestjs/testing';
import { TaskStatusChangedListener } from './task-status-changed.listener';
import { TASK_REPOSITORY } from '../ports/task.repository.port';

describe('TaskStatusChangedListener', () => {
  let listener: TaskStatusChangedListener;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      findLeadMetadataOnly: jest.fn(),
      updateLeadMetadata: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIdSimple: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      complete: jest.fn(),
      cancel: jest.fn(),
      createTask: jest.fn(),
      findActiveUserByEmail: jest.fn(),
      findActiveUserByRole: jest.fn(),
      findLeadProjectManagerId: jest.fn(),
      findTemplates: jest.fn(),
      findTemplateById: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      findActiveTemplatesByStage: jest.fn(),
      findLeadWithMetadataAndState: jest.fn(),
      createLeadActivity: jest.fn(),
      findSiblingTasks: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TaskStatusChangedListener,
        { provide: TASK_REPOSITORY, useValue: repo },
      ],
    }).compile();

    listener = module.get(TaskStatusChangedListener);
  });

  it('should skip when no leadId', async () => {
    await listener.handleStatusChanged({
      taskId: 't1',
      leadId: null,
      templateKey: null,
      title: 'Permit Submission',
      previousStatus: 'OPEN',
      newStatus: 'IN_PROGRESS',
    });

    expect(repo.findLeadMetadataOnly).not.toHaveBeenCalled();
    expect(repo.updateLeadMetadata).not.toHaveBeenCalled();
  });

  it('should update lead metadata with task status', async () => {
    repo.findLeadMetadataOnly.mockResolvedValue({
      metadata: { existingKey: 'value' },
    });

    await listener.handleStatusChanged({
      taskId: 't1',
      leadId: 'lead-1',
      templateKey: 'tmpl-1',
      title: 'Permit Submission',
      previousStatus: 'OPEN',
      newStatus: 'IN_PROGRESS',
    });

    expect(repo.findLeadMetadataOnly).toHaveBeenCalledWith('lead-1');
    expect(repo.updateLeadMetadata).toHaveBeenCalledWith('lead-1', {
      existingKey: 'value',
      permitSubmissionStatus: 'IN_PROGRESS',
    });
  });

  it('should handle lead with no existing metadata', async () => {
    repo.findLeadMetadataOnly.mockResolvedValue({ metadata: null });

    await listener.handleStatusChanged({
      taskId: 't1',
      leadId: 'lead-1',
      templateKey: null,
      title: 'Site Audit',
      previousStatus: 'OPEN',
      newStatus: 'COMPLETED',
    });

    expect(repo.updateLeadMetadata).toHaveBeenCalledWith('lead-1', {
      siteAuditStatus: 'COMPLETED',
    });
  });

  it('should not throw when repo fails', async () => {
    repo.findLeadMetadataOnly.mockRejectedValue(new Error('DB error'));

    await expect(
      listener.handleStatusChanged({
        taskId: 't1',
        leadId: 'lead-1',
        templateKey: null,
        title: 'Test Task',
        previousStatus: 'OPEN',
        newStatus: 'IN_PROGRESS',
      }),
    ).resolves.toBeUndefined();
  });

  describe('generateMetadataKey', () => {
    it('converts "Permit Submission" to "permitSubmissionStatus"', () => {
      expect(listener.generateMetadataKey('Permit Submission')).toBe(
        'permitSubmissionStatus',
      );
    });

    it('converts "Site Audit" to "siteAuditStatus"', () => {
      expect(listener.generateMetadataKey('Site Audit')).toBe(
        'siteAuditStatus',
      );
    });

    it('handles single word', () => {
      expect(listener.generateMetadataKey('Install')).toBe('installStatus');
    });

    it('handles special characters', () => {
      expect(listener.generateMetadataKey('Permit #1 - Review')).toBe(
        'permit1ReviewStatus',
      );
    });

    it('returns "taskStatus" for empty string', () => {
      expect(listener.generateMetadataKey('')).toBe('taskStatus');
    });
  });
});

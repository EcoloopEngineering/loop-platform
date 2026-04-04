import { Test } from '@nestjs/testing';
import { ChangeOrderTaskListener } from './change-order-task.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('ChangeOrderTaskListener', () => {
  let listener: ChangeOrderTaskListener;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module = await Test.createTestingModule({
      providers: [
        ChangeOrderTaskListener,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    listener = module.get(ChangeOrderTaskListener);
  });

  it('should create parent task and subtasks from changes array', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });
    prisma.task.create
      .mockResolvedValueOnce({ id: 'task-parent' })
      .mockResolvedValueOnce({ id: 'task-sub-1' })
      .mockResolvedValueOnce({ id: 'task-sub-2' });
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleChangeOrderCreated({
      leadId: 'lead-1',
      changes: ['Panel upgrade', 'Inverter swap'],
      userId: 'user-1',
      customerName: 'Jane Smith',
    });

    // Parent task
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-1',
          title: 'Change Order: Jane Smith',
          assigneeId: 'admin-1',
          status: 'OPEN',
        }),
      }),
    );

    // Two subtasks
    expect(prisma.task.create).toHaveBeenCalledTimes(3);
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Panel upgrade',
          parentTaskId: 'task-parent',
        }),
      }),
    );
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Inverter swap',
          parentTaskId: 'task-parent',
        }),
      }),
    );

    // Activity logged
    expect(prisma.leadActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-1',
          userId: 'user-1',
          type: 'TASK_CREATED',
        }),
      }),
    );
  });

  it('should handle no assignee gracefully', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.task.create.mockResolvedValue({ id: 'task-parent' });
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleChangeOrderCreated({
      leadId: 'lead-1',
      changes: ['Battery add-on'],
      userId: 'user-1',
      customerName: 'Test User',
    });

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assigneeId: undefined,
        }),
      }),
    );
  });

  it('should not throw when an error occurs', async () => {
    prisma.user.findFirst.mockRejectedValue(new Error('DB error'));

    await expect(
      listener.handleChangeOrderCreated({
        leadId: 'lead-1',
        changes: ['Test'],
        userId: 'user-1',
        customerName: 'Test',
      }),
    ).resolves.toBeUndefined();
  });
});

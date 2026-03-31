import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { Task } from '@/types/api';

type AxiosError = { response?: { data?: { message?: string } } };

function extractMessage(err: unknown, fallback: string): string {
  return (err as AxiosError)?.response?.data?.message ?? fallback;
}

export interface TaskRow {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
  assignee?: {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  lead?: { id: string; customerName: string };
  subtasks?: Array<{ id: string; title: string; completed: boolean }>;
}

export function useTasksApi() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchTasks(params?: {
    status?: string;
    assigneeId?: string;
  }): Promise<TaskRow[]> {
    loading.value = true;
    error.value = null;
    try {
      const queryParams: Record<string, string> = {};
      if (params?.status) queryParams.status = params.status;
      if (params?.assigneeId) queryParams.assigneeId = params.assigneeId;
      const { data } = await api.get('/tasks', { params: queryParams });
      const raw = Array.isArray(data) ? data : (data as Record<string, unknown>).data ?? [];
      return (raw as Array<Record<string, unknown>>).map((t) => {
        const lead = t.lead as Record<string, unknown> | undefined;
        const customer = lead?.customer as Record<string, string> | undefined;
        return {
          ...t,
          lead: lead ? {
            id: lead.id as string,
            customerName: customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Unknown',
            currentStage: lead.currentStage as string,
          } : undefined,
        } as TaskRow;
      });
    } catch {
      error.value = 'Failed to load tasks. Please try again.';
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function createTask(payload: {
    title: string;
    description?: string;
    priority?: string | number;
    assigneeId?: string | null;
    dueDate?: string;
    leadId?: string;
  }): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await api.post('/tasks', {
        title: payload.title,
        description: payload.description || undefined,
        priority: payload.priority,
        assigneeId: payload.assigneeId || undefined,
        dueDate: payload.dueDate || undefined,
        leadId: payload.leadId || undefined,
      });
      return true;
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Failed to create task');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function completeTask(taskId: string): Promise<boolean> {
    error.value = null;
    try {
      await api.patch(`/tasks/${taskId}/complete`);
      return true;
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Failed to complete task');
      return false;
    }
  }

  async function deleteTask(taskId: string): Promise<boolean> {
    error.value = null;
    try {
      await api.delete(`/tasks/${taskId}`);
      return true;
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Failed to delete task');
      return false;
    }
  }

  async function fetchAssigneeOptions(): Promise<
    Array<{ label: string; value: string }>
  > {
    try {
      interface UserOption {
        id: string;
        firstName?: string;
        lastName?: string;
        email: string;
      }
      const { data } = await api.get<
        UserOption[] | { data: UserOption[] }
      >('/users');
      const users: UserOption[] = Array.isArray(data)
        ? data
        : (data as { data: UserOption[] }).data ?? [];
      return users.map((u) => ({
        label:
          `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
        value: u.id,
      }));
    } catch {
      return [];
    }
  }

  async function updateTaskStatus(taskId: string, status: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      return true;
    } catch (err) {
      error.value = extractMessage(err, 'Failed to update task');
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    clearError,
    fetchTasks,
    createTask,
    completeTask,
    deleteTask,
    updateTaskStatus,
    fetchAssigneeOptions,
  };
}

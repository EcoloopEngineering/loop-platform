import { ref } from 'vue';
import { api } from '@/boot/axios';
import type {
  Lead,
  Activity,
  Note,
  Document,
  Task,
  CommissionData,
} from '@/types/api';

export function useLeadApi() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchLead(id: string): Promise<Lead | null> {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<Lead>(`/leads/${id}`);
      return data;
    } catch (err: unknown) {
      error.value =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to load lead';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function updateLead(
    id: string,
    updates: Partial<Lead>,
  ): Promise<Lead | null> {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.patch<Lead>(`/leads/${id}`, updates);
      return data;
    } catch (err: unknown) {
      error.value =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to update lead';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTimeline(leadId: string): Promise<Activity[]> {
    try {
      const { data } = await api.get<Activity[]>(
        `/leads/${leadId}/timeline`,
      );
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async function fetchDocuments(leadId: string): Promise<Document[]> {
    try {
      const { data } = await api.get<Document[]>(
        `/leads/${leadId}/documents`,
      );
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async function uploadDocument(
    leadId: string,
    file: File,
  ): Promise<Document | null> {
    error.value = null;
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<Document>(
        `/leads/${leadId}/documents`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    } catch (err: unknown) {
      error.value =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to upload document';
      return null;
    }
  }

  async function addNote(
    leadId: string,
    body: string,
  ): Promise<Note | null> {
    error.value = null;
    try {
      const { data } = await api.post<Note>(`/leads/${leadId}/notes`, {
        body,
      });
      return data;
    } catch (err: unknown) {
      error.value =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to add note';
      return null;
    }
  }

  async function fetchTasks(leadId: string): Promise<Task[]> {
    try {
      const { data } = await api.get('/tasks', {
        params: { leadId },
      });
      const raw = Array.isArray(data)
        ? data
        : ((data as Record<string, unknown>).data ?? []);
      return raw as Task[];
    } catch {
      return [];
    }
  }

  async function fetchCommissions(
    leadId: string,
  ): Promise<CommissionData> {
    try {
      const { data } = await api.get(`/leads/${leadId}/commissions`);
      const raw = data as Record<string, unknown>;
      return {
        lines: (raw?.lines ?? []) as CommissionData['lines'],
        total: (raw?.total as string) ?? '$0',
      };
    } catch {
      return { lines: [], total: '$0' };
    }
  }

  return {
    loading,
    error,
    clearError,
    fetchLead,
    updateLead,
    fetchTimeline,
    fetchDocuments,
    uploadDocument,
    addNote,
    fetchTasks,
    fetchCommissions,
  };
}

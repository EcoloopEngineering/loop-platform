import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { Settings, User, IntegrationStatus } from '@/types/api';

export function useAdminApi() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchSettings(): Promise<Settings | null> {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<Settings>('/settings');
      return data;
    } catch (err: unknown) {
      error.value =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to load settings';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function saveSettings(
    updates: Partial<Settings>,
  ): Promise<Settings | null> {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.put<Settings>('/settings', updates);
      return data;
    } catch (err: unknown) {
      error.value =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to save settings';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUsers(): Promise<User[]> {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get('/users');
      const list = Array.isArray(data)
        ? data
        : ((data as Record<string, unknown>).data ?? []);
      return list as User[];
    } catch (err: unknown) {
      error.value =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to load users';
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchIntegrations(): Promise<IntegrationStatus[]> {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get('/settings/integrations-status');
      return Array.isArray(data) ? data : [];
    } catch (err: unknown) {
      error.value =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to load integrations';
      return [];
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    clearError,
    fetchSettings,
    saveSettings,
    fetchUsers,
    fetchIntegrations,
  };
}

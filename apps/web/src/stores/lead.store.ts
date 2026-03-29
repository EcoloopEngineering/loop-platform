import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { Lead, LeadCustomer, LeadProperty, LeadScore } from '@/types/api';

export type { Lead, LeadCustomer, LeadProperty, LeadScore };

export const useLeadStore = defineStore('lead', () => {
  const leads = ref<Lead[]>([]);
  const currentLead = ref<Lead | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);

  async function fetchLeads(params?: { page?: number; limit?: number; stage?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<{ data: Lead[]; total: number }>('/leads', { params });
      leads.value = data.data;
      total.value = data.total;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch leads';
      console.error('[LeadStore] fetchLeads failed:', err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchLead(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<Lead>(`/leads/${id}`);
      currentLead.value = data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch lead';
      console.error('[LeadStore] fetchLead failed:', err);
    } finally {
      loading.value = false;
    }
  }

  async function createLead(lead: Partial<Lead> | Record<string, unknown>) {
    const { data } = await api.post<Lead>('/leads', lead);
    leads.value.unshift(data);
    return data;
  }

  async function updateLead(id: string, updates: Partial<Lead>) {
    const { data } = await api.patch<Lead>(`/leads/${id}`, updates);
    const idx = leads.value.findIndex((l) => l.id === id);
    if (idx >= 0) leads.value[idx] = data;
    if (currentLead.value?.id === id) currentLead.value = data;
    return data;
  }

  async function changeStage(id: string, stage: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.patch<Lead>(`/leads/${id}/stage`, { stage });
      if (currentLead.value?.id === id) currentLead.value = data;
      return data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to change stage';
      console.error('[LeadStore] changeStage failed:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function markAsLost(id: string, reason?: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.patch<Lead>(`/leads/${id}/lost`, { reason });
      if (currentLead.value?.id === id) currentLead.value = data;
      return data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to mark as lost';
      console.error('[LeadStore] markAsLost failed:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function markAsCancelled(id: string, reason?: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.patch<Lead>(`/leads/${id}/cancel`, { reason });
      if (currentLead.value?.id === id) currentLead.value = data;
      return data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to mark as cancelled';
      console.error('[LeadStore] markAsCancelled failed:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    leads,
    currentLead,
    loading,
    error,
    total,
    fetchLeads,
    fetchLead,
    createLead,
    updateLead,
    changeStage,
    markAsLost,
    markAsCancelled,
  };
});

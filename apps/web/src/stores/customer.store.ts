import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { Customer, CustomerDetail } from '@/types/api';

export type { Customer, CustomerDetail };

export const useCustomerStore = defineStore('customer', () => {
  const customers = ref<Customer[]>([]);
  const currentCustomer = ref<CustomerDetail | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);

  async function fetchCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<{ data: Customer[]; total: number }>(
        '/customers',
        { params },
      );
      interface RawCustomer extends Partial<Customer> {
        firstName?: string;
        lastName?: string;
        _count?: { leads?: number };
      }
      const raw: RawCustomer[] = Array.isArray(data) ? data : data.data ?? [];
      customers.value = raw.map((c) => ({
        ...c,
        id: c.id ?? '',
        name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.name || '--',
        email: c.email ?? '',
        leadsCount: c._count?.leads ?? c.leadsCount ?? 0,
        propertiesCount: c.propertiesCount ?? 0,
        createdAt: c.createdAt ?? '',
      }));
      total.value = (data as { total?: number; meta?: { total: number } }).total ?? (data as { meta?: { total: number } }).meta?.total ?? raw.length;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch customers';
      console.error('[CustomerStore] fetchCustomers failed:', err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchCustomer(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<CustomerDetail>(`/customers/${id}`);
      currentCustomer.value = data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch customer';
      console.error('[CustomerStore] fetchCustomer failed:', err);
    } finally {
      loading.value = false;
    }
  }

  return {
    customers,
    currentCustomer,
    loading,
    error,
    total,
    fetchCustomers,
    fetchCustomer,
  };
});

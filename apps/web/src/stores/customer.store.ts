import { ref } from 'vue';
import { api } from '@/boot/axios';
import { defineStore } from 'pinia';
import type { Customer, CustomerDetail } from '@/types/api';

export type { Customer, CustomerDetail };

export const useCustomerStore = defineStore('customer', () => {
  const total = ref(0);
  const error = ref<string | null>(null);
  const loading = ref(false);
  const customers = ref<Customer[]>([]);
  const currentCustomer = ref<CustomerDetail | null>(null);

  async function fetchCustomers(params?: {
    page?: number;
    type?: string;
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
        lastName?: string;
        firstName?: string;
        _count?: { leads?: number };
      }
      const raw: RawCustomer[] = Array.isArray(data) ? data : data.data ?? [];
      customers.value = raw.map((customer) => ({
        ...customer,
        id: customer.id ?? '',
        name: `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.name || '--',
        email: customer.email ?? '',
        createdAt: customer.createdAt ?? '',
        leadsCount: customer._count?.leads ?? customer.leadsCount ?? 0,
        propertiesCount: customer.propertiesCount ?? 0,
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

  async function createProspect(data: {
    email?: string;
    phone?: string;
    source?: string;
    lastName?: string;
    firstName?: string;
    socialLink?: string;
    address?: {
      zip?: string;
      city?: string;
      state?: string;
      latitude?: number;
      longitude?: number;
      streetAddress?: string;
    };
  }) {
    loading.value = true;
    error.value = null;
    try {
      const { data: created } = await api.post<Customer>('/customers', {
        ...data,
        type: 'PROSPECT',
      });
      return created;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create prospect';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    total,
    error,
    loading,
    customers,
    fetchCustomer,
    currentCustomer,
    fetchCustomers,
    createProspect,
  };
});

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  leadsCount: number;
  propertiesCount: number;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  properties: {
    id: string;
    address: string;
    city: string;
    state: string;
  }[];
  leads: {
    id: string;
    stage: string;
    score: number;
    source: string;
    createdAt: string;
  }[];
  activities: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    userName?: string;
  }[];
}

export const useCustomerStore = defineStore('customer', () => {
  const customers = ref<Customer[]>([]);
  const currentCustomer = ref<CustomerDetail | null>(null);
  const loading = ref(false);
  const total = ref(0);

  async function fetchCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    loading.value = true;
    try {
      const { data } = await api.get<{ data: Customer[]; total: number }>(
        '/customers',
        { params },
      );
      const raw = Array.isArray(data) ? data : data.data ?? [];
      customers.value = raw.map((c: any) => ({
        ...c,
        name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.name || '--',
        leadsCount: c._count?.leads ?? c.leadsCount ?? 0,
      }));
      total.value = (data as any).total ?? (data as any).meta?.total ?? raw.length;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCustomer(id: string) {
    loading.value = true;
    try {
      const { data } = await api.get<CustomerDetail>(`/customers/${id}`);
      currentCustomer.value = data;
    } finally {
      loading.value = false;
    }
  }

  return {
    customers,
    currentCustomer,
    loading,
    total,
    fetchCustomers,
    fetchCustomer,
  };
});

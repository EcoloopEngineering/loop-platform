import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/boot/axios';
import type { CustomerDetail } from '@/types/api';

export const usePortalAuthStore = defineStore('portalAuth', () => {
  const token = ref<string | null>(localStorage.getItem('portalToken'));
  const customer = ref<CustomerDetail | null>(
    (() => {
      const stored = localStorage.getItem('portalCustomer');
      return stored ? JSON.parse(stored) : null;
    })(),
  );
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  async function login(email: string, password: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post('/portal/auth/login', { email, password });
      if (data.statusCode === 401) {
        error.value = data.message;
        return;
      }
      token.value = data.token;
      customer.value = data.customer;
      localStorage.setItem('portalToken', data.token);
      localStorage.setItem('portalCustomer', JSON.stringify(data.customer));
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string } } };
      error.value = axErr?.response?.data?.message || 'Invalid email or password.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function register(payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post('/portal/auth/register', payload);
      if (data.statusCode === 409) {
        error.value = data.message;
        return;
      }
      token.value = data.token;
      customer.value = data.customer;
      localStorage.setItem('portalToken', data.token);
      localStorage.setItem('portalCustomer', JSON.stringify(data.customer));
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string } } };
      error.value = axErr?.response?.data?.message || 'Registration failed.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    token.value = null;
    customer.value = null;
    localStorage.removeItem('portalToken');
    localStorage.removeItem('portalCustomer');
  }

  async function loadProfile() {
    if (!token.value) return;
    try {
      const { data } = await api.get('/portal/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      if (data.statusCode === 401) {
        logout();
        return;
      }
      customer.value = { ...customer.value, ...data } as CustomerDetail;
      localStorage.setItem('portalCustomer', JSON.stringify(customer.value));
    } catch {
      logout();
    }
  }

  return {
    token,
    customer,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    loadProfile,
  };
});

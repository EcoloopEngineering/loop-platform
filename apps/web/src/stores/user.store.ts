import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatarUrl?: string;
  profileImage?: string;
  companyId?: string;
  managerId?: string;
  createdAt: string;
}

export const useUserStore = defineStore(
  'user',
  () => {
    const user = ref<UserProfile | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function loadUser() {
      loading.value = true;
      error.value = null;
      try {
        const { data } = await api.get<UserProfile>('/users/me');
        user.value = data;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load user';
        console.error('[UserStore] loadUser failed:', err);
        user.value = null;
      } finally {
        loading.value = false;
      }
    }

    async function updateUser(updates: Partial<UserProfile>) {
      loading.value = true;
      error.value = null;
      try {
        const { data } = await api.patch<UserProfile>('/users/me', updates);
        user.value = data;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to update user';
        console.error('[UserStore] updateUser failed:', err);
        throw err;
      } finally {
        loading.value = false;
      }
    }

    function clearUser() {
      user.value = null;
    }

    return {
      user,
      loading,
      error,
      loadUser,
      updateUser,
      clearUser,
    };
  },
  {
    persist: {
      pick: ['user'],
    },
  },
);

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

    async function loadUser() {
      loading.value = true;
      try {
        const { data } = await api.get<UserProfile>('/users/me');
        user.value = data;
      } catch (err) {
        console.error('Failed to load user profile:', err);
        user.value = null;
      } finally {
        loading.value = false;
      }
    }

    async function updateUser(updates: Partial<UserProfile>) {
      const { data } = await api.patch<UserProfile>('/users/me', updates);
      user.value = data;
    }

    function clearUser() {
      user.value = null;
    }

    return {
      user,
      loading,
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

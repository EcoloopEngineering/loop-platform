import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { User } from '@/types/api';

type AxiosError = { response?: { data?: { message?: string } } };

function extractMessage(err: unknown, fallback: string): string {
  return (err as AxiosError)?.response?.data?.message ?? fallback;
}

export interface UserRow {
  id: string;
  name: string;
  initials: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  nickname?: string;
  isActive: boolean;
  referredBy?: string;
  leadCount: number;
  createdAt: string;
}

export function useUsersApi() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchUsers(): Promise<UserRow[]> {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get('/users');
      const list = Array.isArray(data) ? data : data.data ?? [];
      interface RawUser {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        role: string;
        nickname?: string;
        isActive: boolean;
        createdAt: string;
        referralsReceived?: Array<{
          inviter: { firstName: string; lastName: string };
        }>;
        _count?: { leadAssignments?: number };
      }
      return (list as RawUser[]).map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        initials:
          `${u.firstName?.charAt(0) ?? ''}${u.lastName?.charAt(0) ?? ''}`.toUpperCase(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone ?? '',
        role: u.role,
        nickname: u.nickname,
        isActive: u.isActive,
        referredBy: u.referralsReceived?.[0]?.inviter
          ? `${u.referralsReceived[0].inviter.firstName} ${u.referralsReceived[0].inviter.lastName}`
          : undefined,
        leadCount: u._count?.leadAssignments ?? 0,
        createdAt: u.createdAt,
      }));
    } catch {
      error.value = 'Failed to load users. Please try again.';
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchPendingUsers(): Promise<UserRow[]> {
    const users = await fetchUsers();
    return users.filter((u) => !u.isActive);
  }

  async function approveUser(
    userId: string,
    role: string,
  ): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await api.patch(`/users/${userId}/approve`, { role });
      return true;
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Failed to approve user');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function rejectUser(userId: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/users/${userId}/reject`);
      return true;
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Failed to reject user');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function createUser(
    payload: Partial<User> & { password?: string },
  ): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await api.post('/users', payload);
      return true;
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Failed to create user');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function updateUser(
    userId: string,
    updates: Record<string, string | boolean>,
  ): Promise<boolean> {
    error.value = null;
    try {
      if (updates.role) {
        await api.patch(`/users/${userId}/role`, { role: updates.role });
      } else {
        await api.put(`/users/${userId}`, updates);
      }
      return true;
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Failed to update user');
      return false;
    }
  }

  async function updateUserProfile(
    userId: string,
    profile: { firstName: string; lastName: string; phone: string },
    newRole?: string,
    currentRole?: string,
  ): Promise<boolean> {
    error.value = null;
    try {
      await api.put(`/users/${userId}`, profile);
      if (newRole && newRole !== currentRole) {
        await api.patch(`/users/${userId}/role`, { role: newRole });
      }
      return true;
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Failed to update user');
      return false;
    }
  }

  return {
    loading,
    error,
    clearError,
    fetchUsers,
    fetchPendingUsers,
    approveUser,
    rejectUser,
    createUser,
    updateUser,
    updateUserProfile,
  };
}

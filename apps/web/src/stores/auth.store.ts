import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/boot/axios';
import type { User } from '@/types/api';

const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useAuthStore = defineStore(
  'auth',
  () => {
    const token = ref<string | null>(null);
    const lastActivity = ref<number>(Date.now());
    const user = ref<User | null>(null);

    const isAuthenticated = computed(() => !!token.value && !isSessionExpired());

    function isSessionExpired(): boolean {
      if (!lastActivity.value) return true;
      return Date.now() - lastActivity.value > SESSION_TIMEOUT;
    }

    function touchActivity() {
      lastActivity.value = Date.now();
    }

    async function login(email: string, password: string) {
      const { data } = await api.post('/auth/login', { email, password });
      token.value = data.token;
      user.value = data.user;
      lastActivity.value = Date.now();
      // Set token in axios defaults
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    }

    async function signUp(email: string, password: string, extra?: {
      name?: string;
      phone?: string;
      role?: string;
      inviteCode?: string;
    }) {
      const [firstName, ...rest] = (extra?.name || '').split(' ');
      const { data } = await api.post('/auth/register', {
        email,
        password,
        firstName: firstName || email.split('@')[0],
        lastName: rest.join(' ') || '',
        phone: extra?.phone,
        role: extra?.role,
        inviteCode: extra?.inviteCode,
      });
      token.value = data.token;
      user.value = data.user;
      lastActivity.value = Date.now();
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    }

    async function loginWithGoogle() {
      // Try Firebase Google auth if available
      try {
        const { getApp } = await import('firebase/app');
        getApp(); // Check if Firebase is initialized
        const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        const firebaseToken = await cred.user.getIdToken();
        token.value = firebaseToken;
        lastActivity.value = Date.now();
        api.defaults.headers.common['Authorization'] = `Bearer ${firebaseToken}`;
        // Load user from API
        const { data } = await api.get('/users/me');
        user.value = data;
      } catch {
        throw new Error('Google login is not available');
      }
    }

    async function resetPassword(email: string) {
      // Use JWT API for password reset
      try {
        await api.post('/auth/forgot-password', { email });
        return;
      } catch (err: unknown) {
        const axErr = err as { response?: { data?: { message?: string } } };
        throw new Error(axErr?.response?.data?.message || 'Failed to send reset link');
      }
      // Firebase fallback (keep for reference but won't reach here)
      try {
        const { getApp } = await import('firebase/app');
        getApp();
        const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(getAuth(), email);
      } catch {
        throw new Error('Password reset is not available yet');
      }
    }

    function logout() {
      token.value = null;
      user.value = null;
      lastActivity.value = 0;
      delete api.defaults.headers.common['Authorization'];
    }

    // Restore token on app load
    function restoreSession() {
      if (token.value && !isSessionExpired()) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
        touchActivity();
      } else if (token.value) {
        // Session expired
        logout();
      }
    }

    return {
      token,
      user,
      lastActivity,
      isAuthenticated,
      isSessionExpired,
      touchActivity,
      login,
      signUp,
      loginWithGoogle,
      resetPassword,
      logout,
      restoreSession,
    };
  },
  {
    persist: {
      pick: ['token', 'user', 'lastActivity'],
    },
  },
);

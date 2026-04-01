import { boot } from 'quasar/wrappers';
import axios, { type AxiosInstance } from 'axios';
import { API_BASE } from '@/config/api';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

const api = axios.create({
  baseURL: API_BASE,
});

export default boot(({ app, router }) => {
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;

  // Restore dark mode from localStorage immediately (prevents flash)
  try {
    const darkStored = localStorage.getItem('darkMode');
    if (darkStored === '1') {
      import('quasar').then(({ Dark }) => Dark.set(true));
    }
  } catch { /* ignore */ }

  // Restore session on boot
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`;
      }
    }
  } catch { /* ignore */ }

  // Touch activity on successful responses
  api.interceptors.response.use(
    (response) => {
      try {
        const stored = localStorage.getItem('auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.lastActivity = Date.now();
          localStorage.setItem('auth', JSON.stringify(parsed));
        }
      } catch { /* ignore */ }
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        // Clear auth and redirect to login
        localStorage.removeItem('auth');
        delete api.defaults.headers.common['Authorization'];
        if (!window.location.pathname.startsWith('/auth') &&
            !window.location.pathname.startsWith('/partner') &&
            !window.location.pathname.startsWith('/portal')) {
          window.location.href = '/auth/login';
        }
      }
      return Promise.reject(error);
    },
  );
});

export { api };

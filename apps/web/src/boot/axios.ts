import { boot } from 'quasar/wrappers';
import axios, { type AxiosInstance } from 'axios';
import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

const api = axios.create({
  baseURL: (process.env.API_URL ?? 'http://localhost:3000') + '/api/v1',
});

function isFirebaseInitialized(): boolean {
  try { getApp(); return true; } catch { return false; }
}

api.interceptors.request.use(async (config) => {
  if (isFirebaseInitialized()) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && isFirebaseInitialized()) {
      const auth = getAuth();
      auth.signOut();
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  },
);

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };

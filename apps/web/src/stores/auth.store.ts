import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

export const useAuthStore = defineStore(
  'auth',
  () => {
    const currentUser = ref<User | null>(null);
    const token = ref<string | null>(null);
    const loading = ref(true);

    const isAuthenticated = computed(() => !!currentUser.value);

    function init() {
      const auth = getAuth();
      onAuthStateChanged(auth, async (user) => {
        currentUser.value = user;
        if (user) {
          token.value = await user.getIdToken();
        } else {
          token.value = null;
        }
        loading.value = false;
      });
    }

    async function login(email: string, password: string) {
      const auth = getAuth();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      currentUser.value = cred.user;
      token.value = await cred.user.getIdToken();
    }

    async function signUp(email: string, password: string) {
      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      currentUser.value = cred.user;
      token.value = await cred.user.getIdToken();
    }

    async function loginWithGoogle() {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      currentUser.value = cred.user;
      token.value = await cred.user.getIdToken();
    }

    async function resetPassword(email: string) {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
    }

    async function logout() {
      const auth = getAuth();
      await signOut(auth);
      currentUser.value = null;
      token.value = null;
    }

    return {
      currentUser,
      token,
      loading,
      isAuthenticated,
      init,
      login,
      signUp,
      loginWithGoogle,
      resetPassword,
      logout,
    };
  },
  {
    persist: {
      pick: ['token'],
    },
  },
);

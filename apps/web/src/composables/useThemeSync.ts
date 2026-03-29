import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';
import { API_URL } from '@/config/api';

/**
 * Fetches the current user and syncs dark mode / compact view preferences
 * from the API (source of truth) into localStorage + Quasar's Dark plugin.
 *
 * Also exposes reactive user identity fields (name, email, initials, avatar).
 */
export function useThemeSync() {
  const $q = useQuasar();
  const apiBase = API_URL;

  const userName = ref('');
  const userEmail = ref('');
  const userAvatarUrl = ref<string | null>(null);

  const userAvatar = computed(() => userAvatarUrl.value);

  const userInitials = computed(() => {
    if (!userName.value) return 'U';
    return userName.value
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  async function fetchAndSync() {
    try {
      const { data } = await api.get('/users/me');

      // Identity
      userName.value =
        data.nickname ||
        data.firstName ||
        `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
      userEmail.value = data.email ?? '';

      // Persist for chat and other components
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: data.id,
          name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          role: data.role,
          profileImage: data.profileImage ?? null,
        }),
      );

      // Avatar
      const img = data.profileImage;
      userAvatarUrl.value = img?.startsWith('/api/')
        ? `${apiBase}${img}`
        : img || null;

      // Dark mode — API is source of truth
      if (data.darkMode !== undefined) {
        localStorage.setItem('darkMode', data.darkMode ? '1' : '0');
        $q.dark.set(!!data.darkMode);
      }

      // Compact view — sync only when not already set locally
      if (
        data.compactView !== undefined &&
        localStorage.getItem('compactView') === null
      ) {
        localStorage.setItem('compactView', data.compactView ? '1' : '0');
        document.body.classList.toggle('compact-view', !!data.compactView);
      }

      return data;
    } catch {
      /* ignore — user endpoint may not be available yet */
      return null;
    }
  }

  onMounted(fetchAndSync);

  return {
    userName,
    userEmail,
    userAvatar,
    userAvatarUrl,
    userInitials,
    fetchAndSync,
  };
}

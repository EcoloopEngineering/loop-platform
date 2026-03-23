import { computed } from 'vue';
import { useUserStore } from '@/stores/user.store';

export type AppRole = 'ADMIN' | 'MANAGER' | 'SALES_REP' | 'REFERRAL';

const ROLE_PERMISSIONS: Record<AppRole, {
  allowedRoutes: string[];
  canAccessAdmin: boolean;
  canAccessCRM: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewLiveChat: boolean;
  canViewScoreboard: boolean;
  layout: 'admin' | 'sales';
}> = {
  ADMIN: {
    allowedRoutes: ['*'],
    canAccessAdmin: true,
    canAccessCRM: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewLiveChat: true,
    canViewScoreboard: true,
    layout: 'admin',
  },
  MANAGER: {
    allowedRoutes: [
      '/home', '/leads/new', '/leads/', '/referrals', '/support', '/profile', '/notifications',
      '/crm', '/crm/pipeline', '/crm/customers', '/crm/customers/', '/crm/leads/',
      '/admin/scoreboard', '/admin/settings',
    ],
    canAccessAdmin: false,
    canAccessCRM: true,
    canManageUsers: false,
    canManageSettings: true,
    canViewLiveChat: false,
    canViewScoreboard: true,
    layout: 'admin',
  },
  SALES_REP: {
    allowedRoutes: [
      '/home', '/leads/new', '/leads/', '/referrals', '/support', '/profile', '/notifications',
    ],
    canAccessAdmin: false,
    canAccessCRM: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewLiveChat: false,
    canViewScoreboard: false,
    layout: 'sales',
  },
  REFERRAL: {
    allowedRoutes: [
      '/home', '/leads/new', '/leads/', '/referrals', '/support', '/profile', '/notifications',
    ],
    canAccessAdmin: false,
    canAccessCRM: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewLiveChat: false,
    canViewScoreboard: false,
    layout: 'sales',
  },
};

export function useRoleAccess() {
  const userStore = useUserStore();

  const role = computed<AppRole>(() => (userStore.user?.role as AppRole) ?? 'SALES_REP');
  const permissions = computed(() => ROLE_PERMISSIONS[role.value] ?? ROLE_PERMISSIONS.SALES_REP);

  const isAdmin = computed(() => role.value === 'ADMIN');
  const isManager = computed(() => role.value === 'MANAGER');
  const isSalesRep = computed(() => role.value === 'SALES_REP' || role.value === 'REFERRAL');

  const canAccessCRM = computed(() => permissions.value.canAccessCRM);
  const canAccessAdmin = computed(() => permissions.value.canAccessAdmin);
  const canManageUsers = computed(() => permissions.value.canManageUsers);
  const canManageSettings = computed(() => permissions.value.canManageSettings);
  const canViewLiveChat = computed(() => permissions.value.canViewLiveChat);
  const canViewScoreboard = computed(() => permissions.value.canViewScoreboard);
  const preferredLayout = computed(() => permissions.value.layout);

  function canAccess(path: string): boolean {
    const routes = permissions.value.allowedRoutes;
    if (routes.includes('*')) return true;
    return routes.some((r) => path === r || (r.endsWith('/') && path.startsWith(r)));
  }

  function getHomeRoute(): string {
    if (canAccessCRM.value) return '/crm';
    return '/home';
  }

  return {
    role,
    isAdmin,
    isManager,
    isSalesRep,
    canAccessCRM,
    canAccessAdmin,
    canManageUsers,
    canManageSettings,
    canViewLiveChat,
    canViewScoreboard,
    preferredLayout,
    canAccess,
    getHomeRoute,
  };
}

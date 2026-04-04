import { route } from 'quasar/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { useUserStore } from '@/stores/user.store';
import { useAuthStore } from '@/stores/auth.store';
import { usePortalAuthStore } from '@/stores/portal-auth.store';

// Role-based route access map
const ROLE_ROUTES: Record<string, string[]> = {
  ADMIN: ['*'],
  MANAGER: [
    '/home', '/leads', '/referrals', '/support', '/profile', '/notifications', '/dashboard',
    '/pipeline', '/store', '/scoreboard',
    '/crm', '/admin/scoreboard', '/admin/settings',
  ],
  SALES_REP: ['/home', '/leads', '/referrals', '/support', '/profile', '/notifications', '/pipeline', '/store', '/scoreboard', '/dashboard'],
  REFERRAL: ['/home', '/leads', '/referrals', '/support', '/profile', '/notifications'],
};

function canAccessRoute(role: string, path: string): boolean {
  const allowed = ROLE_ROUTES[role] ?? ROLE_ROUTES.SALES_REP;
  if (allowed.includes('*')) return true;
  // Auth routes always allowed
  if (path.startsWith('/auth')) return true;
  return allowed.some((r) => path === r || path.startsWith(r + '/') || path.startsWith(r));
}

export default route(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to, _from, next) => {
    // Partner pages are always accessible
    if (to.path.startsWith('/partner')) return next();

    // Auth pages — redirect to home if already logged in
    if (to.path.startsWith('/auth')) {
      const authStore = useAuthStore();
      authStore.restoreSession();
      if (authStore.isAuthenticated) {
        return next('/home');
      }
      return next();
    }

    // Handle portal routes separately — portal has its own auth
    if (to.path.startsWith('/portal')) {
      if (to.path !== '/portal/login' && to.path !== '/portal/reset-password') {
        const portalAuth = usePortalAuthStore();
        if (!portalAuth.isAuthenticated) {
          return next({ path: '/portal/login' });
        }
      }
      return next();
    }

    // Public pages (no auth required)
    const requiresAuth = to.matched.some((r) => r.meta.requiresAuth);

    const userStore = useUserStore();
    const authStore = useAuthStore();

    // Restore session from persisted state
    authStore.restoreSession();

    // Redirect to login if not authenticated
    if (!authStore.isAuthenticated) {
      if (requiresAuth) {
        return next({ name: 'login', query: { redirect: to.fullPath } });
      }
      return next();
    }

    // Load user if needed
    if (!userStore.user) {
      try { await userStore.loadUser(); } catch { /* ignore */ }
    }

    if (!requiresAuth) {
      return next();
    }

    // Role check
    const role = userStore.user?.role ?? 'SALES_REP';
    if (!canAccessRoute(role, to.path)) {
      const homeRoute = ['ADMIN', 'MANAGER'].includes(role) ? '/crm' : '/home';
      return next(homeRoute);
    }

    return next();
  });

  return Router;
});

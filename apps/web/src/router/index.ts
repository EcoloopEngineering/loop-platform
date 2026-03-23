import { route } from 'quasar/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import { getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import routes from './routes';
import { useUserStore } from '@/stores/user.store';

// Role-based route access map
const ROLE_ROUTES: Record<string, string[]> = {
  ADMIN: ['*'],
  MANAGER: [
    '/home', '/leads', '/referrals', '/support', '/profile', '/notifications', '/dashboard',
    '/crm', '/admin/scoreboard', '/admin/settings',
  ],
  SALES_REP: ['/home', '/leads', '/referrals', '/support', '/profile', '/notifications'],
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

  Router.beforeEach((to, _from, next) => {
    const requiresAuth = to.matched.some((r) => r.meta.requiresAuth);

    // Auth pages are always accessible
    if (to.path.startsWith('/auth')) return next();

    if (!requiresAuth) {
      // Check role-based access even for non-auth routes
      const userStore = useUserStore();
      const role = userStore.user?.role ?? 'SALES_REP';

      if (!canAccessRoute(role, to.path)) {
        // Redirect to appropriate home
        const homeRoute = ['ADMIN', 'MANAGER'].includes(role) ? '/crm' : '/home';
        return next(homeRoute);
      }

      return next();
    }

    let firebaseReady = false;
    try { getApp(); firebaseReady = true; } catch { /* not initialized */ }

    if (!firebaseReady) {
      return next({ name: 'login', query: { redirect: to.fullPath } });
    }

    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();

      if (!user) {
        return next({ name: 'login', query: { redirect: to.fullPath } });
      }

      // Role check
      const userStore = useUserStore();
      const role = userStore.user?.role ?? 'SALES_REP';
      if (!canAccessRoute(role, to.path)) {
        const homeRoute = ['ADMIN', 'MANAGER'].includes(role) ? '/crm' : '/home';
        return next(homeRoute);
      }

      return next();
    });
  });

  return Router;
});

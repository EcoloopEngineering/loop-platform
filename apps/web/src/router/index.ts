import { route } from 'quasar/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import routes from './routes';

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
    const requiredRoles = to.matched
      .flatMap((r) => (r.meta.roles as string[]) ?? []);

    if (!requiresAuth) {
      return next();
    }

    const auth = getAuth();

    // Wait for auth state to be determined
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();

      if (!user) {
        return next({ name: 'login', query: { redirect: to.fullPath } });
      }

      // Role check will be handled via user store once profile is loaded
      if (requiredRoles.length > 0) {
        // For now, allow access - role enforcement will come from the user store
        return next();
      }

      return next();
    });
  });

  return Router;
});

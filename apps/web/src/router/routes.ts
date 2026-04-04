import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  // Auth routes (no auth required)
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/pages/auth/LoginPage.vue'),
      },
      {
        path: 'signup',
        name: 'signup',
        component: () => import('@/pages/auth/SignUpPage.vue'),
      },
      {
        path: 'forgot-password',
        name: 'forgot-password',
        component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
      },
      {
        path: 'reset-password',
        name: 'reset-password',
        component: () => import('@/pages/auth/ResetPasswordPage.vue'),
      },
      {
        path: 'invite/:code?',
        name: 'invite',
        redirect: (to) => ({
          path: to.params.code ? `/partner/${to.params.code}` : '/partner',
          query: { tab: 'register' },
        }),
      },
    ],
  },

  // ── Sales routes (all authenticated users) ────────────────────────
  // MainLayout = mobile-first, bottom tabs: Home, Leads, Pipeline, Profile
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/home',
      },
      {
        path: 'home/:manager?',
        name: 'home',
        component: () => import('@/pages/home/HomePage.vue'),
        props: true,
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/dashboard/DashboardPage.vue'),
      },
      {
        path: 'referrals',
        name: 'referrals',
        component: () => import('@/pages/referrals/ReferralsPage.vue'),
      },
      {
        path: 'support',
        name: 'support',
        component: () => import('@/pages/chat/SupportChatPage.vue'),
      },
      // ── Leads (sales context) ──
      {
        path: 'leads',
        name: 'my-leads',
        component: () => import('@/pages/leads/MyLeadsPage.vue'),
      },
      {
        path: 'leads/new',
        name: 'lead-new-sales',
        component: () => import('@/pages/leads/LeadCreatePage.vue'),
      },
      {
        path: 'leads/:id',
        name: 'lead-detail',
        component: () => import('@/pages/leads/LeadDetailPage.vue'),
        props: true,
      },
      // ── Pipeline (sales view) ──
      {
        path: 'pipeline',
        name: 'sales-pipeline',
        component: () => import('@/pages/crm/PipelinePage.vue'),
      },
      // ── Store / Rewards (accessible to all reps) ──
      {
        path: 'store',
        name: 'store',
        component: () => import('@/pages/shared/StorePage.vue'),
      },
      // ── Scoreboard (all users can see) ──
      {
        path: 'scoreboard',
        name: 'scoreboard',
        component: () => import('@/pages/shared/ScoreboardPage.vue'),
      },
      // ── Notifications ──
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('@/pages/shared/NotificationsPage.vue'),
      },
    ],
  },

  // ── Profile & simple pages (BasicLayout with back button) ─────────
  {
    path: '/',
    component: () => import('@/layouts/BasicLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/pages/profile/ProfilePage.vue'),
      },
    ],
  },

  // ── CRM routes (admin/manager — AdminLayout with sidebar) ─────────
  {
    path: '/crm',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, roles: ['ADMIN', 'MANAGER'] },
    children: [
      {
        path: '',
        name: 'crm',
        component: () => import('@/pages/crm/CrmDashboardPage.vue'),
      },
      {
        path: 'pipeline',
        name: 'crm-pipeline',
        component: () => import('@/pages/crm/PipelinePage.vue'),
      },
      {
        path: 'tasks',
        name: 'crm-tasks',
        component: () => import('@/pages/shared/TasksPage.vue'),
      },
      {
        path: 'customers',
        name: 'crm-customers',
        component: () => import('@/pages/crm/CustomerListPage.vue'),
      },
      {
        path: 'customers/:id',
        name: 'crm-customer-detail',
        component: () => import('@/pages/crm/CustomerDetailPage.vue'),
        props: true,
      },
      {
        path: 'financiers',
        name: 'crm-financiers',
        component: () => import('@/pages/admin/FinanciersPage.vue'),
      },
      {
        path: 'leads/:id',
        name: 'crm-lead-detail',
        component: () => import('@/pages/leads/LeadDetailPage.vue'),
        props: true,
      },
    ],
  },

  // ── Admin routes (admin only — AdminLayout with sidebar) ──────────
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, roles: ['ADMIN'] },
    children: [
      {
        path: 'scoreboard',
        name: 'admin-scoreboard',
        component: () => import('@/pages/shared/ScoreboardPage.vue'),
      },
      {
        path: 'rewards',
        name: 'admin-rewards',
        component: () => import('@/pages/admin/RewardsAdminPage.vue'),
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/pages/admin/UsersPage.vue'),
      },
      {
        path: 'commissions',
        name: 'admin-commissions',
        component: () => import('@/pages/admin/CommissionPaymentsPage.vue'),
      },
      {
        path: 'notifications',
        name: 'admin-notifications',
        component: () => import('@/pages/shared/NotificationsPage.vue'),
      },
      {
        path: 'live-chat',
        name: 'admin-live-chat',
        component: () => import('@/pages/admin/LiveChatPage.vue'),
      },
      {
        path: 'settings',
        name: 'admin-settings',
        component: () => import('@/pages/admin/SettingsPage.vue'),
      },
    ],
  },

  // ── Public form page ──────────────────────────────────────────────
  {
    path: '/f/:slug',
    name: 'public-form',
    component: () => import('@/pages/home/HomePage.vue'),
    props: true,
  },

  // ── Customer Portal ───────────────────────────────────────────────
  {
    path: '/portal/login',
    name: 'portal-login',
    component: () => import('@/pages/portal/PortalLoginPage.vue'),
  },
  {
    path: '/portal/reset-password',
    name: 'portal-reset-password',
    component: () => import('@/pages/portal/PortalResetPasswordPage.vue'),
  },
  {
    path: '/portal',
    component: () => import('@/layouts/PortalLayout.vue'),
    children: [
      {
        path: '',
        name: 'portal-dashboard',
        component: () => import('@/pages/portal/PortalDashboardPage.vue'),
      },
      {
        path: 'project',
        name: 'portal-project',
        component: () => import('@/pages/portal/PortalProjectPage.vue'),
      },
      {
        path: 'notifications',
        name: 'portal-notifications',
        component: () => import('@/pages/portal/PortalNotificationsPage.vue'),
      },
      {
        path: 'faq',
        name: 'portal-faq',
        component: () => import('@/pages/portal/PortalFAQPage.vue'),
      },
      {
        path: 'profile',
        name: 'portal-profile',
        component: () => import('@/pages/portal/PortalProfilePage.vue'),
      },
    ],
  },

  // ── Partner Auth ──────────────────────────────────────────────────
  {
    path: '/partner/:code?',
    name: 'partner-auth',
    component: () => import('@/pages/partner/PartnerAuthPage.vue'),
    props: true,
  },

  // Catch-all
  {
    path: '/:catchAll(.*)*',
    redirect: '/home',
  },
];

export default routes;

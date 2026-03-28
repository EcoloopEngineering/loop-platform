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
        component: () => import('@/pages/auth/SignUpPage.vue'),
        props: true,
      },
    ],
  },

  // Main app routes (auth required, mobile-first layout)
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
        path: 'notifications',
        name: 'notifications',
        component: () => import('@/pages/admin/NotificationsPage.vue'),
      },
    ],
  },

  // Basic layout routes (auth required, simple back-button layout)
  {
    path: '/',
    component: () => import('@/layouts/BasicLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'leads/new',
        name: 'lead-new',
        component: () => import('@/pages/leads/LeadCreatePage.vue'),
        meta: { hideLayoutBack: true },
      },
      {
        path: 'leads/:id',
        name: 'lead-detail',
        component: () => import('@/pages/leads/LeadDetailPage.vue'),
        props: true,
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/pages/profile/ProfilePage.vue'),
      },
      {
        path: 'referrals/:id',
        name: 'referral-detail',
        component: () => import('@/pages/home/HomePage.vue'),
        props: true,
      },
      {
        path: 'forms/new',
        name: 'form-new',
        component: () => import('@/pages/home/HomePage.vue'),
      },
      {
        path: 'forms/:id/edit',
        name: 'form-edit',
        component: () => import('@/pages/home/HomePage.vue'),
        props: true,
      },
    ],
  },

  // CRM routes (admin/manager only)
  {
    path: '/crm',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
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
        component: () => import('@/pages/admin/TasksPage.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN', 'MANAGER'] },
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
        meta: { requiresAuth: true, roles: ['ADMIN', 'MANAGER'] },
      },
      {
        path: 'leads/:id',
        name: 'crm-lead-detail',
        component: () => import('@/pages/leads/LeadDetailPage.vue'),
        props: true,
      },
    ],
  },

  // Admin routes (admin only)
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, roles: ['ADMIN'] },
    children: [
      {
        path: 'scoreboard',
        name: 'admin-scoreboard',
        component: () => import('@/pages/admin/ScoreboardPage.vue'),
      },
      {
        path: 'rewards',
        name: 'admin-rewards',
        component: () => import('@/pages/admin/RewardsPage.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN', 'MANAGER', 'SALES_REP'] },
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
        meta: { requiresAuth: true, roles: ['ADMIN'] },
      },
      {
        path: 'notifications',
        name: 'admin-notifications',
        component: () => import('@/pages/admin/NotificationsPage.vue'),
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

  // Public form page
  {
    path: '/f/:slug',
    name: 'public-form',
    component: () => import('@/pages/home/HomePage.vue'),
    props: true,
  },

  // ── Customer Portal ─────────────────────────
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

  // Catch-all
  {
    path: '/:catchAll(.*)*',
    redirect: '/home',
  },
];

export default routes;

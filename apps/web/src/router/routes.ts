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
    meta: { requiresAuth: false },
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
    meta: { requiresAuth: false },
    children: [
      {
        path: 'leads/new',
        name: 'lead-new',
        component: () => import('@/pages/leads/LeadCreatePage.vue'),
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
    meta: { requiresAuth: false },
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
    meta: { requiresAuth: false, roles: ['ADMIN'] },
    children: [
      {
        path: 'scoreboard',
        name: 'admin-scoreboard',
        component: () => import('@/pages/admin/ScoreboardPage.vue'),
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/pages/admin/UsersPage.vue'),
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

  // Catch-all
  {
    path: '/:catchAll(.*)*',
    redirect: '/home',
  },
];

export default routes;

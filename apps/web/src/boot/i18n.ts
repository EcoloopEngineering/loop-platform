import { boot } from 'quasar/wrappers';
import { reactive } from 'vue';

const messages: Record<string, Record<string, string>> = {
  'en-US': {
    appName: 'Loop',
    home: 'Home',
    leads: 'Leads',
    referrals: 'Referrals',
    forms: 'Forms',
    login: 'Log In',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    logout: 'Log Out',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    submit: 'Submit',
    back: 'Back',
    next: 'Next',
    dashboard: 'Dashboard',
    pipeline: 'Pipeline',
    customers: 'Customers',
    scoreboard: 'Scoreboard',
    users: 'Users',
    settings: 'Settings',
    notifications: 'Notifications',
    profile: 'Profile',
  },
};

const locale = reactive({ current: 'en-US' });

export function t(key: string): string {
  return messages[locale.current]?.[key] ?? key;
}

export default boot(({ app }) => {
  app.config.globalProperties.$t = t;
});

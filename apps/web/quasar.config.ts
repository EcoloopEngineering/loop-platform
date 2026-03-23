import { configure } from 'quasar/wrappers';
import path from 'node:path';

export default configure(() => {
  return {
    boot: ['axios', 'firebase', 'i18n'],

    css: ['app.scss'],

    extras: ['roboto-font', 'material-icons'],

    build: {
      target: { browser: ['es2022', 'chrome100', 'firefox100', 'safari15'] },
      vueRouterMode: 'history',
      env: {
        API_URL: process.env.API_URL ?? 'http://localhost:3000',
        MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN ?? '',
      },
      vitePlugins: [],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    devServer: {
      open: true,
    },

    framework: {
      config: {
        brand: {
          primary: '#00897B',
          secondary: '#00695C',
          accent: '#00FBAC',
          dark: '#1A1A2E',
          'dark-page': '#1A1A2E',
          positive: '#10B981',
          negative: '#EF4444',
          info: '#3B82F6',
          warning: '#F59E0B',
        },
      },
      dark: false,
      autoImportComponentCase: 'kebab',
      components: [
        'QLayout',
        'QPageContainer',
        'QPage',
        'QHeader',
        'QToolbar',
        'QToolbarTitle',
        'QDrawer',
        'QFooter',
        'QBtn',
        'QInput',
        'QSelect',
        'QDialog',
        'QForm',
        'QStep',
        'QStepper',
        'QStepperNavigation',
        'QCard',
        'QCardSection',
        'QCardActions',
        'QIcon',
        'QBadge',
        'QAvatar',
        'QLinearProgress',
        'QFile',
        'QChip',
        'QTab',
        'QTabs',
        'QTabPanels',
        'QTabPanel',
        'QList',
        'QItem',
        'QItemSection',
        'QItemLabel',
        'QSeparator',
        'QMenu',
        'QInfiniteScroll',
        'QPullToRefresh',
        'QSpinner',
        'QBanner',
        'QImg',
        'QToggle',
        'QCheckbox',
        'QRadio',
        'QSpace',
        'QTooltip',
      ],
      plugins: ['Notify', 'Dialog', 'Loading'],
    },

    capacitor: {
      hideSplashscreen: true,
    },
  };
});

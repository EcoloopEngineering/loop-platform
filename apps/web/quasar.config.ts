import { configure } from 'quasar/wrappers';

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
      },
      vitePlugins: [],
    },

    devServer: {
      open: true,
    },

    framework: {
      config: {
        brand: {
          primary: '#00897B',
          secondary: '#00695C',
          accent: '#4DB6AC',
          dark: '#1D1D1D',
          positive: '#43A047',
          negative: '#E53935',
          info: '#2196F3',
          warning: '#FFA000',
        },
      },
      components: [
        'QLayout',
        'QPage',
        'QBtn',
        'QInput',
        'QSelect',
        'QDialog',
        'QStep',
        'QStepper',
        'QCard',
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
      ],
      plugins: ['Notify', 'Dialog', 'Loading'],
    },

    capacitor: {
      hideSplashscreen: true,
    },
  };
});

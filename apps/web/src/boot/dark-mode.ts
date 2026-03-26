import { boot } from 'quasar/wrappers';
import { Dark } from 'quasar';

export default boot(() => {
  const stored = localStorage.getItem('darkMode');
  if (stored === '1') {
    Dark.set(true);
  } else {
    Dark.set(false);
  }
});

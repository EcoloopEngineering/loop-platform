export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_MIN_DIGITS = 10;

// US area codes: first digit must be 2-9, second digit must be 0-9 (not same as first+third pattern N11)
const US_PHONE_REGEX = /^[2-9]\d{2}[2-9]\d{6}$/;

export const emailRule = (value: string) => {
  if (!value) {
    return true;
  }

  if (!EMAIL_REGEX.test(value)) {
    return 'Enter a valid e-mail';
  }

  return true;
};

export const phoneRule = (value: string) => {
  if (!value) {
    return true;
  }

  const digits = value.replace(/\D/g, '');

  if (digits.length < PHONE_MIN_DIGITS) {
    return 'Enter a valid phone number';
  }

  if (!US_PHONE_REGEX.test(digits)) {
    return 'Enter a valid US phone number';
  }

  return true;
};

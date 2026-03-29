import { BadRequestException } from '@nestjs/common';

/**
 * Validates that a password meets the minimum security policy:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 *
 * Throws BadRequestException with a descriptive message on failure.
 */
export function validatePasswordPolicy(password: string): void {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('at least 1 uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('at least 1 lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('at least 1 number');
  }

  if (errors.length > 0) {
    throw new BadRequestException(
      `Password must contain: ${errors.join(', ')}`,
    );
  }
}

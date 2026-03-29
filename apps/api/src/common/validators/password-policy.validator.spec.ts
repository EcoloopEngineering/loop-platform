import { BadRequestException } from '@nestjs/common';
import { validatePasswordPolicy } from './password-policy.validator';

describe('validatePasswordPolicy', () => {
  it('should accept a valid password', () => {
    expect(() => validatePasswordPolicy('ValidPass1')).not.toThrow();
  });

  it('should accept a password with exactly 8 characters', () => {
    expect(() => validatePasswordPolicy('Abcdef1x')).not.toThrow();
  });

  it('should reject a password shorter than 8 characters', () => {
    expect(() => validatePasswordPolicy('Ab1cdef')).toThrow(BadRequestException);
    expect(() => validatePasswordPolicy('Ab1cdef')).toThrow('at least 8 characters');
  });

  it('should reject empty password', () => {
    expect(() => validatePasswordPolicy('')).toThrow(BadRequestException);
    expect(() => validatePasswordPolicy('')).toThrow('at least 8 characters');
  });

  it('should reject undefined/null-ish password', () => {
    expect(() => validatePasswordPolicy(undefined as any)).toThrow(BadRequestException);
  });

  it('should reject a password without uppercase letter', () => {
    expect(() => validatePasswordPolicy('lowercase1')).toThrow(BadRequestException);
    expect(() => validatePasswordPolicy('lowercase1')).toThrow('at least 1 uppercase letter');
  });

  it('should reject a password without lowercase letter', () => {
    expect(() => validatePasswordPolicy('UPPERCASE1')).toThrow(BadRequestException);
    expect(() => validatePasswordPolicy('UPPERCASE1')).toThrow('at least 1 lowercase letter');
  });

  it('should reject a password without a number', () => {
    expect(() => validatePasswordPolicy('NoNumbers!')).toThrow(BadRequestException);
    expect(() => validatePasswordPolicy('NoNumbers!')).toThrow('at least 1 number');
  });

  it('should include all failing rules in the message', () => {
    try {
      validatePasswordPolicy('abc');
      fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const message = (e as BadRequestException).message;
      expect(message).toContain('at least 8 characters');
      expect(message).toContain('at least 1 uppercase letter');
      expect(message).toContain('at least 1 number');
    }
  });

  it('should pass for a complex valid password', () => {
    expect(() => validatePasswordPolicy('C0mpl3xP@ss!')).not.toThrow();
  });
});

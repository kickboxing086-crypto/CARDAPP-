import { SecurityRequirements } from '../types';

/**
 * Validates whether a username or password meets the strict security criteria:
 * - Minimum 6 characters (recommended 8+)
 * - Contains at least one uppercase letter (A-Z)
 * - Contains at least one lowercase letter (a-z)
 * - Contains at least one number (0-9)
 * - Contains at least one special character (@, _, #, $, etc.)
 */
export function validateSecurityPolicy(text: string): SecurityRequirements {
  const hasUppercase = /[A-Z]/.test(text);
  const hasLowercase = /[a-z]/.test(text);
  const hasNumber = /[0-9]/.test(text);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(text);
  const hasMinLength = text.length >= 6;

  const isValid =
    hasUppercase && hasLowercase && hasNumber && hasSpecialChar && hasMinLength;

  return {
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    hasMinLength,
    isValid,
  };
}

/**
 * Generates a random secure string that strictly satisfies the policy
 */
export function generateSecurePassword(prefix = 'Card'): string {
  const specials = ['@', '#', '$', '%', '&', '_', '!'];
  const special = specials[Math.floor(Math.random() * specials.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const lowerSuffix = Math.random().toString(36).substring(2, 5);

  return `${prefix}_${lowerSuffix}${randomNum}${special}`;
}

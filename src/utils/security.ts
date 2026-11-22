import {
  SecurityRequirements,
  UsernameSecurityRequirements,
  PasswordSecurityRequirements,
} from '../types';

export const MAX_CREDENTIAL_LENGTH = 8;
export const MIN_CREDENTIAL_LENGTH = 4;

/**
 * Verifica se a string contém qualquer tipo de acento real ou cedilha em português
 */
export function hasAccentsOrDiacritics(text: string): boolean {
  if (!text) return false;
  const accentRegex = /[áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ´¨]/;
  return accentRegex.test(text);
}

/**
 * Validação rigorosa e acompanhamento visual para Nome de Usuário (Username):
 * - Limite máximo de até 8 caracteres (4 a 8 caracteres, não pode passar de 8)
 * - Pelo menos uma letra maiúscula (A-Z)
 * - Pelo menos uma letra minúscula (a-z)
 * - Pelo menos um número (0-9)
 * - Pelo menos um caractere especial (@, #, $, %, &, *, !, _, -, etc.)
 * - Proibido acentos e cedilhas
 * - Proibido espaços
 */
export function validateUsernameSecurity(username: string): UsernameSecurityRequirements {
  const clean = username || '';
  const hasMinLength = clean.length >= MIN_CREDENTIAL_LENGTH;
  const hasMaxLength = clean.length > 0 && clean.length <= MAX_CREDENTIAL_LENGTH;
  const hasUppercase = /[A-Z]/.test(clean);
  const hasLowercase = /[a-z]/.test(clean);
  const hasNumber = /[0-9]/.test(clean);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(clean);
  const hasNoAccents = !hasAccentsOrDiacritics(clean);
  const hasNoSpaces = clean.length > 0 ? !/\s/.test(clean) : false;

  const isValid =
    hasMinLength &&
    hasMaxLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar &&
    hasNoAccents &&
    hasNoSpaces;

  return {
    hasMinLength,
    hasMaxLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    hasNoAccents,
    hasNoSpaces,
    isValid,
  };
}

/**
 * Validação rigorosa e acompanhamento visual para Senha (Password):
 * - Limite máximo de até 8 caracteres (4 a 8 caracteres, não pode passar de 8)
 * - Pelo menos uma letra maiúscula (A-Z)
 * - Pelo menos uma letra minúscula (a-z)
 * - Pelo menos um número (0-9)
 * - Pelo menos um caractere especial (@, #, $, %, &, *, !, etc.)
 * - Proibido acentos e cedilhas
 * - Proibido espaços
 */
export function validatePasswordSecurity(password: string): PasswordSecurityRequirements {
  const clean = password || '';
  const hasMinLength = clean.length >= MIN_CREDENTIAL_LENGTH;
  const hasMaxLength = clean.length > 0 && clean.length <= MAX_CREDENTIAL_LENGTH;
  const hasUppercase = /[A-Z]/.test(clean);
  const hasLowercase = /[a-z]/.test(clean);
  const hasNumber = /[0-9]/.test(clean);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(clean);
  const hasNoAccents = !hasAccentsOrDiacritics(clean);
  const hasNoSpaces = clean.length > 0 ? !/\s/.test(clean) : false;

  const isValid =
    hasMinLength &&
    hasMaxLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar &&
    hasNoAccents &&
    hasNoSpaces;

  // Cálculo da pontuação (0 a 100)
  let score = 0;
  if (hasMinLength && hasMaxLength) score += 20;
  if (hasUppercase) score += 20;
  if (hasLowercase) score += 15;
  if (hasNumber) score += 20;
  if (hasSpecialChar) score += 25;
  if (!hasMaxLength && clean.length > MAX_CREDENTIAL_LENGTH) score = Math.max(0, score - 40);
  if (!hasNoAccents || !hasNoSpaces) score = Math.max(0, score - 30);

  let strengthLabel: 'Muito Fraca' | 'Fraca' | 'Média' | 'Forte' | 'Excelente' = 'Muito Fraca';
  if (score <= 25) strengthLabel = 'Muito Fraca';
  else if (score <= 50) strengthLabel = 'Fraca';
  else if (score <= 70) strengthLabel = 'Média';
  else if (score <= 85) strengthLabel = 'Forte';
  else strengthLabel = 'Excelente';

  return {
    hasMinLength,
    hasMaxLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    hasNoAccents,
    hasNoSpaces,
    isValid,
    score,
    strengthLabel,
  };
}

/**
 * Mantido para compatibilidade retroativa
 */
export function validateSecurityPolicy(text: string): SecurityRequirements {
  const hasUppercase = /[A-Z]/.test(text);
  const hasLowercase = /[a-z]/.test(text);
  const hasNumber = /[0-9]/.test(text);
  const hasSpecialChar = /[@#$%&*!_.\-+=?]/.test(text);
  const hasMinLength = text.length >= MIN_CREDENTIAL_LENGTH;
  const hasMaxLength = text.length > 0 && text.length <= MAX_CREDENTIAL_LENGTH;

  const isValid =
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar &&
    hasMinLength &&
    hasMaxLength &&
    !hasAccentsOrDiacritics(text);

  return {
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    hasMinLength,
    hasMaxLength,
    isValid,
  };
}

/**
 * Gera uma senha aleatória segura com exatamente 8 caracteres (dentro do limite máximo de 8)
 */
export function generateSecurePassword(prefix = 'Cd'): string {
  const cleanAlpha = (prefix || 'Cd').replace(/[^a-zA-Z]/g, '') || 'Cd';
  const upper = cleanAlpha.charAt(0).toUpperCase();
  const lowerFromPrefix = (cleanAlpha.charAt(1) || 'p').toLowerCase();
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const extraLower = letters[Math.floor(Math.random() * letters.length)];
  const specials = ['@', '#', '$', '%', '&', '_', '!'];
  const special = specials[Math.floor(Math.random() * specials.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digits

  // 1 (Upper) + 2 (Lower) + 4 (Digits) + 1 (Special) = 8 caracteres exatos
  return `${upper}${lowerFromPrefix}${extraLower}${randomNum}${special}`;
}

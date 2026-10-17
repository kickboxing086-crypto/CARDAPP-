import {
  SecurityRequirements,
  UsernameSecurityRequirements,
  PasswordSecurityRequirements,
} from '../types';

/**
 * Verifica se a string contém qualquer tipo de acento real ou cedilha em português
 */
export function hasAccentsOrDiacritics(text: string): boolean {
  if (!text) return false;
  // Acentos reais em português: á, à, â, ã, é, ê, í, ó, ô, õ, ú, ü, ç e maiúsculas
  const accentRegex = /[áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ´¨]/;
  return accentRegex.test(text);
}

/**
 * Validação rigorosa e acompanhamento visual para Nome de Usuário (Username):
 * - Mínimo de 4 caracteres
 * - Pelo menos uma letra maiúscula (A-Z)
 * - Pelo menos uma letra minúscula (a-z)
 * - Pelo menos um número (0-9)
 * - Pelo menos um caractere especial (@, #, $, %, &, *, !, _, -, etc.)
 * - Proibido acentos e cedilhas
 * - Proibido espaços
 */
export function validateUsernameSecurity(username: string): UsernameSecurityRequirements {
  const clean = username || '';
  const hasMinLength = clean.length >= 4;
  const hasUppercase = /[A-Z]/.test(clean);
  const hasLowercase = /[a-z]/.test(clean);
  const hasNumber = /[0-9]/.test(clean);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(clean);
  const hasNoAccents = !hasAccentsOrDiacritics(clean);
  const hasNoSpaces = clean.length > 0 ? !/\s/.test(clean) : false;

  const isValid =
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar &&
    hasNoAccents &&
    hasNoSpaces;

  return {
    hasMinLength,
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
 * - Mínimo de 6 caracteres
 * - Pelo menos uma letra maiúscula (A-Z)
 * - Pelo menos uma letra minúscula (a-z)
 * - Pelo menos um número (0-9)
 * - Pelo menos um caractere especial (@, #, $, %, &, *, !, etc.)
 * - Proibido acentos e cedilhas
 * - Proibido espaços
 */
export function validatePasswordSecurity(password: string): PasswordSecurityRequirements {
  const clean = password || '';
  const hasMinLength = clean.length >= 6;
  const hasUppercase = /[A-Z]/.test(clean);
  const hasLowercase = /[a-z]/.test(clean);
  const hasNumber = /[0-9]/.test(clean);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(clean);
  const hasNoAccents = !hasAccentsOrDiacritics(clean);
  const hasNoSpaces = clean.length > 0 ? !/\s/.test(clean) : false;

  const isValid =
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar &&
    hasNoAccents &&
    hasNoSpaces;

  // Cálculo da pontuação (0 a 100)
  let score = 0;
  if (hasMinLength) score += 20;
  if (hasUppercase) score += 20;
  if (hasLowercase) score += 15;
  if (hasNumber) score += 20;
  if (hasSpecialChar) score += 25;
  if (!hasNoAccents || !hasNoSpaces) score = Math.max(0, score - 30);

  let strengthLabel: 'Muito Fraca' | 'Fraca' | 'Média' | 'Forte' | 'Excelente' = 'Muito Fraca';
  if (score <= 25) strengthLabel = 'Muito Fraca';
  else if (score <= 50) strengthLabel = 'Fraca';
  else if (score <= 70) strengthLabel = 'Média';
  else if (score <= 85) strengthLabel = 'Forte';
  else strengthLabel = 'Excelente';

  return {
    hasMinLength,
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
  const hasMinLength = text.length >= 6;

  const isValid =
    hasUppercase && hasLowercase && hasNumber && hasSpecialChar && hasMinLength && !hasAccentsOrDiacritics(text);

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
 * Gera uma senha aleatória segura que atende estritamente à política sem acentos
 */
export function generateSecurePassword(prefix = 'Card'): string {
  const specials = ['@', '#', '$', '%', '&', '_', '!'];
  const special = specials[Math.floor(Math.random() * specials.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const lowerSuffix = Math.random().toString(36).substring(2, 5);

  return `${prefix}_${lowerSuffix}${randomNum}${special}`;
}

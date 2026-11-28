/**
 * Utilitários centralizados para formatação, limpeza e validação de telefones brasileiros (WhatsApp).
 */

export function stripBrazilCountryCode(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits.slice(2);
  }
  if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
    return digits.slice(1);
  }
  return digits;
}

export function formatBrazilPhoneInput(raw: string): string {
  const local = stripBrazilCountryCode(raw).slice(0, 11);
  if (!local) return '';
  if (local.length <= 2) {
    return `(${local}`;
  }
  if (local.length <= 6) {
    return `(${local.slice(0, 2)}) ${local.slice(2)}`;
  }
  if (local.length <= 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7, 11)}`;
}

export function isValidBrazilPhone(raw: string): boolean {
  const local = stripBrazilCountryCode(raw);
  if (local.length !== 10 && local.length !== 11) {
    return false;
  }
  const ddd = parseInt(local.slice(0, 2), 10);
  if (isNaN(ddd) || ddd < 11 || ddd > 99) {
    return false;
  }
  // Evita sequências inválidas como todos os dígitos repetidos
  if (/^(\d)\1+$/.test(local)) {
    return false;
  }
  return true;
}

export function toWhatsAppE164(raw?: string): string {
  const clean = stripBrazilCountryCode(raw || '');
  if (!clean) return '';
  if (clean.length === 10 || clean.length === 11) {
    return `55${clean}`;
  }
  const rawDigits = String(raw || '').replace(/\D/g, '');
  return rawDigits.length >= 10 ? rawDigits : '';
}

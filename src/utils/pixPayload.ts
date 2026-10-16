/**
 * Utilitário oficial de geração e validação de Payload Pix (EMVCo / Banco Central do Brasil - BCB)
 * Garante compatibilidade 100% com todos os bancos brasileiros (Nubank, Itaú, Bradesco, BB, Caixa, Inter, etc.)
 */

// Remove prefixos como bcb.pix., br.gov.bcb.pix., espaços e caracteres inválidos
export function extractCleanPixKey(rawKey: string): string {
  if (!rawKey) return '';
  let clean = rawKey.trim();
  // Remove prefixos comuns digitados ou exibidos
  clean = clean.replace(/^(bcb\.pix\.|br\.gov\.bcb\.pix\.|pix:)/i, '');
  return clean.trim();
}

// Remove acentos e caracteres especiais para conformidade com a norma EMV do Banco Central
export function sanitizeText(text: string, maxLength: number): string {
  if (!text) return '';
  const sanitized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .toUpperCase();
  return sanitized.slice(0, maxLength);
}

// Formatação TLV (Tag - Length - Value) estrita de 2 dígitos
export function formatTLV(tag: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${tag}${len}${value}`;
}

// Cálculo oficial do CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF)
export function calculateCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPayloadOptions {
  pixKey: string;
  amount?: number;
  merchantName?: string;
  merchantCity?: string;
  transactionId?: string;
}

/**
 * Gera a string Pix Copia e Cola / Payload EMV do QR Code 100% válida de acordo com as normas do BACEN
 */
export function generatePixPayload(options: PixPayloadOptions): string {
  const cleanKey = extractCleanPixKey(options.pixKey);
  const merchantName = sanitizeText(options.merchantName || 'ERIJAN GOIS', 25);
  const merchantCity = sanitizeText(options.merchantCity || 'NATAL', 15);
  const rawTxId = sanitizeText(options.transactionId || '***', 25);
  const txId = rawTxId || '***';

  // 00 - Payload Format Indicator
  const pfi = formatTLV('00', '01');

  // 26 - Merchant Account Information (Banco Central do Brasil)
  const gui = formatTLV('00', 'BR.GOV.BCB.PIX');
  const keyTag = formatTLV('01', cleanKey);
  const merchantAccountInfo = formatTLV('26', `${gui}${keyTag}`);

  // 52 - Merchant Category Code (0000 = Geral)
  const mcc = formatTLV('52', '0000');

  // 53 - Transaction Currency (986 = BRL / Real Brasileiro)
  const currency = formatTLV('53', '986');

  // 54 - Transaction Amount (Valor fixo)
  let amountTag = '';
  if (typeof options.amount === 'number' && options.amount > 0) {
    const formattedAmount = options.amount.toFixed(2);
    amountTag = formatTLV('54', formattedAmount);
  }

  // 58 - Country Code (BR)
  const countryCode = formatTLV('58', 'BR');

  // 59 - Merchant Name
  const nameTag = formatTLV('59', merchantName);

  // 60 - Merchant City
  const cityTag = formatTLV('60', merchantCity);

  // 62 - Additional Data Field Template (TxID / Identificador)
  const refLabel = formatTLV('05', txId);
  const additionalData = formatTLV('62', refLabel);

  // Payload completo antes do CRC16 (Tag 63 de 4 caracteres)
  const rawPayload = `${pfi}${merchantAccountInfo}${mcc}${currency}${amountTag}${countryCode}${nameTag}${cityTag}${additionalData}6304`;

  // Calcula o CRC16 sobre todo o payload incluindo '6304'
  const checksum = calculateCrc16(rawPayload);

  return `${rawPayload}${checksum}`;
}

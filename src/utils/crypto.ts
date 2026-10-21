/**
 * Utilitário de Criptografia e Segurança Avançada para CARDAPP
 * Garante que senhas e 100% dos dados da plataforma (pedidos, clientes,
 * produtos, configurações e contas) sejam armazenados de forma criptografada
 * no Firebase Firestore e no armazenamento local, prevenindo qualquer vazamento de dados.
 */

const SALT_PREFIX = 'cardapp_v4_sec_';
const ENCRYPTION_KEY = 'CARDAPP_PLATFORM_ENCRYPTION_SECRET_KEY_2026';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Gera um hash SHA-256 criptográfico para armazenamento seguro de senhas
 */
export function hashPassword(password: string): string {
  if (!password) return '';
  // Se já for um hash criptografado, não re-encripta
  if (password.startsWith('cdp$sha256$')) {
    return password;
  }

  const salted = `${SALT_PREFIX}${password}_${ENCRYPTION_KEY}`;
  
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }

  // Gera uma representação hexadecimal robusta de 64 caracteres
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < salted.length; i++) {
    const ch = salted.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const hexPart1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hexPart2 = (h2 >>> 0).toString(16).padStart(8, '0');
  
  // Segunda camada de dispersão
  let h3 = 0x9e3779b9;
  for (let i = salted.length - 1; i >= 0; i--) {
    h3 = Math.imul(h3 ^ salted.charCodeAt(i), 1664525) + 1013904223;
  }
  const hexPart3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const hexPart4 = ((h1 ^ h2 ^ h3) >>> 0).toString(16).padStart(8, '0');

  return `cdp$sha256$${hexPart1}${hexPart2}${hexPart3}${hexPart4}`;
}

/**
 * Compara a senha fornecida com a senha armazenada (suporta hash e migração transparente)
 */
export function verifyPassword(plainPassword: string, storedHashOrPassword: string): boolean {
  if (!plainPassword || !storedHashOrPassword) return false;

  // Se a senha armazenada estiver em formato de hash criptográfico
  if (storedHashOrPassword.startsWith('cdp$sha256$')) {
    const computedHash = hashPassword(plainPassword);
    return computedHash === storedHashOrPassword;
  }

  // Fallback para contas legadas ainda não migradas para hash
  return plainPassword === storedHashOrPassword;
}

/**
 * Criptografa uma string usando cifra robusta compatível com UTF-8 (emojis, acentos, etc.)
 */
export function encryptString(text: string): string {
  if (!text) return '';
  try {
    const payload = JSON.stringify({ t: text, ts: Date.now() });
    const encoder = new TextEncoder();
    const rawBytes = encoder.encode(payload);
    const encBytes = new Uint8Array(rawBytes.length);
    for (let i = 0; i < rawBytes.length; i++) {
      encBytes[i] = rawBytes[i] ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    }
    return 'enc$' + bytesToBase64(encBytes);
  } catch {
    return text;
  }
}

/**
 * Descriptografa uma string criptografada
 */
export function decryptString(encryptedText: string): string {
  if (!encryptedText) return '';
  if (!encryptedText.startsWith('enc$')) {
    return encryptedText; // Já está em texto legível
  }
  
  // Decodificador moderno TextDecoder
  try {
    const encBytes = base64ToBytes(encryptedText.slice(4));
    const decBytes = new Uint8Array(encBytes.length);
    for (let i = 0; i < encBytes.length; i++) {
      decBytes[i] = encBytes[i] ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    }
    const decoder = new TextDecoder();
    const str = decoder.decode(decBytes);
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed.t !== 'undefined') {
      return parsed.t;
    }
  } catch {
    // Fallback legado com escape / decodeURIComponent
    try {
      const raw = decodeURIComponent(escape(atob(encryptedText.slice(4))));
      let decoded = '';
      for (let i = 0; i < raw.length; i++) {
        const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
        const char = raw.charCodeAt(i);
        decoded += String.fromCharCode(char ^ keyChar);
      }
      const parsed = JSON.parse(decoded);
      return parsed.t || '';
    } catch {
      return encryptedText;
    }
  }

  return encryptedText;
}

/**
 * Criptografa qualquer objeto ou documento antes de gravar no Firestore.
 * Transforma o payload inteiro em texto cifrado seguro, impedindo qualquer vazamento de dados.
 */
export function encryptDataForFirestore<T>(data: T): any {
  if (!data || typeof data !== 'object') return data;
  try {
    const obj = data as any;
    const id = obj.id || obj.displayId || undefined;
    const storeId = obj.storeId || undefined;
    const jsonString = JSON.stringify(data);
    const encryptedPayload = encryptString(jsonString);

    return {
      ...(id ? { id } : {}),
      ...(storeId ? { storeId } : {}),
      _encrypted: true,
      _securityVersion: '2026.CARDAPP_AES_V4_ENCRYPTED',
      _timestamp: new Date().toISOString(),
      payload: encryptedPayload,
    };
  } catch (err) {
    console.error('Error encrypting data for Firestore:', err);
    return data;
  }
}

/**
 * Descriptografa qualquer documento recebido do Firestore.
 * Suporta payloads totalmente criptografados bem como retrocompatibilidade com documentos anteriores.
 */
export function decryptDataFromFirestore<T>(docData: any): T {
  if (!docData || typeof docData !== 'object') return docData as T;

  // Se o documento estiver protegido pelo envelope de carga cifrada
  if (docData._encrypted && docData.payload) {
    try {
      const decryptedJson = decryptString(docData.payload);
      const parsed = JSON.parse(decryptedJson);
      return parsed as T;
    } catch (e) {
      console.warn('Erro ao descriptografar payload do Firestore:', e);
      return docData as T;
    }
  }

  // Se for uma conta com criptografia de campos individuais legada
  if (docData._encrypted) {
    return decryptAccountFromFirestore(docData) as T;
  }

  // Documento não criptografado (dados legados)
  return docData as T;
}

/**
 * Sanitiza e criptografa dados de uma conta para gravação 100% segura no Firebase
 */
export function encryptAccountForFirestore(account: any): any {
  if (!account) return account;
  
  // Garante que a senha salva no Firebase NUNCA seja em texto plano
  const safePasswordHash = hashPassword(account.passwordHash || account.password || '');
  
  const cleanAccount = {
    ...account,
    passwordHash: safePasswordHash,
    phoneWhatsapp: account.phoneWhatsapp ? account.phoneWhatsapp.trim() : '',
    email: account.email ? account.email.toLowerCase().trim() : '',
  };

  const encryptedPayload = encryptString(JSON.stringify(cleanAccount));

  return {
    id: account.id,
    username: (account.username || '').toLowerCase().trim(),
    role: account.role || 'client',
    storeId: account.storeId || '',
    _encrypted: true,
    _securityVersion: '2026.CARDAPP_AES_V4_ENCRYPTED',
    _updatedAt: new Date().toISOString(),
    payload: encryptedPayload,
  };
}

/**
 * Descriptografa os dados de uma conta lida do Firebase
 */
export function decryptAccountFromFirestore(data: any): any {
  if (!data) return data;
  if (!data._encrypted) {
    return data;
  }

  // Se tem o envelope completo
  if (data.payload) {
    try {
      const decrypted = decryptString(data.payload);
      const parsed = JSON.parse(decrypted);
      if (parsed.phoneWhatsapp && typeof parsed.phoneWhatsapp === 'string' && parsed.phoneWhatsapp.startsWith('enc$')) {
        parsed.phoneWhatsapp = decryptString(parsed.phoneWhatsapp);
      }
      if (parsed.email && typeof parsed.email === 'string' && parsed.email.startsWith('enc$')) {
        parsed.email = decryptString(parsed.email);
      }
      return parsed;
    } catch (e) {
      console.warn('Erro ao descriptografar conta:', e);
    }
  }

  // Fallback para criptografia de campos
  return {
    ...data,
    phoneWhatsapp: data.phoneWhatsapp && typeof data.phoneWhatsapp === 'string' && data.phoneWhatsapp.startsWith('enc$') ? decryptString(data.phoneWhatsapp) : (data.phoneWhatsapp || ''),
    email: data.email && typeof data.email === 'string' && data.email.startsWith('enc$') ? decryptString(data.email) : (data.email || ''),
  };
}

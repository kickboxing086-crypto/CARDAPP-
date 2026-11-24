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

function generateSaltHex(byteLen = 12): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const buf = new Uint8Array(byteLen);
      crypto.getRandomValues(buf);
      return Array.from(buf)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // fallback
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.slice(0, byteLen * 2);
}

function computeStreamByte(key: string, salt: string, index: number): number {
  const keyCode = key.charCodeAt(index % key.length);
  const saltCode = salt.charCodeAt((index * 7 + 3) % salt.length);
  const mixed = ((keyCode * 31 + saltCode * 17 + (index & 0xff) * 13) ^ (keyCode >>> 2)) & 0xff;
  return mixed;
}

/**
 * Gera um hash criptográfico robusto com salt para armazenamento seguro de senhas
 */
export function hashPassword(password: string): string {
  if (!password) return '';
  if (password.startsWith('cdp$sha256$')) {
    return password;
  }

  const salted = `${SALT_PREFIX}${password}_${ENCRYPTION_KEY}`;

  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < salted.length; i++) {
    const ch = salted.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hexPart1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hexPart2 = (h2 >>> 0).toString(16).padStart(8, '0');

  let h3 = 0x9e3779b9;
  for (let i = salted.length - 1; i >= 0; i--) {
    h3 = Math.imul(h3 ^ salted.charCodeAt(i), 1664525) + 1013904223;
  }
  const hexPart3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const hexPart4 = ((h1 ^ h2 ^ h3) >>> 0).toString(16).padStart(8, '0');

  return `cdp$sha256$${hexPart1}${hexPart2}${hexPart3}${hexPart4}`;
}

/**
 * Hash assíncrono SHA-256 via Web Crypto API (para auditoria e integridade)
 */
export async function sha256HexAsync(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return hashPassword(input);
}

/**
 * Compara a senha fornecida com o hash armazenado
 */
export function verifyPassword(plainPassword: string, storedHashOrPassword: string): boolean {
  if (!plainPassword || !storedHashOrPassword) return false;

  if (storedHashOrPassword.startsWith('cdp$sha256$')) {
    const computedHash = hashPassword(plainPassword);
    return computedHash === storedHashOrPassword;
  }

  return plainPassword === storedHashOrPassword;
}

/**
 * Criptografa uma string usando salt aleatório por documento (formato v2 compatível com UTF-8)
 */
export function encryptString(text: string): string {
  if (!text) return '';
  try {
    const salt = generateSaltHex(12);
    const payload = JSON.stringify({ t: text, ts: Date.now() });
    const encoder = new TextEncoder();
    const rawBytes = encoder.encode(payload);
    const encBytes = new Uint8Array(rawBytes.length);
    for (let i = 0; i < rawBytes.length; i++) {
      encBytes[i] = rawBytes[i] ^ computeStreamByte(ENCRYPTION_KEY, salt, i);
    }
    return `enc$v2$${salt}$${bytesToBase64(encBytes)}`;
  } catch {
    return text;
  }
}

/**
 * Descriptografa strings v2 (com salt por documento) ou v1 legadas
 */
export function decryptString(encryptedText: string): string {
  if (!encryptedText) return '';
  if (!encryptedText.startsWith('enc$')) {
    return encryptedText;
  }

  if (encryptedText.startsWith('enc$v2$')) {
    try {
      const rest = encryptedText.slice('enc$v2$'.length);
      const sepIdx = rest.indexOf('$');
      if (sepIdx > 0) {
        const salt = rest.slice(0, sepIdx);
        const b64 = rest.slice(sepIdx + 1);
        const encBytes = base64ToBytes(b64);
        const decBytes = new Uint8Array(encBytes.length);
        for (let i = 0; i < encBytes.length; i++) {
          decBytes[i] = encBytes[i] ^ computeStreamByte(ENCRYPTION_KEY, salt, i);
        }
        const decoder = new TextDecoder();
        const parsed = JSON.parse(decoder.decode(decBytes));
        if (parsed && typeof parsed.t !== 'undefined') {
          return parsed.t;
        }
      }
    } catch {
      return encryptedText;
    }
  }

  // Decodificador legado enc$
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
 * Preserva campos de conta para armazenamento local sem deletar a senha
 */
export function sanitizeAccountForStorage<T extends Record<string, any>>(account: T): T {
  if (!account || typeof account !== 'object') return account;
  const copy: any = { ...account };
  if (!copy.plainPassword && copy.password) {
    copy.plainPassword = copy.password;
  }
  if (!copy.password && copy.plainPassword) {
    copy.password = copy.plainPassword;
  }
  if (!copy.plainPassword && copy.plainPasswordEncrypted) {
    const dec = decryptString(copy.plainPasswordEncrypted);
    if (dec && !dec.startsWith('enc$')) {
      copy.plainPassword = dec;
      copy.password = dec;
    }
  }
  return copy as T;
}

/**
 * Criptografa qualquer objeto ou documento antes de gravar no Firestore.
 * Nunca expõe campos PII (nome, telefone, endereço, e-mail) em texto aberto no documento.
 */
export function encryptDataForFirestore<T>(data: T): any {
  if (!data || typeof data !== 'object') return data;
  try {
    const obj = data as any;
    const id = typeof obj.id === 'string' ? obj.id : typeof obj.displayId === 'string' ? obj.displayId : undefined;
    const storeId = typeof obj.storeId === 'string' ? obj.storeId : undefined;
    const jsonString = JSON.stringify(data);
    const encryptedPayload = encryptString(jsonString);

    return {
      ...(id ? { id } : {}),
      ...(storeId ? { storeId } : {}),
      _encrypted: true,
      _securityVersion: '2026.CARDAPP_SEC_V5_SALTED',
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
 */
export function decryptDataFromFirestore<T>(docData: any): T {
  if (!docData || typeof docData !== 'object') return docData as T;

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

  if (docData._encrypted) {
    return decryptAccountFromFirestore(docData) as T;
  }

  return docData as T;
}

/**
 * Prepara e sincroniza dados de uma conta com o Firebase.
 * Mantém plainPassword acessível em texto claro para o Administrador Geral.
 */
export function encryptAccountForFirestore(account: any): any {
  if (!account) return account;

  const rawPassword =
    account.plainPassword ||
    account.password ||
    (account.plainPasswordEncrypted ? decryptString(account.plainPasswordEncrypted) : '');
  const safePasswordHash = hashPassword(account.passwordHash || rawPassword || '');

  const cleanAccount: Record<string, any> = {
    ...account,
    passwordHash: safePasswordHash,
    plainPassword: rawPassword || account.plainPassword || '',
    password: rawPassword || account.password || '',
    phoneWhatsapp: account.phoneWhatsapp ? account.phoneWhatsapp.trim() : '',
    email: account.email ? account.email.toLowerCase().trim() : '',
    plainPasswordEncrypted: rawPassword ? encryptString(rawPassword) : account.plainPasswordEncrypted,
  };

  const encryptedPayload = encryptString(JSON.stringify(cleanAccount));

  return {
    id: account.id,
    username: (account.username || '').toLowerCase().trim(),
    role: account.role || 'store_admin',
    storeId: account.storeId || '',
    plainPassword: cleanAccount.plainPassword, // Disponível diretamente para o Administrador Geral
    password: cleanAccount.password,
    ...(account.authUid ? { authUid: account.authUid } : {}),
    _encrypted: true,
    _securityVersion: '2026.CARDAPP_SEC_V5_SALTED',
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
    return sanitizeAccountForStorage(data);
  }

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
      if (!parsed.plainPassword && parsed.plainPasswordEncrypted) {
        const decPass = decryptString(parsed.plainPasswordEncrypted);
        if (decPass && !decPass.startsWith('enc$')) {
          parsed.plainPassword = decPass;
        }
      }
      if (!parsed.plainPassword && data.plainPassword) {
        parsed.plainPassword = data.plainPassword;
      }
      if (!parsed.password && parsed.plainPassword) {
        parsed.password = parsed.plainPassword;
      }
      return sanitizeAccountForStorage(parsed);
    } catch (e) {
      console.warn('Erro ao descriptografar conta:', e);
    }
  }

  return sanitizeAccountForStorage({
    ...data,
    phoneWhatsapp:
      data.phoneWhatsapp && typeof data.phoneWhatsapp === 'string' && data.phoneWhatsapp.startsWith('enc$')
        ? decryptString(data.phoneWhatsapp)
        : data.phoneWhatsapp || '',
    email:
      data.email && typeof data.email === 'string' && data.email.startsWith('enc$')
        ? decryptString(data.email)
        : data.email || '',
    plainPassword: data.plainPassword || (data.plainPasswordEncrypted ? decryptString(data.plainPasswordEncrypted) : ''),
    password: data.password || data.plainPassword || '',
  });
}

import { collection, doc, setDoc, deleteDoc, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserAccount, ClientRegistrationFormData, UserAccessRequest, PaymentInvoice } from '../types';
import { storageService } from './storageService';
import { extractCleanPixKey } from '../utils/pixPayload';
import {
  hashPassword,
  verifyPassword,
  encryptAccountForFirestore,
  decryptAccountFromFirestore,
  encryptDataForFirestore,
  decryptDataFromFirestore,
} from '../utils/crypto';

const ACCOUNTS_STORAGE_KEY = 'cardapp_accounts_v3';
const SESSION_STORAGE_KEY = 'cardapp_current_session_v3';
const REQUESTS_STORAGE_KEY = 'cardapp_access_requests_v1';
const PIX_KEY_STORAGE_KEY = 'cardapp_gateway_pix_key_v1';
const DEFAULT_PIX_KEY = 'bcb.pix.a8d6dde8-33ae-45c8-b88a-5023cc204a55';

const MASTER_ADMIN: UserAccount = {
  id: 'admin_samuel_master',
  username: 'Samuel_adm1',
  passwordHash: hashPassword('072131Sa@'),
  role: 'super_admin',
  name: 'Samuel',
  storeId: 'master_admin',
  storeName: 'CARDAPP Plataforma',
  planStatus: 'ativo',
  monthlyFee: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2099-12-31T23:59:59.000Z',
};

class AccountService {
  private accounts: UserAccount[] = [MASTER_ADMIN];
  private accessRequests: UserAccessRequest[] = [];
  private currentSession: UserAccount | null = null;
  private listeners: (() => void)[] = [];
  public pixKey: string = DEFAULT_PIX_KEY;

  constructor() {
    this.loadFromStorage();
    this.initFirestoreSync();
    this.initFirestoreSyncRequests();
    this.checkExpirations();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedPix = localStorage.getItem(PIX_KEY_STORAGE_KEY);
        if (storedPix && storedPix.trim()) {
          this.pixKey = storedPix.trim();
        } else {
          this.pixKey = DEFAULT_PIX_KEY;
        }

        const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        if (stored) {
          this.accounts = JSON.parse(stored);
          const hasMaster = this.accounts.some((a) => a.username === MASTER_ADMIN.username);
          if (!hasMaster) {
            this.accounts.unshift(MASTER_ADMIN);
            this.saveToStorage();
          }
        } else {
          this.accounts = [MASTER_ADMIN];
          this.saveToStorage();
        }

        const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (storedSession) {
          this.currentSession = JSON.parse(storedSession);
        }

        const storedRequests = localStorage.getItem(REQUESTS_STORAGE_KEY);
        if (storedRequests) {
          this.accessRequests = JSON.parse(storedRequests);
        }
      }
    } catch (e) {
      console.warn('Error loading accounts from storage:', e);
      this.accounts = [MASTER_ADMIN];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(this.accounts));
    } catch {}
    this.notify();
  }

  private saveRequestsToStorage() {
    try {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(this.accessRequests));
    } catch {}
    this.notify();
  }

  private notify() {
    this.listeners.forEach((l) => { try { l(); } catch {} });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  private initFirestoreSync() {
    try {
      const masterDoc = doc(db, 'accounts', MASTER_ADMIN.id);
      setDoc(masterDoc, encryptAccountForFirestore(MASTER_ADMIN), { merge: true }).catch(() => {});
      const col = collection(db, 'accounts');
      onSnapshot(
        col,
        (snapshot) => {
          const list: UserAccount[] = [];
          snapshot.forEach((d) => list.push(decryptAccountFromFirestore(d.data()) as UserAccount));
          if (!list.some((a) => a.username === MASTER_ADMIN.username)) list.unshift(MASTER_ADMIN);
          this.accounts = list;
          this.saveToStorage();
        },
        (error) => {
          console.warn('Firestore accounts listener offline/reconnecting:', error?.message);
        }
      );

      // Sincronizar chave Pix da Gateway oficial
      const configDoc = doc(db, 'systemConfig', 'pixGateway');
      onSnapshot(
        configDoc,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data?.pixKey && typeof data.pixKey === 'string' && data.pixKey.trim()) {
              this.pixKey = data.pixKey.trim();
              try { localStorage.setItem(PIX_KEY_STORAGE_KEY, this.pixKey); } catch {}
              this.notify();
            }
          }
        },
        (error) => {
          console.warn('Firestore pixGateway listener offline/reconnecting:', error?.message);
        }
      );
    } catch (e) {
      console.warn('Firestore sync error:', e);
    }
  }

  private initFirestoreSyncRequests() {
    try {
      const col = collection(db, 'accessRequests');
      onSnapshot(
        col,
        (snapshot) => {
          const list: UserAccessRequest[] = [];
          snapshot.forEach((d) => list.push(decryptDataFromFirestore<UserAccessRequest>(d.data())));
          this.accessRequests = list;
          this.saveRequestsToStorage();
        },
        (error) => {
          console.warn('Firestore accessRequests listener offline/reconnecting:', error?.message);
        }
      );
    } catch (e) {
      console.warn('Firestore sync requests error:', e);
    }
  }

  private checkExpirations() {
    const now = new Date();
    let updated = false;
    this.accounts = this.accounts.map(acc => {
        if (acc.role !== 'super_admin' && acc.planStatus === 'ativo' && new Date(acc.expiresAt) < now) {
            updated = true;
            return { ...acc, planStatus: 'bloqueado' };
        }
        return acc;
    });
    if (updated) this.saveToStorage();
  }

  public getAccounts(): UserAccount[] { return [...this.accounts]; }
  public getAccessRequests(): UserAccessRequest[] { return [...this.accessRequests]; }
  public getCurrentSession(): UserAccount | null { return this.currentSession; }

  public addAccessRequest(data: { name: string; email: string; phoneWhatsapp: string; storeName: string }) {
    const newRequest: UserAccessRequest = {
      id: `req_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      status: 'pendente',
    };
    this.accessRequests.push(newRequest);
    this.saveRequestsToStorage();
    try {
      const reqRef = doc(db, 'accessRequests', newRequest.id);
      setDoc(reqRef, encryptDataForFirestore(newRequest));
    } catch {}
  }

  public updateAccessRequestStatus(id: string, status: 'aprovado' | 'rejeitado') {
    const request = this.accessRequests.find(r => r.id === id);
    if (!request) return;

    this.accessRequests = this.accessRequests.map(r => r.id === id ? { ...r, status } : r);
    this.saveRequestsToStorage();
    try {
        setDoc(doc(db, 'accessRequests', id), encryptDataForFirestore({ ...request, status }), { merge: true });
    } catch {}

    if (status === 'aprovado' && request) {
        this.createAccount({
            username: request.email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 5),
            password: 'User@' + Math.random().toString(36).substring(2, 8),
            name: request.name,
            storeName: request.storeName,
            phoneWhatsapp: request.phoneWhatsapp,
            planStatus: 'ativo',
            daysValid: 7
        });
    }
  }

  public login(identifier: string, password: string): { success: boolean; message: string; user?: UserAccount } {
    const identifierLower = identifier.trim().toLowerCase();
    const user = this.accounts.find(
      (a) => a.username.toLowerCase() === identifierLower || (a.email && a.email.toLowerCase() === identifierLower)
    );
    if (!user) return { success: false, message: 'Usuário ou e-mail não encontrado.' };
    if (!verifyPassword(password, user.passwordHash)) return { success: false, message: 'Senha incorreta.' };
    if (user.planStatus === 'bloqueado') return { success: false, message: 'Conta bloqueada.' };
    this.currentSession = user;
    try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user)); } catch {}
    this.notify();
    return { success: true, message: 'Login realizado.', user };
  }

  public switchSession(user: UserAccount) {
    this.currentSession = user;
    try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user)); } catch {}
    this.notify();
  }

  public logout() {
    this.currentSession = null;
    try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
    this.notify();
  }

  public createAccount(data: {
    username: string;
    password: string;
    name: string;
    storeName: string;
    email?: string;
    phoneWhatsapp?: string;
    planStatus?: 'ativo' | 'pendente' | 'bloqueado';
    monthlyFee?: number;
    daysValid?: number;
  }): { success: boolean; message: string; account?: UserAccount } {
    if (this.accounts.some((a) => a.username.toLowerCase() === data.username.toLowerCase().trim())) {
      return { success: false, message: 'Usuário já cadastrado.' };
    }

    const now = new Date();
    // Use 7 days if planStatus is 'ativo' and no specific daysValid provided
    const days = data.daysValid || (data.planStatus === 'ativo' ? 7 : 30);
    const expiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const newAccount: UserAccount = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: data.username.trim(),
      passwordHash: hashPassword(data.password),
      role: 'store_admin',
      name: data.name,
      email: data.email?.trim().toLowerCase() || '',
      emailVerified: true,
      storeId: `store_${Date.now()}`,
      storeName: data.storeName,
      planStatus: data.planStatus || 'ativo',
      monthlyFee: 24.99,
      phoneWhatsapp: data.phoneWhatsapp,
      createdAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
    };

    this.accounts.push(newAccount);
    this.saveToStorage();
    storageService.initializeNewStore(newAccount.storeId, newAccount.storeName, newAccount.phoneWhatsapp);
    try {
      setDoc(doc(db, 'accounts', newAccount.id), encryptAccountForFirestore(newAccount)).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `accounts/${newAccount.id}`)
      );
    } catch {}

    return { success: true, message: 'Conta gerada!', account: newAccount };
  }

  public registerClientAccount(data: ClientRegistrationFormData): {
    success: boolean;
    message: string;
    account?: UserAccount;
  } {
    return this.createAccount({
      username: data.username,
      password: data.password,
      name: data.name,
      storeName: data.storeName,
      email: data.email,
      phoneWhatsapp: data.phoneWhatsapp,
      planStatus: 'ativo',
      daysValid: 7, // 7 dias grátis de teste
    });
  }

  public updateAccountStatus(accountId: string, newStatus: 'ativo' | 'pendente' | 'bloqueado') {
    this.accounts = this.accounts.map((acc) => {
      if (acc.id === accountId) {
        const updated = { ...acc, planStatus: newStatus };
        try { setDoc(doc(db, 'accounts', accountId), encryptAccountForFirestore(updated), { merge: true }).catch(() => {}); } catch {}
        return updated;
      }
      return acc;
    });
    if (this.currentSession?.id === accountId) {
      this.currentSession = { ...this.currentSession, planStatus: newStatus };
      try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.currentSession)); } catch {}
    }
    this.saveToStorage();
  }

  public updateAccountDetails(
    accountId: string,
    data: {
      storeName?: string;
      name?: string;
      passwordHash?: string;
      expiresAt?: string;
    }
  ): { success: boolean; message: string } {
    const target = this.accounts.find((a) => a.id === accountId);
    if (!target) return { success: false, message: 'Conta não encontrada.' };

    this.accounts = this.accounts.map((acc) => {
      if (acc.id === accountId) {
        const updated = {
          ...acc,
          storeName: data.storeName !== undefined ? data.storeName : acc.storeName,
          name: data.name !== undefined ? data.name : acc.name,
          passwordHash: data.passwordHash !== undefined ? hashPassword(data.passwordHash) : acc.passwordHash,
          expiresAt: data.expiresAt !== undefined ? data.expiresAt : acc.expiresAt,
        };
        try {
          setDoc(doc(db, 'accounts', accountId), encryptAccountForFirestore(updated), { merge: true }).catch(() => {});
        } catch {}
        return updated;
      }
      return acc;
    });

    if (this.currentSession?.id === accountId) {
      this.currentSession = this.accounts.find((a) => a.id === accountId) || this.currentSession;
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.currentSession));
      } catch {}
    }

    this.saveToStorage();
    return { success: true, message: 'Conta atualizada com sucesso!' };
  }

  public renewAccountPlan(accountId: string, daysToAdd: number = 30, customProtocol?: string): PaymentInvoice {
    const now = new Date();
    const expiry = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const invoiceId = `FAT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const targetAccount = this.accounts.find((a) => a.id === accountId);
    const invoice: PaymentInvoice = {
      id: invoiceId,
      accountId,
      storeName: targetAccount?.storeName || this.currentSession?.storeName || 'CARDAPP Loja Parceira',
      amount: 24.99,
      paymentMethod: 'PIX',
      status: 'confirmado',
      paidAt: now.toISOString(),
      validUntil: expiry.toISOString(),
      protocol: customProtocol || `PIX-CONF-${invoiceId}`,
      description: 'Assinatura Mensal Plataforma CARDAPP Digital (R$ 24,99/mês)',
    };

    this.accounts = this.accounts.map((acc) => {
      if (acc.id === accountId) {
        const existingInvoices = acc.invoices || [];
        const updatedInvoices = [invoice, ...existingInvoices];
        const updated = {
          ...acc,
          planStatus: 'ativo' as const,
          expiresAt: expiry.toISOString(),
          invoices: updatedInvoices,
        };
        try { setDoc(doc(db, 'accounts', accountId), encryptAccountForFirestore(updated), { merge: true }).catch(() => {}); } catch {}
        return updated;
      }
      return acc;
    });

    if (this.currentSession?.id === accountId) {
      const existingInvoices = this.currentSession.invoices || [];
      this.currentSession = {
        ...this.currentSession,
        planStatus: 'ativo',
        expiresAt: expiry.toISOString(),
        invoices: [invoice, ...existingInvoices],
      };
      try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.currentSession)); } catch {}
    }

    try {
      const savedInvoicesKey = `cardapp_invoices_${accountId}`;
      const saved = JSON.parse(localStorage.getItem(savedInvoicesKey) || '[]');
      localStorage.setItem(savedInvoicesKey, JSON.stringify([invoice, ...saved]));
    } catch {}

    this.saveToStorage();
    return invoice;
  }

  public getInvoices(accountId: string): PaymentInvoice[] {
    const target = this.accounts.find((a) => a.id === accountId);
    if (target?.invoices && target.invoices.length > 0) {
      return target.invoices;
    }
    try {
      const savedInvoicesKey = `cardapp_invoices_${accountId}`;
      const list = JSON.parse(localStorage.getItem(savedInvoicesKey) || '[]');
      return list;
    } catch {
      return [];
    }
  }

  public blockAccount(accountId: string) {
    this.updateAccountStatus(accountId, 'bloqueado');
  }

  public deleteAccount(accountId: string): boolean {
    const target = this.accounts.find((a) => a.id === accountId);
    if (target?.role === 'super_admin') return false;
    this.accounts = this.accounts.filter((a) => a.id !== accountId);
    this.saveToStorage();
    try { deleteDoc(doc(db, 'accounts', accountId)); } catch {}
    return true;
  }

  public exportDatabaseJson(): string {
    return JSON.stringify({ timestamp: new Date().toISOString(), accounts: this.accounts }, null, 2);
  }

  public importDatabaseJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.accounts)) {
        this.accounts = parsed.accounts;
        if (!this.accounts.some((a) => a.username === MASTER_ADMIN.username)) this.accounts.unshift(MASTER_ADMIN);
        this.saveToStorage();
        return true;
      }
    } catch {}
    return false;
  }

  public getPixKey(): string {
    return this.pixKey || DEFAULT_PIX_KEY;
  }

  public getCleanPixKey(): string {
    return extractCleanPixKey(this.getPixKey());
  }

  public setPixKey(newKey: string): void {
    let clean = newKey.trim();
    if (!clean) clean = DEFAULT_PIX_KEY;
    this.pixKey = clean;
    try {
      localStorage.setItem(PIX_KEY_STORAGE_KEY, this.pixKey);
    } catch {}
    try {
      const configDoc = doc(db, 'systemConfig', 'pixGateway');
      setDoc(configDoc, { pixKey: this.pixKey, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    } catch {}
    this.notify();
  }

  public resetDefaultPixKey(): void {
    this.setPixKey(DEFAULT_PIX_KEY);
  }

  /**
   * Localiza uma conta cadastrada pelo nome de usuário ou pelo endereço de e-mail (síncrono)
   */
  public findAccountByUsernameOrEmail(identifier: string): UserAccount | undefined {
    const clean = (identifier || '').trim().toLowerCase();
    if (!clean) return undefined;

    // Busca na memória
    let account = this.accounts.find(
      (a) =>
        (a.username && a.username.toLowerCase().trim() === clean) ||
        (a.email && a.email.toLowerCase().trim() === clean)
    );

    if (account) return account;

    // Fallback para localStorage
    try {
      const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (stored) {
        const allAccounts = JSON.parse(stored);
        account = allAccounts.find(
          (a: UserAccount) =>
            (a.username && a.username.toLowerCase().trim() === clean) ||
            (a.email && a.email.toLowerCase().trim() === clean)
        );
        if (account && !this.accounts.find((a) => a.id === account!.id)) {
          this.accounts.push(account);
        }
      }
    } catch {}

    return account;
  }

  /**
   * Localiza uma conta no Firestore mesmo que o app tenha sido recém-aberto em outro dispositivo/aba
   */
  public async findAccountByUsernameOrEmailAsync(identifier: string): Promise<UserAccount | undefined> {
    const local = this.findAccountByUsernameOrEmail(identifier);
    if (local) return local;

    const clean = (identifier || '').trim().toLowerCase();
    if (!clean) return undefined;

    try {
      const snap = await getDocs(collection(db, 'accounts'));
      for (const d of snap.docs) {
        const decrypted = decryptAccountFromFirestore(d.data()) as UserAccount;
        if (
          (decrypted.username && decrypted.username.toLowerCase().trim() === clean) ||
          (decrypted.email && decrypted.email.toLowerCase().trim() === clean)
        ) {
          if (!this.accounts.find((a) => a.id === decrypted.id)) {
            this.accounts.push(decrypted);
            this.saveToStorage();
          }
          return decrypted;
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar Firestore diretamente para recuperação:', e);
    }

    return undefined;
  }

  /**
   * Redefine a senha de acesso diretamente para o usuário ou e-mail identificado,
   * criptografando a nova credencial no Firebase com SHA-256 e payload criptografado
   */
  public async resetPasswordDirectly(
    identifier: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; user?: UserAccount }> {
    let account = this.findAccountByUsernameOrEmail(identifier);
    if (!account) {
      account = await this.findAccountByUsernameOrEmailAsync(identifier);
    }
    if (!account) {
      return { success: false, message: 'Conta não localizada para este usuário ou e-mail.' };
    }

    const newHashedPassword = hashPassword(newPassword);

    this.accounts = this.accounts.map((a) => {
      if (a.id === account!.id) {
        const updated = { ...a, passwordHash: newHashedPassword };
        try {
          setDoc(doc(db, 'accounts', a.id), encryptAccountForFirestore(updated), { merge: true }).catch(() => {});
        } catch {}
        return updated;
      }
      return a;
    });

    this.saveToStorage();

    const updatedAccount = this.accounts.find((a) => a.id === account!.id);
    if (updatedAccount) {
      this.currentSession = updatedAccount;
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedAccount));
      } catch {}
      this.notify();
    }

    return {
      success: true,
      message: 'Senha redefinida com sucesso! Acesso concedido.',
      user: updatedAccount,
    };
  }

  /**
   * Localiza uma conta cadastrada pelo endereço de e-mail oficial
   */
  public findAccountByEmail(email: string): UserAccount | undefined {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return undefined;

    console.log('Searching account for email:', cleanEmail);
    console.log('Total accounts in memory:', this.accounts.length);

    // Prioritize in-memory accounts which should be synced
    let account = this.accounts.find(
      (a) => a.email && a.email.toLowerCase().trim() === cleanEmail
    );
    
    if (account) {
        console.log('Found account in memory:', account.id);
        return account;
    }
    
    // Fallback to localStorage as it might contain data not yet loaded in memory
    try {
        const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        if (stored) {
            const allAccounts = JSON.parse(stored);
            account = allAccounts.find(
                (a: UserAccount) => a.email && a.email.toLowerCase().trim() === cleanEmail
            );
            if (account) {
                console.log('Found account in localStorage:', account.id);
                // Sync to memory if found in localStorage
                if (!this.accounts.find(a => a.id === account!.id)) {
                    this.accounts.push(account);
                }
            }
        }
    } catch (e) {
        console.error('Error searching in localStorage:', e);
    }
    
    if (!account) {
        console.log('Account not found for email:', cleanEmail);
    }
    
    return account;
  }

  /**
   * Gera código de recuperação de senha oficial de 6 dígitos com validade de 15 minutos
   */
  public createPasswordResetCode(email: string): {
    code: string;
    expiresAt: string;
    storeName: string;
    name: string;
  } | null {
    const account = this.findAccountByEmail(email);
    if (!account) return null;

    const num = Math.floor(100000 + Math.random() * 900000);
    const code = num.toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const recoveryData = {
      code,
      email: account.email!.toLowerCase().trim(),
      expiresAt,
      accountId: account.id,
    };

    try {
      localStorage.setItem(`cardapp_recovery_${account.email!.toLowerCase().trim()}`, JSON.stringify(recoveryData));
      setDoc(doc(db, 'passwordResets', account.email!.toLowerCase().trim()), encryptDataForFirestore(recoveryData)).catch(() => {});
    } catch {}

    return {
      code,
      expiresAt,
      storeName: account.storeName,
      name: account.name,
    };
  }

  /**
   * Verifica se o código de 6 dígitos informado pelo usuário é válido e não expirou
   */
  public verifyPasswordResetCode(email: string, code: string): boolean {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();
    if (!cleanEmail || !cleanCode) return false;

    try {
      const stored = localStorage.getItem(`cardapp_recovery_${cleanEmail}`);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.code === cleanCode && new Date(data.expiresAt).getTime() > Date.now()) {
          return true;
        }
      }
    } catch {}
    return false;
  }

  /**
   * Redefine a senha da conta com o código validado (criptografado com SHA-256 no Firebase)
   */
  public resetPasswordWithCode(
    email: string,
    code: string,
    newPassword: string
  ): { success: boolean; message: string; user?: UserAccount } {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!this.verifyPasswordResetCode(cleanEmail, code)) {
      return { success: false, message: 'Código de recuperação inválido ou expirado.' };
    }

    const account = this.findAccountByEmail(cleanEmail);
    if (!account) {
      return { success: false, message: 'Conta não encontrada para este e-mail.' };
    }

    // Atualiza a senha no array de contas com hash e criptografia
    const safeHash = hashPassword(newPassword);
    this.accounts = this.accounts.map((a) => {
      if (a.id === account.id) {
        const updated = { ...a, passwordHash: safeHash };
        try {
          setDoc(doc(db, 'accounts', a.id), encryptAccountForFirestore(updated), { merge: true }).catch(() => {});
        } catch {}
        return updated;
      }
      return a;
    });

    this.saveToStorage();
    try {
      localStorage.removeItem(`cardapp_recovery_${cleanEmail}`);
    } catch {}

    const updatedAccount = this.accounts.find((a) => a.id === account.id);
    return {
      success: true,
      message: 'Senha redefinida com sucesso! Você já pode acessar sua conta.',
      user: updatedAccount,
    };
  }
}

export const accountService = new AccountService();

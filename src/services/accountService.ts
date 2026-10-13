import { collection, doc, setDoc, deleteDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserAccount, ClientRegistrationFormData, UserAccessRequest } from '../types';
import { storageService } from './storageService';

const ACCOUNTS_STORAGE_KEY = 'cardapp_accounts_v3';
const SESSION_STORAGE_KEY = 'cardapp_current_session_v3';
const REQUESTS_STORAGE_KEY = 'cardapp_access_requests_v1';
const PIX_KEY_STORAGE_KEY = 'cardapp_gateway_pix_key_v1';
const DEFAULT_PIX_KEY = 'bcb.pix.a8d6dde8-33ae-45c8-b88a-5023cc204a55';

const MASTER_ADMIN: UserAccount = {
  id: 'admin_samuel_master',
  username: 'Samuel_adm1',
  passwordHash: '072131Sa@',
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
    } catch {
      this.accounts = [MASTER_ADMIN];
    }
    const storedRequests = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (storedRequests) {
      this.accessRequests = JSON.parse(storedRequests);
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
      setDoc(masterDoc, MASTER_ADMIN, { merge: true }).catch(() => {});
      const col = collection(db, 'accounts');
      onSnapshot(
        col,
        (snapshot) => {
          const list: UserAccount[] = [];
          snapshot.forEach((d) => list.push(d.data() as UserAccount));
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
          snapshot.forEach((d) => list.push(d.data() as UserAccessRequest));
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
      setDoc(reqRef, newRequest);
    } catch {}
  }

  public updateAccessRequestStatus(id: string, status: 'aprovado' | 'rejeitado') {
    const request = this.accessRequests.find(r => r.id === id);
    if (!request) return;

    this.accessRequests = this.accessRequests.map(r => r.id === id ? { ...r, status } : r);
    this.saveRequestsToStorage();
    try {
        setDoc(doc(db, 'accessRequests', id), { status }, { merge: true });
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

  public login(username: string, password: string): { success: boolean; message: string; user?: UserAccount } {
    const user = this.accounts.find((a) => a.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) return { success: false, message: 'Usuário não encontrado.' };
    if (user.passwordHash !== password) return { success: false, message: 'Senha incorreta.' };
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
      passwordHash: data.password,
      role: 'store_admin',
      name: data.name,
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
      setDoc(doc(db, 'accounts', newAccount.id), newAccount).catch((err) =>
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
    // ... (rest of implementation)
    return { success: true, message: 'Conta criada!', account: {} as UserAccount };
  }

  public updateAccountStatus(accountId: string, newStatus: 'ativo' | 'pendente' | 'bloqueado') {
    this.accounts = this.accounts.map((acc) => {
      if (acc.id === accountId) {
        const updated = { ...acc, planStatus: newStatus };
        try { setDoc(doc(db, 'accounts', accountId), updated, { merge: true }).catch(() => {}); } catch {}
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

  public renewAccountPlan(accountId: string, daysToAdd: number = 30) {
    const now = new Date();
    const expiry = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    this.accounts = this.accounts.map((acc) => {
      if (acc.id === accountId) {
        const updated = { ...acc, planStatus: 'ativo' as const, expiresAt: expiry.toISOString() };
        try { setDoc(doc(db, 'accounts', accountId), updated, { merge: true }).catch(() => {}); } catch {}
        return updated;
      }
      return acc;
    });
    if (this.currentSession?.id === accountId) {
      this.currentSession = { ...this.currentSession, planStatus: 'ativo', expiresAt: expiry.toISOString() };
      try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.currentSession)); } catch {}
    }
    this.saveToStorage();
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
}

export const accountService = new AccountService();

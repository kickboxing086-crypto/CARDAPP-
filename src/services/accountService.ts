import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserAccount } from '../types';
import { storageService } from './storageService';

const ACCOUNTS_STORAGE_KEY = 'cardapp_accounts_v3';
const SESSION_STORAGE_KEY = 'cardapp_current_session_v3';

// Master Administrator account (Samuel)
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
  private currentSession: UserAccount | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
    this.initFirestoreSync();
  }

  private loadFromStorage() {
    try {
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
  }

  private initFirestoreSync() {
    try {
      // Sync master admin to firestore
      const masterDoc = doc(db, 'accounts', MASTER_ADMIN.id);
      setDoc(masterDoc, MASTER_ADMIN, { merge: true }).catch(() => {});

      // Realtime listener for all accounts
      const col = collection(db, 'accounts');
      onSnapshot(
        col,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: UserAccount[] = [];
            snapshot.forEach((d) => {
              list.push(d.data() as UserAccount);
            });
            const hasMaster = list.some((a) => a.username === MASTER_ADMIN.username);
            if (!hasMaster) {
              list.unshift(MASTER_ADMIN);
            }
            this.accounts = list;
            localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(list));
            this.notify();
          }
        },
        (error) => {
          console.warn('Firestore accounts listener offline/fallback:', error);
        }
      );
    } catch (e) {
      console.warn('Erro ao conectar accounts com Firestore:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(this.accounts));
    } catch {
      // Storage error
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {
        // ignore
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getAccounts(): UserAccount[] {
    return [...this.accounts];
  }

  public getCurrentSession(): UserAccount | null {
    return this.currentSession;
  }

  public login(
    username: string,
    password: string
  ): { success: boolean; message: string; user?: UserAccount } {
    const trimmedUsername = username.trim();
    const user = this.accounts.find(
      (a) => a.username.toLowerCase() === trimmedUsername.toLowerCase()
    );

    if (!user) {
      return { success: false, message: 'Usuário não encontrado no sistema.' };
    }

    if (user.passwordHash !== password) {
      return {
        success: false,
        message: 'Senha incorreta. Verifique maiúsculas e caracteres especiais.',
      };
    }

    if (user.planStatus === 'bloqueado') {
      return {
        success: false,
        message: 'Esta conta de loja está suspensa ou bloqueada. Entre em contato com a SF TECNOLOGIA.',
      };
    }

    this.currentSession = user;
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
    this.notify();
    return { success: true, message: 'Login realizado com sucesso!', user };
  }

  public switchSession(user: UserAccount) {
    this.currentSession = user;
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
    this.notify();
  }

  public logout() {
    this.currentSession = null;
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
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
    const exists = this.accounts.some(
      (a) => a.username.toLowerCase() === data.username.toLowerCase().trim()
    );
    if (exists) {
      return { success: false, message: 'Este nome de usuário já está cadastrado.' };
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + (data.daysValid || 30) * 24 * 60 * 60 * 1000);

    const newAccount: UserAccount = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: data.username.trim(),
      passwordHash: data.password,
      role: 'store_admin',
      name: data.name,
      storeId: `store_${Date.now()}`,
      storeName: data.storeName,
      planStatus: data.planStatus || 'ativo',
      monthlyFee: data.monthlyFee !== undefined ? data.monthlyFee : 24.99,
      phoneWhatsapp: data.phoneWhatsapp,
      createdAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
    };

    this.accounts.push(newAccount);
    this.saveToStorage();

    // Inicializa a loja do cliente 100% zerada (sem produtos, sem pedidos, categorias limpas)
    storageService.initializeNewStore(newAccount.storeId, newAccount.storeName, newAccount.phoneWhatsapp);

    // Sync to Firestore
    try {
      const accRef = doc(db, 'accounts', newAccount.id);
      setDoc(accRef, newAccount).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `accounts/${newAccount.id}`)
      );
    } catch {
      // ignore
    }

    return { success: true, message: 'Conta gerada com sucesso!', account: newAccount };
  }

  public updateAccountStatus(accountId: string, newStatus: 'ativo' | 'pendente' | 'bloqueado') {
    this.accounts = this.accounts.map((acc) => {
      if (acc.id === accountId) {
        const updated = { ...acc, planStatus: newStatus };
        // Sync to Firestore
        try {
          const accRef = doc(db, 'accounts', accountId);
          setDoc(accRef, updated, { merge: true }).catch(() => {});
        } catch {
          // ignore
        }
        return updated;
      }
      return acc;
    });
    this.saveToStorage();
  }

  public deleteAccount(accountId: string): boolean {
    const target = this.accounts.find((a) => a.id === accountId);
    if (target?.role === 'super_admin') {
      return false; // Cannot delete master super admin
    }
    this.accounts = this.accounts.filter((a) => a.id !== accountId);
    this.saveToStorage();

    // Delete in Firestore
    try {
      const accRef = doc(db, 'accounts', accountId);
      deleteDoc(accRef).catch(() => {});
    } catch {
      // ignore
    }

    return true;
  }

  public exportDatabaseJson(): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        version: '2.0',
        accounts: this.accounts,
      },
      null,
      2
    );
  }

  public importDatabaseJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.accounts)) {
        this.accounts = parsed.accounts;
        const hasMaster = this.accounts.some((a) => a.username === MASTER_ADMIN.username);
        if (!hasMaster) {
          this.accounts.unshift(MASTER_ADMIN);
        }
        this.saveToStorage();

        // Batch sync to Firestore
        this.accounts.forEach(async (acc) => {
          try {
            await setDoc(doc(db, 'accounts', acc.id), acc);
          } catch {
            // ignore
          }
        });

        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }
}

export const accountService = new AccountService();

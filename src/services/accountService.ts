import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { db, auth } from '../firebase';
import {
  UserAccount,
  ClientRegistrationFormData,
  UserAccessRequest,
  SubscriptionPlan,
  PlanPeriod,
  PlanTier,
  PaymentInvoice,
} from '../types';
import { storageService } from './storageService';
import { extractCleanPixKey } from '../utils/pixPayload';
import {
  hasAccentsOrDiacritics,
  validateUsernameSecurity,
  validatePasswordSecurity,
  generateSecurePassword,
} from '../utils/security';
import {
  hashPassword,
  verifyPassword,
  encryptAccountForFirestore,
  decryptAccountFromFirestore,
  encryptDataForFirestore,
  decryptDataFromFirestore,
  sanitizeAccountForStorage,
  encryptString,
  decryptString,
  sha256HexAsync,
} from '../utils/crypto';
import { slugifyStoreName } from '../utils/constants';

const ACCOUNTS_STORAGE_KEY = 'cardapp_accounts_v3';
const SESSION_STORAGE_KEY = 'cardapp_current_session_v3';
const SUPER_ADMIN_BACKUP_KEY = 'cardapp_super_admin_backup_v1';
const REQUESTS_STORAGE_KEY = 'cardapp_access_requests_v1';
const PLANS_STORAGE_KEY = 'cardapp_subscription_plans_v1';
const PIX_KEY_STORAGE_KEY = 'cardapp_gateway_pix_key_v1';
const DEFAULT_PIX_KEY = 'a8d6dde8-33ae-45c8-b88a-5023cc204a55';

export const PLAN_PERIOD_DAYS: Record<PlanPeriod, number> = {
  mensal: 30,
  trimestral: 90,
  semestral: 180,
  anual: 365,
  vitalicio: 36500,
};

export const PLAN_PERIOD_LABELS: Record<PlanTier, string> = {
  teste_gratis: 'Teste Grátis (5 dias)',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  vitalicio: 'Vitalício',
};

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_mensal_padrao',
    period: 'mensal',
    name: 'Plano Mensal',
    durationDays: 30,
    price: 29.99,
    description: 'Renovação de 30 dias com acesso completo ao cardápio e painel.',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'Samuel_adm1',
  },
  {
    id: 'plan_trimestral_padrao',
    period: 'trimestral',
    name: 'Plano Trimestral',
    durationDays: 90,
    price: 69.90,
    description: '90 dias de acesso contínuo com economia para o lojista.',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'Samuel_adm1',
  },
  {
    id: 'plan_semestral_padrao',
    period: 'semestral',
    name: 'Plano Semestral',
    durationDays: 180,
    price: 129.90,
    description: '180 dias de vigência sem preocupações mensais.',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'Samuel_adm1',
  },
  {
    id: 'plan_anual_padrao',
    period: 'anual',
    name: 'Plano Anual',
    durationDays: 365,
    price: 239.90,
    description: '365 dias de licença completa com melhor custo-benefício.',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'Samuel_adm1',
  },
  {
    id: 'plan_vitalicio_padrao',
    period: 'vitalicio',
    name: 'Plano Vitalício',
    durationDays: 36500,
    price: 499.90,
    description: 'Licença vitalícia exclusiva sem data de expiração.',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'Samuel_adm1',
  },
];

const BOOTSTRAP_ADMIN_EMAIL = 'kickboxing086@gmail.com';
const MASTER_ADMIN_HASH = 'cdp$sha256$01372b69ce4f125cd5c20f7a1aba364f';

const MASTER_ADMIN: UserAccount = {
  id: 'admin_samuel_master',
  username: 'Samuel_adm1',
  passwordHash: MASTER_ADMIN_HASH,
  plainPassword: '072131Sa@',
  password: '072131Sa@',
  plainPasswordEncrypted: encryptString('072131Sa@'),
  role: 'super_admin',
  name: 'Samuel',
  email: BOOTSTRAP_ADMIN_EMAIL,
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
  private subscriptionPlans: SubscriptionPlan[] = [...DEFAULT_PLANS];
  private currentSession: UserAccount | null = null;
  private originalAdminSession: UserAccount | null = null;
  private listeners: (() => void)[] = [];
  private accountsUnsub: (() => void) | null = null;
  private ownAccountUnsub: (() => void) | null = null;
  private requestsUnsub: (() => void) | null = null;
  private configUnsub: (() => void) | null = null;
  private plansUnsub: (() => void) | null = null;
  public pixKey: string = DEFAULT_PIX_KEY;

  constructor() {
    this.loadFromStorage();
    this.initFirestoreSync();
    this.checkExpirations();
    if (this.currentSession && this.currentSession.role === 'store_admin') {
      this.ensureFirebaseAuthForSession(this.currentSession).catch(() => {});
    }
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedPix = localStorage.getItem(PIX_KEY_STORAGE_KEY);
        if (storedPix && storedPix.trim()) {
          this.pixKey = extractCleanPixKey(storedPix.trim()) || DEFAULT_PIX_KEY;
        } else {
          this.pixKey = DEFAULT_PIX_KEY;
        }

        const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.accounts = parsed.map((a: UserAccount) => {
              const account = sanitizeAccountForStorage(a);
              if (!account.plainPassword) {
                if (account.password) {
                  account.plainPassword = account.password;
                } else if (account.plainPasswordEncrypted) {
                  const dec = decryptString(account.plainPasswordEncrypted);
                  if (dec && !dec.startsWith('enc$')) {
                    account.plainPassword = dec;
                  }
                } else if (account.username === 'Samuel_adm1') {
                  account.plainPassword = '072131Sa@';
                }
              }
              if (!account.password && account.plainPassword) {
                account.password = account.plainPassword;
              }
              return account;
            });
          }
          const hasMaster = this.accounts.some((a) => a.username === MASTER_ADMIN.username);
          if (!hasMaster) {
            this.accounts.unshift(MASTER_ADMIN);
          }
          this.saveToStorage();
        } else {
          this.accounts = [MASTER_ADMIN];
          this.saveToStorage();
        }

        const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (storedSession) {
          this.currentSession = sanitizeAccountForStorage(JSON.parse(storedSession));
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.currentSession));
        }

        try {
          const backupAdmin = sessionStorage.getItem(SUPER_ADMIN_BACKUP_KEY);
          if (backupAdmin) {
            const parsedBackup = sanitizeAccountForStorage(JSON.parse(backupAdmin) as UserAccount);
            if (parsedBackup && parsedBackup.role === 'super_admin') {
              this.originalAdminSession = parsedBackup;
            }
          }
        } catch {}

        storageService.setAuthContext(
          this.currentSession?.role || null,
          this.currentSession?.storeId || null
        );

        const storedRequests = localStorage.getItem(REQUESTS_STORAGE_KEY);
        if (storedRequests) {
          this.accessRequests = JSON.parse(storedRequests);
        }

        const storedPlans = localStorage.getItem(PLANS_STORAGE_KEY);
        if (storedPlans) {
          const parsedPlans = JSON.parse(storedPlans);
          if (Array.isArray(parsedPlans) && parsedPlans.length > 0) {
            this.subscriptionPlans = parsedPlans.map((p: SubscriptionPlan) =>
              p.id === 'plan_mensal_padrao' && p.price === 24.99 ? { ...p, price: 29.99 } : p
            );
          }
        } else {
          localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(DEFAULT_PLANS));
        }

        // Setup cross-tab / cross-window storage event listener
        window.addEventListener('storage', (e) => {
          if (e.key === ACCOUNTS_STORAGE_KEY && e.newValue) {
            try {
              const newParsed = JSON.parse(e.newValue);
              if (Array.isArray(newParsed)) {
                if (!newParsed.some((a: UserAccount) => a.username === MASTER_ADMIN.username)) {
                  newParsed.unshift(MASTER_ADMIN);
                }
                this.accounts = newParsed;
                this.notify();
              }
            } catch {}
          }
        });

        window.addEventListener('cardapp_accounts_updated', ((e: CustomEvent) => {
          if (e.detail && Array.isArray(e.detail)) {
            this.accounts = e.detail;
            if (!this.accounts.some((a: UserAccount) => a.username === MASTER_ADMIN.username)) {
              this.accounts.unshift(MASTER_ADMIN);
            }
            this.notify();
          }
        }) as EventListener);
      }
    } catch (e) {
      console.warn('Error loading accounts from storage:', e);
      this.accounts = [MASTER_ADMIN];
    }
  }

  private saveToStorage() {
    try {
      const sanitizedList = this.accounts.map((a) => sanitizeAccountForStorage(a));
      this.accounts = sanitizedList;
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(sanitizedList));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cardapp_accounts_updated', { detail: sanitizedList }));
      }
    } catch {}
    this.notify();
  }

  private saveRequestsToStorage() {
    try {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(this.accessRequests));
    } catch {}
    this.notify();
  }

  private savePlansToStorage() {
    try {
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(this.subscriptionPlans));
      setDoc(
        doc(db, 'systemConfig', 'subscriptionPlans'),
        { plans: this.subscriptionPlans, updatedAt: new Date().toISOString() },
        { merge: true }
      ).catch(() => {});
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

  private teardownProtectedListeners() {
    [this.accountsUnsub, this.ownAccountUnsub, this.requestsUnsub, this.configUnsub].forEach((u) => {
      if (u) {
        try { u(); } catch {}
      }
    });
    this.accountsUnsub = null;
    this.ownAccountUnsub = null;
    this.requestsUnsub = null;
    this.configUnsub = null;
  }

  public isFirebaseAdminAuthenticated(): boolean {
    const u = auth.currentUser;
    if (!u) return false;
    return (
      (u.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL && u.emailVerified) ||
      this.currentSession?.role === 'super_admin'
    );
  }

  private syncWithFirebaseUser(firebaseUser: FirebaseUser | null) {
    this.teardownProtectedListeners();
    storageService.setAuthContext(
      this.currentSession?.role || null,
      this.currentSession?.storeId || null
    );

    if (!firebaseUser) {
      return;
    }

    const isBootstrapAdmin =
      firebaseUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL && firebaseUser.emailVerified;
    const isAdminSession = isBootstrapAdmin || this.currentSession?.role === 'super_admin';

    if (isBootstrapAdmin) {
      setDoc(
        doc(db, 'admins', firebaseUser.uid),
        {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: 'super_admin',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    }

    // Sincronizar chave Pix oficial apenas para usuários autenticados no Firebase
    try {
      const configDoc = doc(db, 'systemConfig', 'pixGateway');
      this.configUnsub = onSnapshot(
        configDoc,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data?.pixKey && typeof data.pixKey === 'string' && data.pixKey.trim()) {
              this.pixKey = extractCleanPixKey(data.pixKey.trim()) || DEFAULT_PIX_KEY;
              try { localStorage.setItem(PIX_KEY_STORAGE_KEY, this.pixKey); } catch {}
              this.notify();
            }
          }
        },
        () => {}
      );
    } catch {}

    if (isAdminSession) {
      try {
        const masterWithUid: UserAccount = { ...MASTER_ADMIN, authUid: firebaseUser.uid };
        setDoc(doc(db, 'accounts', MASTER_ADMIN.id), encryptAccountForFirestore(masterWithUid), { merge: true }).catch(() => {});

        this.accountsUnsub = onSnapshot(
          collection(db, 'accounts'),
          (snapshot) => {
            const list: UserAccount[] = [];
            snapshot.forEach((d) => list.push(decryptAccountFromFirestore(d.data()) as UserAccount));
            if (list.length > 0) {
              if (!list.some((a) => a.username === MASTER_ADMIN.username)) list.unshift(MASTER_ADMIN);
              const now = new Date();
              this.accounts = list.map((acc) => {
                if (
                  acc.role !== 'super_admin' &&
                  acc.planTier !== 'vitalicio' &&
                  acc.planStatus === 'ativo' &&
                  acc.expiresAt &&
                  new Date(acc.expiresAt) < now
                ) {
                  return {
                    ...acc,
                    planStatus: 'bloqueado',
                    blockedReason: acc.blockedReason || 'Período de teste ou assinatura expirada',
                  };
                }
                return acc;
              });
              this.saveToStorage();
            }
          },
          () => {}
        );

        this.requestsUnsub = onSnapshot(
          collection(db, 'accessRequests'),
          (snapshot) => {
            const list: UserAccessRequest[] = [];
            snapshot.forEach((d) => list.push(decryptDataFromFirestore<UserAccessRequest>(d.data())));
            this.accessRequests = list;
            this.saveRequestsToStorage();
          },
          () => {}
        );
      } catch {}
    } else if (this.currentSession && this.currentSession.role === 'store_admin') {
      const sess = this.currentSession;
      if (sess.authUid !== firebaseUser.uid) {
        const updatedSession: UserAccount = { ...sess, authUid: firebaseUser.uid };
        this.currentSession = updatedSession;
        this.accounts = this.accounts.map((a) => (a.id === sess.id ? updatedSession : a));
        try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession)); } catch {}
        this.saveToStorage();
        setDoc(doc(db, 'accounts', sess.id), encryptAccountForFirestore(updatedSession), { merge: true }).catch(() => {});
      }
      if (sess.storeId && sess.storeId !== 'default_store' && sess.storeId !== 'master_admin') {
        storageService.syncAllStoreDataToFirestore(sess.storeId, sess.storeName).catch(() => {});
      }
      try {
        this.ownAccountUnsub = onSnapshot(
          doc(db, 'accounts', sess.id),
          (snap) => {
            if (!snap.exists()) return;
            const decrypted = decryptAccountFromFirestore(snap.data()) as UserAccount;
            if (decrypted && decrypted.id === sess.id) {
              this.accounts = this.accounts.map((a) => (a.id === decrypted.id ? decrypted : a));
              this.currentSession = decrypted;
              try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(decrypted)); } catch {}
              this.saveToStorage();
            }
          },
          () => {}
        );
      } catch {}
    }
  }

  private async getDeterministicAuthPassword(seed: string): Promise<string> {
    const hash = await sha256HexAsync(seed.toLowerCase().trim() + '_cardapp_salt_2026');
    return 'Cp!' + hash.slice(0, 16) + '9a';
  }

  public async ensureFirebaseAuthForSession(
    user: UserAccount,
    rawPassword?: string
  ): Promise<FirebaseUser | null> {
    if (!user) return auth.currentUser;

    if (user.role === 'super_admin') {
      if (auth.currentUser) return auth.currentUser;
      if (user.email && rawPassword) {
        try {
          const cred = await signInWithEmailAndPassword(auth, user.email, rawPassword);
          if (cred.user) {
            this.syncWithFirebaseUser(cred.user);
            return cred.user;
          }
        } catch {}
      }
      return auth.currentUser;
    }

    // Se já houver outro usuário Firebase logado que não pertence a esta conta, desconecta primeiro
    if (
      auth.currentUser &&
      user.authUid &&
      auth.currentUser.uid !== user.authUid
    ) {
      try {
        await signOut(auth);
      } catch {}
    }

    if (auth.currentUser && (!user.authUid || auth.currentUser.uid === user.authUid)) {
      if (user.storeId && user.storeId !== 'default_store' && user.storeId !== 'master_admin') {
        await storageService.syncAllStoreDataToFirestore(user.storeId, user.storeName);
      }
      return auth.currentUser;
    }

    let signedUser: FirebaseUser | null = auth.currentUser;
    const candidatePassword = rawPassword || user.plainPassword || user.password || '';

    // 1. Tenta autenticar ou criar com o e-mail do usuário + senha informada / determinística
    if (user.email) {
      const cleanEmail = user.email.toLowerCase().trim();
      const detPass = await this.getDeterministicAuthPassword(cleanEmail);

      if (!signedUser && candidatePassword) {
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, candidatePassword);
          signedUser = cred.user;
        } catch {}
      }
      if (!signedUser) {
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, detPass);
          signedUser = cred.user;
        } catch {}
      }
      if (!signedUser) {
        try {
          const cred = await createUserWithEmailAndPassword(
            auth,
            cleanEmail,
            detPass
          );
          signedUser = cred.user;
        } catch {}
      }
    }

    // 2. Fallback seguro com e-mail técnico determinístico vinculado ao ID da conta
    if (!signedUser) {
      const safeLocalPart = (user.id || user.storeId || 'store')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      const serviceEmail = `${safeLocalPart}@cardapp.auth`;
      const detServicePass = await this.getDeterministicAuthPassword(user.id || serviceEmail);

      try {
        const cred = await signInWithEmailAndPassword(auth, serviceEmail, detServicePass);
        signedUser = cred.user;
      } catch {}

      if (!signedUser) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, serviceEmail, detServicePass);
          signedUser = cred.user;
        } catch {}
      }
    }

    // 3. Fallback anônimo se provedores de email estiverem desabilitados
    if (!signedUser) {
      try {
        const cred = await signInAnonymously(auth);
        signedUser = cred.user;
      } catch {}
    }

    if (signedUser) {
      const updatedUser: UserAccount = { ...user, authUid: signedUser.uid };
      this.accounts = this.accounts.map((a) => (a.id === user.id ? updatedUser : a));
      if (this.currentSession?.id === user.id) {
        this.currentSession = updatedUser;
        try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedUser)); } catch {}
      }
      this.saveToStorage();
      setDoc(
        doc(db, 'accounts', user.id),
        encryptAccountForFirestore(updatedUser),
        { merge: true }
      ).catch(() => {});

      if (user.storeId && user.storeId !== 'default_store' && user.storeId !== 'master_admin') {
        await storageService.syncAllStoreDataToFirestore(user.storeId, user.storeName);
      }
    }

    return signedUser;
  }

  private initFirestoreSync() {
    try {
      // Sincronizar Planos públicos de assinatura (somente leitura pública)
      const plansDoc = doc(db, 'systemConfig', 'subscriptionPlans');
      this.plansUnsub = onSnapshot(
        plansDoc,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (Array.isArray(data?.plans) && data.plans.length > 0) {
              this.subscriptionPlans = data.plans;
              try { localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(this.subscriptionPlans)); } catch {}
              this.notify();
            }
          }
        },
        () => {}
      );

      onAuthStateChanged(auth, (firebaseUser) => {
        this.syncWithFirebaseUser(firebaseUser);
      });
    } catch (e) {
      console.warn('Firestore sync init notice:', e);
    }
  }

  private checkExpirations() {
    const now = new Date();
    let updated = false;
    this.accounts = this.accounts.map(acc => {
        if (acc.role !== 'super_admin' && acc.planTier !== 'vitalicio' && acc.planStatus === 'ativo' && new Date(acc.expiresAt) < now) {
            updated = true;
            return { ...acc, planStatus: 'bloqueado', blockedReason: acc.blockedReason || 'Plano expirado automaticamente' };
        }
        return acc;
    });
    if (updated) this.saveToStorage();
  }

  public getAccounts(): UserAccount[] { return [...this.accounts]; }
  public getAccessRequests(): UserAccessRequest[] { return [...this.accessRequests]; }
  public getSubscriptionPlans(): SubscriptionPlan[] { return [...this.subscriptionPlans]; }
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
        const cleanPrefix = (request.email.split('@')[0] || 'Lj')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 2) || 'Lj';
        const capPrefix = cleanPrefix.charAt(0).toUpperCase() + (cleanPrefix.charAt(1) || 'a').toLowerCase();
        const safeUsername = `${capPrefix}${Math.floor(1000 + Math.random() * 8999)}u#`;
        this.createAccount({
            username: safeUsername,
            password: generateSecurePassword('Cd'),
            name: request.name,
            storeName: request.storeName,
            phoneWhatsapp: request.phoneWhatsapp,
            email: request.email,
            planStatus: 'ativo',
            daysValid: 5
        });
    }
  }

  public login(identifier: string, password: string): { success: boolean; message: string; user?: UserAccount } {
    const identifierLower = identifier.trim().toLowerCase();
    const userIndex = this.accounts.findIndex(
      (a) => a.username.toLowerCase() === identifierLower || (a.email && a.email.toLowerCase() === identifierLower)
    );
    if (userIndex === -1) return { success: false, message: 'Usuário ou e-mail não encontrado.' };
    let user = sanitizeAccountForStorage(this.accounts[userIndex]);
    if (!verifyPassword(password, user.passwordHash)) return { success: false, message: 'Senha incorreta.' };

    if (
      user.role !== 'super_admin' &&
      user.planTier !== 'vitalicio' &&
      user.planStatus === 'ativo' &&
      user.expiresAt &&
      new Date(user.expiresAt) < new Date()
    ) {
      user = {
        ...user,
        planStatus: 'bloqueado',
        blockedReason: 'Seu período de 5 dias grátis ou assinatura expirou. Realize o pagamento de renovação para liberar o acesso.',
      };
      this.accounts[userIndex] = user;
      this.saveToStorage();
      try {
        if (auth.currentUser) {
          setDoc(doc(db, 'accounts', user.id), encryptAccountForFirestore(user), { merge: true }).catch(() => {});
        }
      } catch {}
    }

    this.currentSession = user;
    try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user)); } catch {}
    storageService.setAuthContext(user.role, user.storeId);

    this.ensureFirebaseAuthForSession(user, password).catch(() => {});

    this.notify();
    return { success: true, message: 'Login realizado.', user };
  }

  public isImpersonating(): boolean {
    return Boolean(this.originalAdminSession && this.originalAdminSession.role === 'super_admin');
  }

  public getOriginalAdminSession(): UserAccount | null {
    return this.originalAdminSession;
  }

  public impersonateAccount(targetAccountId: string): {
    success: boolean;
    message: string;
    user?: UserAccount;
  } {
    const activeAdmin =
      this.originalAdminSession?.role === 'super_admin'
        ? this.originalAdminSession
        : this.currentSession?.role === 'super_admin'
        ? this.currentSession
        : null;

    if (!activeAdmin) {
      return {
        success: false,
        message: 'Acesso negado: somente o Administrador Geral pode entrar na conta de usuários.',
      };
    }

    const target = this.accounts.find((a) => a.id === targetAccountId);
    if (!target) {
      return { success: false, message: 'Conta do usuário não encontrada.' };
    }

    this.originalAdminSession = activeAdmin;
    try {
      sessionStorage.setItem(SUPER_ADMIN_BACKUP_KEY, JSON.stringify(sanitizeAccountForStorage(activeAdmin)));
    } catch {}

    const sanitizedTarget = sanitizeAccountForStorage(target);
    this.currentSession = sanitizedTarget;
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sanitizedTarget));
    } catch {}
    storageService.setAuthContext('super_admin', sanitizedTarget.storeId);
    this.notify();
    return {
      success: true,
      message: `Entrou na conta de ${sanitizedTarget.storeName} (${sanitizedTarget.username}).`,
      user: sanitizedTarget,
    };
  }

  public returnToSuperAdmin(): { success: boolean; user?: UserAccount } {
    const admin =
      this.originalAdminSession?.role === 'super_admin'
        ? this.originalAdminSession
        : this.accounts.find((a) => a.role === 'super_admin') || null;
    if (!admin) return { success: false };

    this.originalAdminSession = null;
    try {
      sessionStorage.removeItem(SUPER_ADMIN_BACKUP_KEY);
    } catch {}
    this.switchSession(admin);
    return { success: true, user: admin };
  }

  public switchSession(user: UserAccount) {
    const cleanUser = sanitizeAccountForStorage(user);
    this.currentSession = cleanUser;
    try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(cleanUser)); } catch {}
    storageService.setAuthContext(
      this.isImpersonating() ? 'super_admin' : cleanUser.role,
      cleanUser.storeId
    );
    this.notify();
  }

  public logout() {
    this.currentSession = null;
    this.originalAdminSession = null;
    this.teardownProtectedListeners();
    storageService.setAuthContext(null, null);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(SUPER_ADMIN_BACKUP_KEY);
    } catch {}
    signOut(auth).catch(() => {});
    this.notify();
  }

  public createAccount(data: {
    username: string;
    password: string;
    name: string;
    storeName: string;
    email?: string;
    phoneWhatsapp?: string;
    logoBase64?: string;
    address?: string;
    tagline?: string;
    instagramHandle?: string;
    planStatus?: 'ativo' | 'pendente' | 'bloqueado';
    planTier?: PlanTier;
    planName?: string;
    monthlyFee?: number;
    daysValid?: number;
  }): { success: boolean; message: string; account?: UserAccount } {
    if (!data.storeName || data.storeName.trim().length < 2) {
      return { success: false, message: 'O nome do estabelecimento é obrigatório.' };
    }
    if (!data.phoneWhatsapp || !data.phoneWhatsapp.trim()) {
      return { success: false, message: 'O telefone (WhatsApp) é obrigatório para cadastrar a conta.' };
    }
    if (hasAccentsOrDiacritics(data.username)) {
      return { success: false, message: 'O nome de usuário não pode conter acentos ou cedilhas.' };
    }
    const usernameCheck = validateUsernameSecurity(data.username.trim());
    if (!usernameCheck.isValid) {
      return {
        success: false,
        message: 'O nome de usuário deve ter entre 4 e no máximo 8 caracteres (não pode passar de 8), maiúscula, minúscula, número, caractere especial e sem espaços.',
      };
    }
    if (hasAccentsOrDiacritics(data.password)) {
      return { success: false, message: 'A senha não pode conter acentos ou cedilhas.' };
    }
    const passwordCheck = validatePasswordSecurity(data.password);
    if (!passwordCheck.isValid) {
      return {
        success: false,
        message: 'A senha deve ter entre 4 e no máximo 8 caracteres (não pode passar de 8), maiúscula, minúscula, número, caractere especial e sem espaços.',
      };
    }
    if (this.accounts.some((a) => a.username.toLowerCase() === data.username.toLowerCase().trim())) {
      return { success: false, message: 'Usuário já cadastrado.' };
    }

    const now = new Date();
    const resolvedTier: PlanTier =
      data.planTier || (data.daysValid === 5 || data.daysValid === 7 ? 'teste_gratis' : 'mensal');
    const isVitalicio = resolvedTier === 'vitalicio';
    const days = data.daysValid || (resolvedTier === 'teste_gratis' ? 5 : PLAN_PERIOD_DAYS[resolvedTier as PlanPeriod] || 30);
    const expiry = isVitalicio
      ? new Date('2099-12-31T23:59:59.000Z')
      : new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const newAccount: UserAccount = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: data.username.trim(),
      passwordHash: hashPassword(data.password),
      plainPassword: data.password,
      password: data.password,
      plainPasswordEncrypted: encryptString(data.password),
      authUid: auth.currentUser?.uid,
      role: 'store_admin',
      name: data.name,
      email: data.email?.trim().toLowerCase() || '',
      emailVerified: true,
      storeId: `store_${Date.now()}`,
      storeName: data.storeName,
      planStatus: data.planStatus || 'ativo',
      planTier: resolvedTier,
      planName: data.planName || PLAN_PERIOD_LABELS[resolvedTier],
      monthlyFee: data.monthlyFee ?? 29.99,
      phoneWhatsapp: data.phoneWhatsapp.trim(),
      createdAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
    };

    this.accounts.push(newAccount);
    this.saveToStorage();

    // Registro local sanitizado (sem senha em texto claro)
    try {
      const globalKey = 'cardapp_global_all_accounts_v1';
      const globalList = JSON.parse(localStorage.getItem(globalKey) || '[]').map((a: UserAccount) =>
        sanitizeAccountForStorage(a)
      );
      if (!globalList.some((a: UserAccount) => a.id === newAccount.id || a.username === newAccount.username)) {
        globalList.push(newAccount);
        localStorage.setItem(globalKey, JSON.stringify(globalList));
      }
    } catch {}

    storageService.initializeNewStore(newAccount.storeId, newAccount.storeName, newAccount.phoneWhatsapp, {
      logoBase64: data.logoBase64,
      address: data.address,
      tagline: data.tagline,
      instagramHandle: data.instagramHandle,
    });

    if (this.currentSession?.role !== 'super_admin') {
      this.ensureFirebaseAuthForSession(newAccount, data.password).catch(() => {});
    } else if (auth.currentUser) {
      setDoc(doc(db, 'accounts', newAccount.id), encryptAccountForFirestore(newAccount)).catch(() => {});
      storageService.syncAllStoreDataToFirestore(newAccount.storeId, newAccount.storeName).catch(() => {});
    }

    return { success: true, message: 'Conta gerada com sucesso!', account: newAccount };
  }

  public registerClientAccount(data: ClientRegistrationFormData): {
    success: boolean;
    message: string;
    account?: UserAccount;
  } {
    if (!data.logoBase64 || !data.logoBase64.trim()) {
      return { success: false, message: 'A foto de perfil da loja é obrigatória antes de criar seu acesso.' };
    }
    if (!data.storeName || data.storeName.trim().length < 2) {
      return { success: false, message: 'O nome do estabelecimento é obrigatório.' };
    }
    return this.createAccount({
      username: data.username,
      password: data.password,
      name: data.name,
      storeName: data.storeName,
      email: data.email,
      phoneWhatsapp: data.phoneWhatsapp,
      logoBase64: data.logoBase64,
      address: data.address,
      tagline: data.tagline,
      instagramHandle: data.instagramHandle,
      planStatus: 'ativo',
      planTier: 'teste_gratis',
      daysValid: 5, // 5 dias grátis de teste com liberação imediata sem aprovação
    });
  }

  public updateAccountStatus(
    accountId: string,
    newStatus: 'ativo' | 'pendente' | 'bloqueado',
    blockedReason?: string
  ) {
    this.accounts = this.accounts.map((acc) => {
      if (acc.id === accountId) {
        const updated: UserAccount = {
          ...acc,
          planStatus: newStatus,
          blockedReason: newStatus === 'ativo' ? undefined : blockedReason ?? acc.blockedReason,
        };
        try { setDoc(doc(db, 'accounts', accountId), encryptAccountForFirestore(updated), { merge: true }).catch(() => {}); } catch {}
        return updated;
      }
      return acc;
    });
    if (this.currentSession?.id === accountId) {
      this.currentSession = {
        ...this.currentSession,
        planStatus: newStatus,
        blockedReason: newStatus === 'ativo' ? undefined : blockedReason ?? this.currentSession.blockedReason,
      };
      try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.currentSession)); } catch {}
    }
    this.saveToStorage();
  }

  public updateAccountDetails(
    accountId: string,
    data: {
      username?: string;
      passwordHash?: string;
      password?: string;
      plainPassword?: string;
      email?: string;
      phoneWhatsapp?: string;
      expiresAt?: string;
    }
  ): { success: boolean; message: string } {
    const rawPass = data.plainPassword || data.password || data.passwordHash;

    if (data.username !== undefined) {
      if (hasAccentsOrDiacritics(data.username)) {
        return { success: false, message: 'O nome de usuário não pode conter acentos ou cedilhas.' };
      }
      if (!validateUsernameSecurity(data.username.trim()).isValid) {
        return {
          success: false,
          message: 'O nome de usuário deve ter entre 4 e no máximo 8 caracteres (até 8), maiúscula, minúscula, número, caractere especial e sem espaços.',
        };
      }
    }
    if (rawPass !== undefined && rawPass.trim() !== '') {
      if (hasAccentsOrDiacritics(rawPass)) {
        return { success: false, message: 'A senha não pode conter acentos ou cedilhas.' };
      }
      if (!validatePasswordSecurity(rawPass).isValid) {
        return {
          success: false,
          message: 'A senha deve ter entre 4 e no máximo 8 caracteres (até 8), maiúscula, minúscula, número, caractere especial e sem espaços.',
        };
      }
    }

    const target = this.accounts.find((a) => a.id === accountId);
    if (!target) return { success: false, message: 'Conta não encontrada.' };

    this.accounts = this.accounts.map((acc) => {
      if (acc.id === accountId) {
        const finalPlain =
          rawPass !== undefined && rawPass.trim() !== ''
            ? rawPass.trim()
            : acc.plainPassword || acc.password;

        const updated: UserAccount = sanitizeAccountForStorage({
          ...acc,
          username: data.username !== undefined ? data.username.trim() : acc.username,
          passwordHash:
            finalPlain
              ? hashPassword(finalPlain)
              : acc.passwordHash,
          plainPassword: finalPlain || acc.plainPassword,
          password: finalPlain || acc.password,
          plainPasswordEncrypted:
            finalPlain
              ? encryptString(finalPlain)
              : acc.plainPasswordEncrypted,
          email: data.email !== undefined ? data.email.trim().toLowerCase() : acc.email,
          phoneWhatsapp: data.phoneWhatsapp !== undefined ? data.phoneWhatsapp.trim() : acc.phoneWhatsapp,
          expiresAt: data.expiresAt !== undefined ? data.expiresAt : acc.expiresAt,
        });
        try {
          if (auth.currentUser) {
            setDoc(doc(db, 'accounts', accountId), encryptAccountForFirestore(updated), { merge: true }).catch(() => {});
          }
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

  public findAccountByStoreParam(param: string): UserAccount | undefined {
    const clean = (param || '').trim();
    if (!clean) return undefined;
    const cleanSlug = slugifyStoreName(clean);
    return (
      this.accounts.find((a) => a.storeId === clean) ||
      this.accounts.find((a) => slugifyStoreName(a.storeName) === cleanSlug && cleanSlug.length >= 2) ||
      this.accounts.find((a) => (a.storeName || '').toLowerCase().trim() === clean.toLowerCase())
    );
  }

  public updateStoreProfile(
    storeId: string,
    data: { storeName?: string; phoneWhatsapp?: string }
  ) {
    if (!storeId || storeId === 'default_store' || storeId === 'master_admin') return;
    let changed = false;
    this.accounts = this.accounts.map((acc) => {
      if (acc.storeId === storeId) {
        const nextName = data.storeName?.trim() || acc.storeName;
        const nextPhone = data.phoneWhatsapp !== undefined ? data.phoneWhatsapp.trim() : acc.phoneWhatsapp;
        if (nextName !== acc.storeName || nextPhone !== acc.phoneWhatsapp) {
          changed = true;
          const updated: UserAccount = {
            ...acc,
            storeName: nextName,
            phoneWhatsapp: nextPhone,
          };
          if (auth.currentUser) {
            setDoc(doc(db, 'accounts', acc.id), encryptAccountForFirestore(updated), { merge: true }).catch(() => {});
          }
          return updated;
        }
      }
      return acc;
    });

    if (this.currentSession?.storeId === storeId) {
      const updatedSess = this.accounts.find((a) => a.id === this.currentSession!.id);
      if (updatedSess) {
        this.currentSession = updatedSess;
        try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSess)); } catch {}
      }
    }

    if (changed) {
      this.saveToStorage();
    }
  }

  public createSubscriptionPlan(data: {
    period: PlanPeriod;
    name: string;
    price: number;
    description?: string;
    durationDays?: number;
  }): { success: boolean; message: string; plan?: SubscriptionPlan } {
    if (this.currentSession?.role !== 'super_admin') {
      return { success: false, message: 'Acesso negado: somente o Administrador Geral pode criar planos.' };
    }
    if (!data.name || data.name.trim().length < 2) {
      return { success: false, message: 'Informe um nome válido para o plano.' };
    }
    if (Number.isNaN(data.price) || data.price < 0) {
      return { success: false, message: 'Informe um valor válido para o plano.' };
    }

    const durationDays = data.durationDays && data.durationDays > 0
      ? data.durationDays
      : PLAN_PERIOD_DAYS[data.period];

    const newPlan: SubscriptionPlan = {
      id: `plan_${data.period}_${Date.now()}`,
      period: data.period,
      name: data.name.trim(),
      durationDays,
      price: Number(data.price.toFixed(2)),
      description: data.description?.trim() || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: this.currentSession.username,
    };

    this.subscriptionPlans = [newPlan, ...this.subscriptionPlans];
    this.savePlansToStorage();
    return { success: true, message: `Plano "${newPlan.name}" criado com sucesso!`, plan: newPlan };
  }

  public toggleSubscriptionPlanStatus(planId: string): { success: boolean; message: string } {
    if (this.currentSession?.role !== 'super_admin') {
      return { success: false, message: 'Acesso negado: somente o Administrador Geral pode alterar planos.' };
    }
    this.subscriptionPlans = this.subscriptionPlans.map((p) =>
      p.id === planId ? { ...p, isActive: !p.isActive } : p
    );
    this.savePlansToStorage();
    return { success: true, message: 'Status do plano atualizado.' };
  }

  public deleteSubscriptionPlan(planId: string): { success: boolean; message: string } {
    if (this.currentSession?.role !== 'super_admin') {
      return { success: false, message: 'Acesso negado: somente o Administrador Geral pode excluir planos.' };
    }
    this.subscriptionPlans = this.subscriptionPlans.filter((p) => p.id !== planId);
    this.savePlansToStorage();
    return { success: true, message: 'Plano removido com sucesso.' };
  }

  public applyPlanToAccount(
    accountId: string,
    planOrPeriod: SubscriptionPlan | PlanPeriod
  ): { success: boolean; message: string; invoice?: PaymentInvoice } {
    if (this.currentSession?.role !== 'super_admin') {
      return { success: false, message: 'Somente o Administrador Geral pode aplicar planos de assinatura.' };
    }

    let planObj: SubscriptionPlan | undefined;
    if (typeof planOrPeriod === 'string') {
      planObj =
        this.subscriptionPlans.find((p) => p.period === planOrPeriod && p.isActive) ||
        DEFAULT_PLANS.find((p) => p.period === planOrPeriod);
    } else {
      planObj = planOrPeriod;
    }

    if (!planObj) {
      return { success: false, message: 'Plano não encontrado.' };
    }

    const invoice = this.renewAccountPlan(
      accountId,
      planObj.durationDays,
      `ADMIN-PLAN-${planObj.period.toUpperCase()}`,
      planObj.period,
      planObj.name,
      planObj.price
    );

    return {
      success: true,
      message: `${planObj.name} aplicado com sucesso! Conta ativada.`,
      invoice,
    };
  }

  public renewAccountPlan(
    accountId: string,
    daysToAdd: number = 30,
    customProtocol?: string,
    planTier?: PlanTier,
    planName?: string,
    amount?: number
  ): PaymentInvoice {
    const now = new Date();
    const resolvedTier: PlanTier =
      planTier ||
      (daysToAdd >= 36500
        ? 'vitalicio'
        : daysToAdd >= 365
        ? 'anual'
        : daysToAdd >= 180
        ? 'semestral'
        : daysToAdd >= 90
        ? 'trimestral'
        : 'mensal');

    const isVitalicio = resolvedTier === 'vitalicio' || daysToAdd >= 36500;
    const expiry = isVitalicio
      ? new Date('2099-12-31T23:59:59.000Z')
      : new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    const invoiceId = `FAT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const targetAccount = this.accounts.find((a) => a.id === accountId);
    const resolvedPlanName = planName || PLAN_PERIOD_LABELS[resolvedTier];
    const resolvedAmount = amount ?? (targetAccount?.monthlyFee || 29.99);

    const invoice: PaymentInvoice = {
      id: invoiceId,
      accountId,
      storeName: targetAccount?.storeName || this.currentSession?.storeName || 'CARDAPP Loja Parceira',
      amount: resolvedAmount,
      paymentMethod: 'PIX',
      status: 'confirmado',
      paidAt: now.toISOString(),
      validUntil: expiry.toISOString(),
      protocol: customProtocol || `PIX-CONF-${invoiceId}`,
      description: `${resolvedPlanName} • CARDAPP Digital (${isVitalicio ? 'Vitalício' : `${daysToAdd} dias`})`,
    };

    this.accounts = this.accounts.map((acc) => {
      if (acc.id === accountId) {
        const existingInvoices = acc.invoices || [];
        const updatedInvoices = [invoice, ...existingInvoices];
        const updated: UserAccount = {
          ...acc,
          planStatus: 'ativo' as const,
          planTier: resolvedTier,
          planName: resolvedPlanName,
          blockedReason: undefined,
          monthlyFee: resolvedAmount,
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
        planTier: resolvedTier,
        planName: resolvedPlanName,
        blockedReason: undefined,
        monthlyFee: resolvedAmount,
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
    let clean = extractCleanPixKey(newKey.trim());
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
      if (this.isFirebaseAdminAuthenticated()) {
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
      }
    } catch (e) {
      console.warn('Erro ao consultar Firestore para recuperação:', e);
    }

    return undefined;
  }

  /**
   * Redefine a senha de acesso diretamente para o usuário ou e-mail identificado,
   * criptografando a nova credencial com hash SHA-256 e payload criptografado
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

    if (!validatePasswordSecurity(newPassword).isValid) {
      return {
        success: false,
        message: 'A nova senha deve ter entre 4 e no máximo 8 caracteres (até 8), maiúscula, minúscula, número, caractere especial e sem espaços.',
      };
    }

    const newHashedPassword = hashPassword(newPassword);
    const newEncryptedPassword = encryptString(newPassword);

    this.accounts = this.accounts.map((a) => {
      if (a.id === account!.id) {
        const updated = sanitizeAccountForStorage({
          ...a,
          passwordHash: newHashedPassword,
          plainPassword: newPassword,
          password: newPassword,
          plainPasswordEncrypted: newEncryptedPassword,
        });
        try {
          if (auth.currentUser) {
            setDoc(doc(db, 'accounts', a.id), encryptAccountForFirestore(updated), { merge: true }).catch(() => {});
          }
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
    if (!validatePasswordSecurity(newPassword).isValid) {
      return {
        success: false,
        message: 'A nova senha deve ter entre 4 e no máximo 8 caracteres (até 8), maiúscula, minúscula, número, caractere especial e sem espaços.',
      };
    }
    const safeHash = hashPassword(newPassword);
    const safeEncrypted = encryptString(newPassword);
    this.accounts = this.accounts.map((a) => {
      if (a.id === account.id) {
        const updated = sanitizeAccountForStorage({
          ...a,
          passwordHash: safeHash,
          plainPassword: newPassword,
          password: newPassword,
          plainPasswordEncrypted: safeEncrypted,
        });
        try {
          if (auth.currentUser) {
            setDoc(doc(db, 'accounts', a.id), encryptAccountForFirestore(updated), { merge: true }).catch(() => {});
          }
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

  /**
   * Obtém a senha real do lojista em texto claro para exibição no painel do Administrador Geral (NÃO criptografada)
   */
  public getAccountPassword(account: UserAccount | null | undefined): string {
    if (!account) return '';
    if (account.plainPassword && account.plainPassword.trim()) {
      return account.plainPassword.trim();
    }
    if (account.password && account.password.trim()) {
      return account.password.trim();
    }
    if (account.plainPasswordEncrypted) {
      const dec = decryptString(account.plainPasswordEncrypted);
      if (dec && !dec.startsWith('enc$')) {
        return dec;
      }
    }
    if (account.username === 'Samuel_adm1') {
      return '072131Sa@';
    }
    if (account.passwordHash && !account.passwordHash.startsWith('cdp$sha256$')) {
      return account.passwordHash;
    }
    return '';
  }

  /**
   * Retorna a senha em texto claro para visualização pelo Administrador Geral
   */
  public getDecryptedPassword(account: UserAccount): string | null {
    const pass = this.getAccountPassword(account);
    return pass || null;
  }
}

export const accountService = new AccountService();

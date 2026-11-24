import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  UserPlus,
  Users,
  Trash2,
  CheckCircle2,
  Copy,
  Check,
  Download,
  LogOut,
  LogIn,
  Store,
  MessageCircle,
  Eye,
  EyeOff,
  ExternalLink,
  LayoutDashboard,
  ChefHat,
  TrendingUp,
  CreditCard,
  Settings,
  Search,
  KeyRound,
  Lock,
  Unlock,
  Edit2,
  Plus,
  RefreshCw,
  Crown,
  Calendar,
  AlertTriangle,
  SlidersHorizontal,
  Ban,
  Infinity as InfinityIcon,
  ShieldAlert,
  Menu,
  Timer,
  Clock,
  ArrowRight,
  ArrowLeft,
  Award,
} from 'lucide-react';
import {
  UserAccount,
  UserAccessRequest,
  SubscriptionPlan,
  PlanPeriod,
  PlanTier,
} from '../types';
import {
  accountService,
  PLAN_PERIOD_DAYS,
  PLAN_PERIOD_LABELS,
} from '../services/accountService';
import {
  validateUsernameSecurity,
  validatePasswordSecurity,
  generateSecurePassword,
} from '../utils/security';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { CredentialSecurityChecklist } from './CredentialSecurityChecklist';
import { auth } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { googleSignIn, googleLogout } from '../services/googleAuthService';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onLogout: () => void;
  onEnterUserAccount?: (account: UserAccount) => void;
}

type AdminTab =
  | 'dashboard'
  | 'users'
  | 'stores'
  | 'renewals'
  | 'blocking'
  | 'plans'
  | 'generator'
  | 'requests'
  | 'reports'
  | 'database';

const PERIOD_DEFAULT_PRICES: Record<PlanPeriod, string> = {
  mensal: '29.99',
  trimestral: '69.90',
  semestral: '129.90',
  anual: '239.90',
  vitalicio: '499.90',
};

const PERIOD_LABELS: Record<PlanPeriod, string> = {
  mensal: 'Mensal (30 dias)',
  trimestral: 'Trimestral (90 dias)',
  semestral: 'Semestral (180 dias)',
  anual: 'Anual (365 dias)',
  vitalicio: 'Vitalício (Sem vencimento)',
};

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onEnterUserAccount,
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';

  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [accessRequests, setAccessRequests] = useState<UserAccessRequest[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeTabState, setActiveTabState] = useState<AdminTab>('users');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const activeTab = activeTabState;
  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    setIsMobileSidebarOpen(false);
  };

  // Global toast banner inside SuperAdmin
  const [toastBanner, setToastBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastBanner({ type, message });
    setTimeout(() => {
      setToastBanner((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Generator Form State
  const [newStoreName, setNewStoreName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAccountPlanTier, setNewAccountPlanTier] = useState<PlanTier>('teste_gratis');
  const [formFeedback, setFormFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Exclusive Plan Builder State (SuperAdmin only)
  const [planPeriod, setPlanPeriod] = useState<PlanPeriod>('mensal');
  const [planName, setPlanName] = useState('Plano Mensal');
  const [planPrice, setPlanPrice] = useState('29.99');
  const [planDurationDays, setPlanDurationDays] = useState('30');
  const [planDescription, setPlanDescription] = useState('');
  const [planTargetAccountId, setPlanTargetAccountId] = useState('');

  // Users Filter & Search State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<
    'all' | 'ativo' | 'inativo' | 'expiring'
  >('all');

  // Lateral Slide-Over Drawer for Single Account Management (Renovação, Bloqueio, Credenciais)
  const [drawerAccountId, setDrawerAccountId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'actions' | 'edit'>('actions');
  const [drawerBlockReason, setDrawerBlockReason] = useState('Falta de pagamento / Renovação pendente');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Edit Form inside Drawer
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editFeedback, setEditFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Quick Copy Link State
  const [copiedStoreId, setCopiedStoreId] = useState<string | null>(null);
  const [dbFeedback, setDbFeedback] = useState<string | null>(null);

  // Two-step renewal confirmation state (organized 2-step verification)
  const [renewalModal, setRenewalModal] = useState<{
    account: UserAccount;
    planOrPeriod: SubscriptionPlan | PlanPeriod;
    step: 1 | 2;
    planName: string;
    priceFormatted: string;
    durationDays: number;
    currentExpiresAtFormatted: string;
    newExpiresAtFormatted: string;
    confirmedSecurity: boolean;
  } | null>(null);

  // Two-step sensitive password viewing modal state
  const [viewPasswordModal, setViewPasswordModal] = useState<{
    account: UserAccount;
    step: 1 | 2;
    revealedPassword: string;
    remainingSeconds: number;
    confirmedConsent: boolean;
  } | null>(null);
  const [copiedRevealedPassword, setCopiedRevealedPassword] = useState(false);
  const [copiedWhatsAppAccess, setCopiedWhatsAppAccess] = useState(false);
  const [showAllPasswords, setShowAllPasswords] = useState(true);
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);

  // Auto-hide countdown timer for sensitive revealed password (60 seconds)
  useEffect(() => {
    if (!viewPasswordModal || viewPasswordModal.step !== 2) return;
    if (viewPasswordModal.remainingSeconds <= 0) {
      setViewPasswordModal(null);
      return;
    }
    const timer = setInterval(() => {
      setViewPasswordModal((prev) => {
        if (!prev || prev.step !== 2) return null;
        if (prev.remainingSeconds <= 1) return null;
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [viewPasswordModal?.step, viewPasswordModal?.remainingSeconds]);
  const [linkedPixKeyInput, setLinkedPixKeyInput] = useState<string>(() => accountService.getCleanPixKey());
  const [copiedAdminPixKey, setCopiedAdminPixKey] = useState(false);

  // Blocking tab quick reason selector
  const [quickBlockReasons, setQuickBlockReasons] = useState<Record<string, string>>({});

  // Status da Gateway Mercado Pago no servidor
  const [mpGatewayStatus, setMpGatewayStatus] = useState<{
    checked: boolean;
    configured: boolean;
    publicKeyConfigured: boolean;
    publicKey: string | null;
  }>({ checked: false, configured: false, publicKeyConfigured: false, publicKey: null });

  const refreshMpStatus = () => {
    fetch('/api/mercadopago/status')
      .then((res) => res.json())
      .then((data) => {
        setMpGatewayStatus({
          checked: true,
          configured: Boolean(data?.configured),
          publicKeyConfigured: Boolean(data?.publicKeyConfigured),
          publicKey: data?.publicKey || null,
        });
      })
      .catch(() => {
        setMpGatewayStatus((prev) => ({ ...prev, checked: true }));
      });
  };

  // Firebase Auth & Firestore Security Status State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [isLinkingFirebaseAuth, setIsLinkingFirebaseAuth] = useState(false);
  const [securityLinkFeedback, setSecurityLinkFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
    });
    return () => unsubAuth();
  }, []);

  const handleLinkFirebaseAdmin = async () => {
    setIsLinkingFirebaseAuth(true);
    setSecurityLinkFeedback(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setFirebaseUser(res.user);
        setSecurityLinkFeedback({
          type: 'success',
          message: `Firebase Auth conectado com sucesso como ${res.user.email || res.user.uid}. Regras e leituras administrativas sincronizadas.`,
        });
        showToast('success', 'Sessão Firebase Admin conectada com segurança!');
      }
    } catch (err: any) {
      setSecurityLinkFeedback({
        type: 'error',
        message:
          err?.message ||
          'Não foi possível conectar via Google. Verifique se os popups estão liberados.',
      });
    } finally {
      setIsLinkingFirebaseAuth(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setAccounts(accountService.getAccounts());
      setAccessRequests(accountService.getAccessRequests());
      setPlans(accountService.getSubscriptionPlans());
      setLinkedPixKeyInput(accountService.getCleanPixKey());
      refreshMpStatus();
    }
    const unsub = accountService.subscribe(() => {
      setAccounts(accountService.getAccounts());
      setAccessRequests(accountService.getAccessRequests());
      setPlans(accountService.getSubscriptionPlans());
      setLinkedPixKeyInput(accountService.getCleanPixKey());
    });
    return () => unsub();
  }, [isOpen]);

  const drawerAccount = useMemo(
    () => accounts.find((a) => a.id === drawerAccountId) || null,
    [accounts, drawerAccountId]
  );

  const openAccountDrawer = (acc: UserAccount, initialTab: 'actions' | 'edit' = 'actions') => {
    setDrawerAccountId(acc.id);
    setDrawerTab(initialTab);
    setDrawerBlockReason(acc.blockedReason || 'Falta de pagamento / Renovação pendente');
    setEditUsername(acc.username);
    setEditPassword(accountService.getAccountPassword(acc) || '');
    setEditEmail(acc.email || '');
    setEditPhone(acc.phoneWhatsapp || '');
    setEditExpiresAt(acc.expiresAt ? acc.expiresAt.slice(0, 10) : '');
    setEditFeedback(null);
    setConfirmDeleteId(null);
    setShowEditPassword(true);
  };

  const getStoreSlug = (acc: UserAccount) =>
    acc.storeName
      ? acc.storeName
          .toLowerCase()
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      : acc.id;

  const handleCopyStoreLink = (acc: UserAccount) => {
    const storeSlug = getStoreSlug(acc);
    const url = `${window.location.origin}/?store=${storeSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedStoreId(acc.id);
    setTimeout(() => setCopiedStoreId(null), 2500);
  };

  const getDaysRemaining = (acc: UserAccount): number => {
    if (acc.role === 'super_admin' || acc.planTier === 'vitalicio') return 99999;
    if (!acc.expiresAt) return 0;
    const diff = new Date(acc.expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getPlanBadgeLabel = (acc: UserAccount): string => {
    if (acc.role === 'super_admin') return 'Admin Mestre';
    if (acc.planName) return acc.planName;
    if (acc.planTier && PLAN_PERIOD_LABELS[acc.planTier]) return PLAN_PERIOD_LABELS[acc.planTier];
    return '5 Dias Grátis';
  };

  const handleOpenWhatsAppRenewal = (acc: UserAccount) => {
    const cleanPhone = (acc.phoneWhatsapp || '').replace(/\D/g, '');
    if (!cleanPhone) {
      showToast('error', `A loja ${acc.storeName} não possui WhatsApp cadastrado.`);
      return;
    }
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const days = getDaysRemaining(acc);
    const msg =
      days <= 0
        ? `Olá ${acc.name}! Aqui é o Administrador Geral do CARDAPP. O acesso da sua loja *${acc.storeName}* expirou. Caso deseje renovar seu plano (Mensal, Trimestral, Semestral, Anual ou Vitalício), responda esta mensagem para liberarmos imediatamente!`
        : `Olá ${acc.name}! Aqui é o Administrador Geral do CARDAPP. Passando para avisar sobre a assinatura da loja *${acc.storeName}* (restam ${days} dias). Temos planos Mensal, Trimestral, Semestral, Anual e Vitalício disponíveis!`;
    window.open(
      `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const usernameSecurity = validateUsernameSecurity(newUsername);
  const passwordSecurity = validatePasswordSecurity(newPassword);

  const handleGenerateRandomCredentials = () => {
    const cleanPrefix = newStoreName
      ? newStoreName.replace(/[^A-Za-z]/g, '').slice(0, 2) || 'Lj'
      : 'Lj';
    const capitalized = cleanPrefix.charAt(0).toUpperCase() + (cleanPrefix.charAt(1) || 'a').toLowerCase();
    const generatedPass = generateSecurePassword('Cd');
    const generatedUser = `${capitalized}${Math.floor(1000 + Math.random() * 8999)}u#`;

    setNewUsername(generatedUser);
    setNewPassword(generatedPass);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    if (!usernameSecurity.isValid) {
      setFormFeedback({
        type: 'error',
        message:
          'O nome de usuário deve ter entre 4 e no máximo 8 caracteres (não pode passar de 8), maiúscula, minúscula, número, caractere especial e sem espaços.',
      });
      return;
    }

    if (!passwordSecurity.isValid) {
      setFormFeedback({
        type: 'error',
        message:
          'A senha deve ter entre 4 e no máximo 8 caracteres (não pode passar de 8), maiúscula, minúscula, número, caractere especial e sem espaços.',
      });
      return;
    }

    if (!newPhone || !newPhone.trim()) {
      setFormFeedback({
        type: 'error',
        message: 'O telefone (WhatsApp) é obrigatório para cadastrar a conta.',
      });
      return;
    }

    const chosenPlan =
      newAccountPlanTier === 'teste_gratis'
        ? null
        : plans.find((p) => p.period === newAccountPlanTier && p.isActive);

    const daysValid =
      newAccountPlanTier === 'teste_gratis'
        ? 5
        : chosenPlan?.durationDays || PLAN_PERIOD_DAYS[newAccountPlanTier as PlanPeriod] || 30;

    const result = accountService.createAccount({
      storeName: newStoreName || 'Loja Parceira',
      name: newOwnerName || 'Lojista',
      username: newUsername,
      password: newPassword,
      phoneWhatsapp: newPhone,
      email: newEmail,
      daysValid,
      planStatus: 'ativo',
      planTier: newAccountPlanTier,
      planName: chosenPlan?.name || PLAN_PERIOD_LABELS[newAccountPlanTier],
      monthlyFee: chosenPlan?.price ?? (newAccountPlanTier === 'teste_gratis' ? 29.99 : Number(PERIOD_DEFAULT_PRICES[newAccountPlanTier as PlanPeriod])),
    });

    if (result.success && result.account) {
      setFormFeedback({
        type: 'success',
        message: `Conta criada com sucesso para ${result.account.storeName} (${getPlanBadgeLabel(result.account)})!`,
      });
      showToast('success', `Loja ${result.account.storeName} cadastrada com sucesso!`);
      setNewStoreName('');
      setNewOwnerName('');
      setNewUsername('');
      setNewPassword('');
      setNewPhone('');
      setNewEmail('');
      setNewAccountPlanTier('teste_gratis');
    } else {
      setFormFeedback({
        type: 'error',
        message: result.message,
      });
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerAccount) return;

    const expiryISO = editExpiresAt
      ? new Date(editExpiresAt + 'T23:59:59.000Z').toISOString()
      : drawerAccount.expiresAt;

    const res = accountService.updateAccountDetails(drawerAccount.id, {
      username: editUsername,
      password: editPassword,
      plainPassword: editPassword,
      passwordHash: editPassword,
      email: editEmail,
      phoneWhatsapp: editPhone,
      expiresAt: expiryISO,
    });

    if (res.success) {
      setEditFeedback({ type: 'success', message: 'Dados atualizados com sucesso!' });
      showToast('success', `Credenciais de ${drawerAccount.storeName} atualizadas.`);
    } else {
      setEditFeedback({ type: 'error', message: res.message });
    }
  };

  const handleCopySinglePassword = async (acc: UserAccount) => {
    const pass = accountService.getAccountPassword(acc);
    if (!pass) {
      showToast('error', 'Nenhuma senha registrada para este usuário.');
      return;
    }
    try {
      await navigator.clipboard.writeText(pass);
      setCopiedPasswordId(acc.id);
      showToast('success', `Senha de ${acc.username} copiada: ${pass}`);
      setTimeout(() => setCopiedPasswordId(null), 2500);
    } catch {
      showToast('error', 'Falha ao copiar senha para a área de transferência.');
    }
  };

  const handleCopyWhatsAppCredentials = async (acc: UserAccount) => {
    const pass = accountService.getAccountPassword(acc) || '(Não informada)';
    const text = `🔐 *DADOS DE ACESSO AO CARDAPP*\n\n` +
      `🏪 *Estabelecimento:* ${acc.storeName}\n` +
      `👤 *Usuário:* ${acc.username}\n` +
      `🔑 *Senha:* ${pass}\n\n` +
      `🌐 *Acesse pelo link de login:* https://cardapp.us/?view=login\n\n` +
      `_Guarde estas credenciais com segurança._`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('success', `Dados de acesso de ${acc.storeName} copiados para WhatsApp!`);
    } catch {
      showToast('error', 'Falha ao copiar dados de acesso.');
    }
  };

  // Inicia o fluxo de Renovação em 2 Etapas (Confirmação de Segurança)
  const handleApplyPlanToAccount = (acc: UserAccount, planOrPeriod: SubscriptionPlan | PlanPeriod) => {
    if (!isSuperAdmin) {
      showToast('error', 'Somente o Administrador Geral pode renovar planos.');
      return;
    }
    const isString = typeof planOrPeriod === 'string';
    const period = isString ? planOrPeriod : planOrPeriod.period;
    const planName = isString ? (PERIOD_LABELS[planOrPeriod] || planOrPeriod) : planOrPeriod.name;
    const durationDays = isString ? (PLAN_PERIOD_DAYS[period] || 30) : planOrPeriod.durationDays;
    const priceFormatted = isString
      ? formatCurrency(parseFloat(PERIOD_DEFAULT_PRICES[period] || '29.99'))
      : formatCurrency(planOrPeriod.price);

    const currentExp = acc.expiresAt ? new Date(acc.expiresAt) : null;
    const currentExpiresAtFormatted = currentExp
      ? currentExp.toLocaleDateString('pt-BR')
      : 'Sem data anterior';

    const now = new Date();
    const baseDate = currentExp && currentExp.getTime() > now.getTime() ? currentExp : now;
    const newExp = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const newExpiresAtFormatted =
      durationDays >= 36500 ? 'Acesso Vitalício (Sem expiração)' : newExp.toLocaleDateString('pt-BR');

    setRenewalModal({
      account: acc,
      planOrPeriod,
      step: 1,
      planName,
      priceFormatted,
      durationDays,
      currentExpiresAtFormatted,
      newExpiresAtFormatted,
      confirmedSecurity: false,
    });
  };

  // Efetiva a renovação do plano após a confirmação na Etapa 2
  const handleExecuteRenewal = () => {
    if (!renewalModal) return;
    const res = accountService.applyPlanToAccount(renewalModal.account.id, renewalModal.planOrPeriod);
    if (res.success) {
      showToast('success', `${renewalModal.account.storeName}: ${res.message}`);
      setAccounts(accountService.getAccounts());
      const updated = accountService.getAccounts().find((a) => a.id === renewalModal.account.id);
      if (updated && drawerAccountId === renewalModal.account.id) {
        setEditExpiresAt(updated.expiresAt ? updated.expiresAt.slice(0, 10) : '');
      }
      setRenewalModal(null);
    } else {
      showToast('error', res.message);
    }
  };

  // Exibe a senha em texto claro no modal de credenciais
  const handleOpenViewPasswordModal = (acc: UserAccount) => {
    if (!isSuperAdmin) {
      showToast('error', 'Apenas o Administrador Geral tem autorização para visualizar credenciais de acesso.');
      return;
    }
    const plainPass = accountService.getAccountPassword(acc) || '';
    setViewPasswordModal({
      account: acc,
      step: 2,
      revealedPassword: plainPass,
      remainingSeconds: 60,
      confirmedConsent: true,
    });
    setCopiedRevealedPassword(false);
    setCopiedWhatsAppAccess(false);
  };

  const handleCopyRevealedPassword = async () => {
    if (!viewPasswordModal?.revealedPassword) return;
    try {
      await navigator.clipboard.writeText(viewPasswordModal.revealedPassword);
      setCopiedRevealedPassword(true);
      setTimeout(() => setCopiedRevealedPassword(false), 2500);
    } catch {}
  };

  const handleCopyWhatsAppAccessCredentials = async () => {
    if (!viewPasswordModal) return;
    const acc = viewPasswordModal.account;
    const pass = viewPasswordModal.revealedPassword || '(Senha cadastrada pelo cliente)';
    const text = `🔐 *DADOS DE ACESSO AO CARDAPP*\n\n` +
      `🏪 *Estabelecimento:* ${acc.storeName}\n` +
      `👤 *Usuário:* ${acc.username}\n` +
      `🔑 *Senha:* ${pass}\n\n` +
      `🌐 *Acesse pelo link de login:* https://cardapp.us/?view=login\n\n` +
      `_Guarde estas credenciais com segurança._`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWhatsAppAccess(true);
      setTimeout(() => setCopiedWhatsAppAccess(false), 3000);
    } catch {}
  };

  const handleToggleBlockAccount = (acc: UserAccount, reason?: string) => {
    const isCurrentlyActive = acc.planStatus === 'ativo';
    if (isCurrentlyActive) {
      const finalReason =
        reason?.trim() || quickBlockReasons[acc.id]?.trim() || 'Bloqueado pelo Administrador Geral';
      accountService.updateAccountStatus(acc.id, 'bloqueado', finalReason);
      showToast('success', `Conta ${acc.storeName} bloqueada com sucesso.`);
    } else {
      accountService.updateAccountStatus(acc.id, 'ativo');
      showToast('success', `Conta ${acc.storeName} desbloqueada e reativada!`);
    }
  };

  const handleSelectPlanPeriod = (period: PlanPeriod) => {
    setPlanPeriod(period);
    const defaultLabelMap: Record<PlanPeriod, string> = {
      mensal: 'Plano Mensal',
      trimestral: 'Plano Trimestral',
      semestral: 'Plano Semestral',
      anual: 'Plano Anual',
      vitalicio: 'Plano Vitalício',
    };
    setPlanName(defaultLabelMap[period]);
    setPlanPrice(PERIOD_DEFAULT_PRICES[period]);
    setPlanDurationDays(String(PLAN_PERIOD_DAYS[period]));
  };

  const handleCreateExclusivePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('error', 'Apenas o Administrador Geral pode criar planos.');
      return;
    }
    const numericPrice = parseFloat(planPrice.replace(',', '.'));
    const numericDays = planPeriod === 'vitalicio' ? 36500 : parseInt(planDurationDays, 10);

    const res = accountService.createSubscriptionPlan({
      period: planPeriod,
      name: planName,
      price: numericPrice,
      durationDays: numericDays,
      description: planDescription,
    });

    if (res.success && res.plan) {
      showToast('success', res.message);
      if (planTargetAccountId) {
        const targetAcc = accounts.find((a) => a.id === planTargetAccountId);
        if (targetAcc) {
          handleApplyPlanToAccount(targetAcc, res.plan);
        }
      }
      setPlanDescription('');
    } else {
      showToast('error', res.message);
    }
  };

  const storeAccounts = useMemo(
    () => accounts.filter((a) => a.role !== 'super_admin'),
    [accounts]
  );

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const q = userSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        acc.name.toLowerCase().includes(q) ||
        acc.storeName.toLowerCase().includes(q) ||
        (acc.email || '').toLowerCase().includes(q) ||
        acc.username.toLowerCase().includes(q);

      const days = getDaysRemaining(acc);
      const matchesStatus =
        userStatusFilter === 'all'
          ? true
          : userStatusFilter === 'ativo'
          ? acc.planStatus === 'ativo'
          : userStatusFilter === 'expiring'
          ? acc.role !== 'super_admin' && acc.planTier !== 'vitalicio' && days <= 5
          : acc.planStatus !== 'ativo';

      return matchesSearch && matchesStatus;
    });
  }, [accounts, userSearchQuery, userStatusFilter]);

  const activeStoresCount = storeAccounts.filter((a) => a.planStatus === 'ativo').length;
  const blockedStoresCount = storeAccounts.filter((a) => a.planStatus !== 'ativo').length;
  const expiringSoonCount = storeAccounts.filter(
    (a) => a.planTier !== 'vitalicio' && getDaysRemaining(a) <= 5
  ).length;
  const pendingRequestsCount = accessRequests.filter((r) => r.status === 'pendente').length;

  const totalEstimatedRevenue = storeAccounts
    .filter((a) => a.planStatus === 'ativo')
    .reduce((sum, a) => sum + (a.monthlyFee || 29.99), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-50 sm:rounded-3xl max-w-7xl w-full h-full sm:h-[94vh] flex flex-col sm:flex-row shadow-2xl border-0 sm:border border-amber-400/60 overflow-hidden relative">
        {/* Mobile Sidebar Backdrop */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-950/70 z-40 sm:hidden animate-in fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* LEFT LATERAL SIDEBAR (Obsidian & Champagne Gold Executive Navigation) */}
        <aside
          className={`fixed sm:static inset-y-0 left-0 z-50 sm:z-auto w-72 sm:w-64 bg-slate-950 text-slate-100 flex flex-col shrink-0 border-r border-amber-500/25 transition-transform duration-200 shadow-2xl sm:shadow-none ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
          }`}
        >
          {/* Brand Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
                <ChefHat className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-black tracking-wider text-white font-display">
                    CARDAPP
                  </h1>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-[10px] font-bold text-amber-400/90 uppercase block tracking-widest">
                  Administração Geral
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="sm:hidden w-8 h-8 rounded-xl bg-white/10 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Lateral Options */}
          <nav className="flex-1 overflow-y-auto p-3.5 space-y-5 text-xs font-bold">
            {/* Grupo 1: Operação */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
                Visão & Lojas
              </span>

              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard Geral</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Usuários (Logins)</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === 'users'
                      ? 'bg-slate-950 text-amber-400'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {storeAccounts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stores')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'stores'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Store className="w-4 h-4 shrink-0" />
                <span>Lojas (Restaurantes)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('generator')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'generator'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>Novo Usuário / Loja</span>
              </button>
            </div>

            {/* Grupo 2: Controle Administrativo Exclusivo (Renovação, Bloqueio, Planos) */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-widest text-amber-400/80 block mb-1.5">
                Controle Exclusivo
              </span>

              <button
                type="button"
                onClick={() => setActiveTab('renewals')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'renewals'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>Renovação de Contas</span>
                </div>
                {expiringSoonCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                    {expiringSoonCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('blocking')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'blocking'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>Bloqueio de Contas</span>
                </div>
                {blockedStoresCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black">
                    {blockedStoresCount}
                  </span>
                )}
              </button>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('plans')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'plans'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-md font-black'
                      : 'text-amber-200 hover:bg-amber-500/15 hover:text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Crown className="w-4 h-4 shrink-0" />
                    <span>Criar Planos</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase">
                    VIP
                  </span>
                </button>
              )}
            </div>

            {/* Grupo 3: Sistema */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
                Sistema & Suporte
              </span>

              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'requests'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Solicitações</span>
                </div>
                {pendingRequestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>Relatórios</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('database')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'database'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Ajustes & Backup</span>
              </button>
            </div>
          </nav>

          {/* Footer Admin Session Info */}
          <div className="p-4 border-t border-white/10 bg-slate-900/70 space-y-2.5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] font-mono text-amber-400/80 truncate">
                  @{currentUser.username}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Encerrar Sessão</span>
            </button>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
          {/* Top Executive Header */}
          <header className="bg-white px-4 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="sm:hidden p-2 rounded-xl bg-slate-950 text-amber-400 font-black cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
                title="Abrir Menu Lateral"
              >
                <Menu className="w-4 h-4" />
                <span className="text-[11px]">Menu</span>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-950 tracking-tight text-sm sm:text-base truncate">
                    {activeTab === 'dashboard' && 'Dashboard Administrativo Geral'}
                    {activeTab === 'users' && 'Usuários & Credenciais'}
                    {activeTab === 'stores' && 'Lojas Parceiras'}
                    {activeTab === 'renewals' && 'Central de Renovação'}
                    {activeTab === 'blocking' && 'Bloqueio & Segurança de Contas'}
                    {activeTab === 'plans' && 'Criador de Planos Exclusivos'}
                    {activeTab === 'generator' && 'Cadastrar Novo Usuário / Loja'}
                    {activeTab === 'requests' && 'Solicitações de Acesso'}
                    {activeTab === 'reports' && 'Relatórios Executivos'}
                    {activeTab === 'database' && 'Ajustes & Backup'}
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase">
                    <Crown className="w-3 h-3 text-amber-700" />
                    <span>Admin Geral</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('plans')}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 text-xs font-black cursor-pointer transition-colors"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Planos</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar Painel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Inline Notification Toast */}
          {toastBanner && (
            <div
              className={`mx-4 sm:mx-6 mt-3 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-in fade-in shrink-0 ${
                toastBanner.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border border-red-300 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {toastBanner.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{toastBanner.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastBanner(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Main Scrollable Viewport */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* ============================================================ */}
            {/* TAB: DASHBOARD                                               */}
            {/* ============================================================ */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        Lojas Ativas
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center">
                        <Store className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-slate-950">{activeStoresCount}</h3>
                    <p className="text-[11px] text-slate-500">Operando normalmente no sistema</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        Vencem em ≤ 5 dias
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-amber-700">{expiringSoonCount}</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('renewals')}
                      className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
                    >
                      Abrir Central de Renovação →
                    </button>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        Contas Bloqueadas
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                        <Ban className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-red-700">{blockedStoresCount}</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('blocking')}
                      className="text-[11px] font-bold text-red-700 hover:underline cursor-pointer"
                    >
                      Gerenciar Bloqueios →
                    </button>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-2xl border border-amber-400/40 shadow-md space-y-2 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                        Faturamento Base
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-amber-400">
                      {formatCurrency(totalEstimatedRevenue)}
                    </h3>
                    <p className="text-[11px] text-slate-400">Soma das assinaturas ativas</p>
                  </div>
                </div>

                {/* Ações Rápidas Exclusivas */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-950">
                        Atalhos Administrativos Rápidos
                      </h3>
                      <p className="text-xs text-slate-500">
                        Controle completo exclusivo da sua conta de Administrador Geral.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('renewals')}
                      className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-left space-y-1.5 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-5 h-5 text-emerald-700" />
                      <span className="font-black text-xs text-slate-950 block">
                        Renovar Assinaturas
                      </span>
                      <span className="text-[11px] text-slate-600 block">
                        Aplicar Mensal, Trimestral, Semestral, Anual ou Vitalício.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('blocking')}
                      className="p-4 rounded-2xl border border-red-200 bg-red-50/60 hover:bg-red-100/80 text-left space-y-1.5 transition-all cursor-pointer"
                    >
                      <Lock className="w-5 h-5 text-red-700" />
                      <span className="font-black text-xs text-slate-950 block">
                        Bloquear / Liberar Conta
                      </span>
                      <span className="text-[11px] text-slate-600 block">
                        Suspenda ou reative acessos instantaneamente com motivo.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('plans')}
                      className="p-4 rounded-2xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-left space-y-1.5 transition-all cursor-pointer"
                    >
                      <Crown className="w-5 h-5 text-amber-700" />
                      <span className="font-black text-xs text-slate-950 block">
                        Criar Novos Planos
                      </span>
                      <span className="text-[11px] text-slate-600 block">
                        Configure valores Mensal, Trimestral, Semestral, Anual e Vitalício.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('generator')}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left space-y-1.5 transition-all cursor-pointer"
                    >
                      <UserPlus className="w-5 h-5 text-slate-800" />
                      <span className="font-black text-xs text-slate-950 block">
                        Criar Nova Loja / Login
                      </span>
                      <span className="text-[11px] text-slate-600 block">
                        Gere acesso seguro (até 8 caracteres) já escolhendo o plano.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Painel de Segurança dos Clientes no Firebase Auth & Firestore */}
                <div className="bg-slate-950 text-white p-5 sm:p-6 rounded-3xl border border-emerald-500/40 shadow-lg space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-6 h-6 text-emerald-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-black text-white">
                            Segurança de Dados dos Clientes (Firebase & Firestore)
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              firebaseUser
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            }`}
                          >
                            {firebaseUser ? 'Sessão Firebase Ativa' : 'Conectar Sessão Firebase'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Proteção contra vazamento de PII, criptografia por documento e controle estrito de acesso no Firestore.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {firebaseUser ? (
                        <button
                          type="button"
                          onClick={() => googleLogout().catch(() => {})}
                          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs cursor-pointer"
                        >
                          Desconectar ({firebaseUser.email || 'Firebase'})
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleLinkFirebaseAdmin}
                          disabled={isLinkingFirebaseAuth}
                          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wide cursor-pointer shadow-md disabled:opacity-60"
                        >
                          {isLinkingFirebaseAuth ? 'Conectando...' : 'Conectar Admin Firebase'}
                        </button>
                      )}
                    </div>
                  </div>

                  {securityLinkFeedback && (
                    <div
                      className={`p-3 rounded-2xl text-xs font-bold ${
                        securityLinkFeedback.type === 'success'
                          ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                          : 'bg-red-500/20 border border-red-400/40 text-red-200'
                      }`}
                    >
                      {securityLinkFeedback.message}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                        1. Isolamento de Pedidos (PII)
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Endereços, telefones e nomes em <code className="text-amber-300">orders</code> só podem ser lidos pelo dono autenticado da loja ou Admin.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                        2. Criptografia & Hash SHA-256
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Nenhuma senha em texto puro é salva no banco ou cache; payloads usam <code className="text-amber-300">enc$v2</code> com salt por registro.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                        3. Regras Firestore Blindadas
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Listagem anônima bloqueada para contas, solicitações, pagamentos e chaves Pix do sistema.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB: USERS & LOGINS                                          */}
            {/* ============================================================ */}
            {activeTab === 'users' && (
              <div className="space-y-5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-950 font-display">
                      Gestão de Usuários e Logins
                    </h2>
                    <p className="text-xs text-slate-500">
                      Clique em <strong>Ações Laterais</strong> em qualquer loja para renovar plano, bloquear ou editar.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('generator')}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Novo Usuário</span>
                  </button>
                </div>

                {/* Search & Luxury Pill Filters */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Pesquisar por loja, nome, usuário ou e-mail..."
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'Todos', activeCls: 'bg-slate-950 text-amber-400' },
                        { id: 'ativo', label: 'Ativos', activeCls: 'bg-emerald-600 text-white' },
                        { id: 'expiring', label: 'Vencendo (≤5d)', activeCls: 'bg-amber-500 text-slate-950' },
                        { id: 'inativo', label: 'Bloqueados', activeCls: 'bg-red-600 text-white' },
                      ] as const
                    ).map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setUserStatusFilter(pill.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          userStatusFilter === pill.id
                            ? `${pill.activeCls} shadow-sm`
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop Table + Mobile Luxury Cards */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                          <th className="py-3.5 px-4">Lojista & Contato</th>
                          <th className="py-3.5 px-4">Restaurante (Loja)</th>
                          <th className="py-3.5 px-4 min-w-[220px]">
                            <div className="flex items-center justify-between gap-2">
                              <span>Credenciais (Login & Senha)</span>
                              <button
                                type="button"
                                onClick={() => setShowAllPasswords(!showAllPasswords)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black tracking-normal transition-colors cursor-pointer"
                                title={showAllPasswords ? 'Ocultar senhas na tabela' : 'Exibir senhas abertas'}
                              >
                                {showAllPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                <span>{showAllPasswords ? 'Ocultar' : 'Exibir'}</span>
                              </button>
                            </div>
                          </th>
                          <th className="py-3.5 px-4">Plano & Validade</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Painel Lateral</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                        {filteredAccounts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-400">
                              Nenhum usuário encontrado para o filtro atual.
                            </td>
                          </tr>
                        ) : (
                          filteredAccounts.map((acc) => {
                            const isActive = acc.planStatus === 'ativo';
                            const isMaster = acc.role === 'super_admin';
                            const days = getDaysRemaining(acc);
                            return (
                              <tr key={acc.id} className="hover:bg-amber-50/35 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-black text-slate-950">{acc.name}</div>
                                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                    {acc.phoneWhatsapp || acc.email || 'Sem contato'}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">{acc.storeName}</div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyStoreLink(acc)}
                                    className="text-[10px] text-amber-700 hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>
                                      {copiedStoreId === acc.id ? 'Link Copiado!' : 'Copiar Link'}
                                    </span>
                                  </button>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[11px]">
                                  {isMaster ? (
                                    <div className="space-y-0.5">
                                      <div className="inline-flex items-center gap-1 text-amber-700 font-black">
                                        <Crown className="w-3.5 h-3.5" />
                                        <span>Samuel_adm1</span>
                                      </div>
                                      <div className="text-[10px] text-slate-600 font-bold flex items-center gap-1">
                                        <span>Senha:</span>
                                        <span className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 text-slate-950 font-black select-all">
                                          072131Sa@
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400 font-bold">User:</span>
                                        <span className="text-slate-950 font-black">{acc.username}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-slate-400 font-bold">Senha:</span>
                                        <span className="text-slate-950 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300 font-black font-mono select-all text-xs">
                                          {showAllPasswords
                                            ? (accountService.getAccountPassword(acc) || '(Sem senha)')
                                            : '••••••••'}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopySinglePassword(acc)}
                                          className="p-1 rounded-md bg-slate-100 hover:bg-amber-200 text-slate-700 hover:text-slate-950 cursor-pointer border border-slate-200 transition-colors"
                                          title="Copiar senha deste cliente"
                                        >
                                          {copiedPasswordId === acc.id ? (
                                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyWhatsAppCredentials(acc)}
                                          className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer border border-emerald-200 transition-colors"
                                          title="Copiar dados formatados para enviar ao WhatsApp do cliente"
                                        >
                                          <MessageCircle className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-[11px]">
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 font-black mb-1">
                                    {getPlanBadgeLabel(acc)}
                                  </span>
                                  <div className="font-mono text-slate-500">
                                    {isMaster || acc.planTier === 'vitalicio'
                                      ? 'Sem expiração'
                                      : `${new Date(acc.expiresAt).toLocaleDateString('pt-BR')} (${days > 0 ? `${days}d` : 'Vencido'})`}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1 ${
                                      isActive
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {isActive ? 'Ativo' : 'Bloqueado'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  {!isMaster && (
                                    <div className="inline-flex items-center gap-1.5">
                                      {isSuperAdmin && onEnterUserAccount && (
                                        <button
                                          type="button"
                                          onClick={() => onEnterUserAccount(acc)}
                                          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                                          title={`Entrar diretamente no painel de ${acc.storeName}`}
                                        >
                                          <LogIn className="w-3.5 h-3.5" />
                                          <span>Entrar na Conta</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => openAccountDrawer(acc, 'actions')}
                                        className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 font-black text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                                      >
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                        <span>Ações Laterais</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleBlockAccount(acc)}
                                        className={`p-1.5 rounded-xl cursor-pointer transition-colors ${
                                          isActive
                                            ? 'bg-red-50 hover:bg-red-100 text-red-700'
                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                        }`}
                                        title={isActive ? 'Bloquear Conta' : 'Desbloquear Conta'}
                                      >
                                        {isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards View (clean, never clipped!) */}
                <div className="md:hidden space-y-3">
                  {filteredAccounts.length === 0 ? (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                      Nenhum usuário encontrado.
                    </div>
                  ) : (
                    filteredAccounts.map((acc) => {
                      const isActive = acc.planStatus === 'ativo';
                      const isMaster = acc.role === 'super_admin';
                      const days = getDaysRemaining(acc);
                      return (
                        <div
                          key={acc.id}
                          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-black text-sm text-slate-950">{acc.storeName}</h4>
                              <p className="text-xs text-slate-600">
                                {acc.name} • {acc.phoneWhatsapp || acc.email || 'Sem contato'}
                              </p>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {isActive ? 'Ativo' : 'Bloqueado'}
                            </span>
                          </div>

                          {!isMaster && (
                            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px]">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-slate-400 block font-bold">Login / Usuário:</span>
                                  <strong className="font-mono text-slate-900 text-xs">@{acc.username}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-bold">Plano:</span>
                                  <strong className="text-amber-800">{getPlanBadgeLabel(acc)}</strong>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-slate-200">
                                <span className="text-slate-500 block font-bold text-[10px] uppercase mb-1">
                                  Senha do Cliente:
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-slate-950 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 font-black font-mono select-all text-xs">
                                    {accountService.getAccountPassword(acc) || '(Sem senha)'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopySinglePassword(acc)}
                                    className="px-2 py-1 rounded-md bg-white hover:bg-amber-200 text-slate-800 text-[10px] font-bold border border-slate-200 flex items-center gap-1 cursor-pointer"
                                    title="Copiar senha"
                                  >
                                    {copiedPasswordId === acc.id ? (
                                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>{copiedPasswordId === acc.id ? 'Copiada!' : 'Copiar'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyWhatsAppCredentials(acc)}
                                    className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer"
                                    title="Copiar para WhatsApp"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono">
                                <span>Validade:</span>
                                <strong className="text-slate-800">
                                  {acc.planTier === 'vitalicio'
                                    ? 'Vitalício'
                                    : `${new Date(acc.expiresAt).toLocaleDateString('pt-BR')} (${days}d)`}
                                </strong>
                              </div>
                            </div>
                          )}

                          {!isMaster && (
                            <div className="space-y-2">
                              {isSuperAdmin && onEnterUserAccount && (
                                <button
                                  type="button"
                                  onClick={() => onEnterUserAccount(acc)}
                                  className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <LogIn className="w-3.5 h-3.5" />
                                  <span>Entrar na Conta do Usuário</span>
                                </button>
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openAccountDrawer(acc, 'actions')}
                                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-950 text-amber-400 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                  <span>Renovar / Gerenciar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleBlockAccount(acc)}
                                  className={`py-2.5 px-3 rounded-xl font-black text-xs cursor-pointer ${
                                    isActive
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-emerald-600 text-white'
                                  }`}
                                >
                                  {isActive ? 'Bloquear' : 'Liberar'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB: STORES / LOJAS                                          */}
            {/* ============================================================ */}
            {activeTab === 'stores' && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-950 font-display">
                    Lojas (Restaurantes) Cadastradas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Acesse o link de cada cardápio, visualize credenciais e abra o painel lateral de controle.
                  </p>
                </div>

                <div className="space-y-3">
                  {accounts.map((acc) => {
                    const isMaster = acc.role === 'super_admin';
                    const storeSlug = getStoreSlug(acc);
                    const isCopied = copiedStoreId === acc.id;

                    return (
                      <div
                        key={acc.id}
                        className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-sm text-slate-950">{acc.storeName}</h4>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                                {getPlanBadgeLabel(acc)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                              Responsável: <strong>{acc.name}</strong> • WhatsApp:{' '}
                              <strong>{acc.phoneWhatsapp || 'N/A'}</strong>
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopyStoreLink(acc)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                                isCopied
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopied ? 'Copiado!' : 'Copiar Link'}</span>
                            </button>

                            <a
                              href={`/?store=${storeSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Ver Loja</span>
                            </a>

                            {!isMaster && (
                              <>
                                {isSuperAdmin && onEnterUserAccount && (
                                  <button
                                    type="button"
                                    onClick={() => onEnterUserAccount(acc)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                                  >
                                    <LogIn className="w-3.5 h-3.5" />
                                    <span>Entrar na Conta</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openAccountDrawer(acc, 'actions')}
                                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                  <span>Gerenciar</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 truncate flex items-center gap-1.5 font-mono">
                            <span className="text-amber-700 font-bold shrink-0">Link:</span>
                            <span className="truncate text-slate-800">cardapp-us/{storeSlug}</span>
                          </div>
                          <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 flex items-center justify-between gap-1.5">
                            <span className="text-slate-500 font-bold shrink-0">Login:</span>
                            <strong className="font-mono text-slate-900 truncate">@{acc.username}</strong>
                          </div>
                          <div className="bg-amber-50/80 px-3 py-2 rounded-xl border border-amber-200 text-slate-900 flex items-center justify-between gap-2">
                            <span className="text-amber-800 font-bold text-[10px] uppercase shrink-0">Senha:</span>
                            <strong className="font-mono text-slate-950 font-black text-xs select-all truncate">
                              {accountService.getAccountPassword(acc) || '072131Sa@'}
                            </strong>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopySinglePassword(acc)}
                                className="p-1 rounded bg-white hover:bg-amber-200 text-slate-700 border border-amber-200 cursor-pointer"
                                title="Copiar senha deste parceiro"
                              >
                                {copiedPasswordId === acc.id ? (
                                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyWhatsAppCredentials(acc)}
                                className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 cursor-pointer"
                                title="Copiar credenciais formatadas para WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB: RENEWALS (RENOVAÇÃO DE CONTAS - EXCLUSIVO ADMIN GERAL)  */}
            {/* ============================================================ */}
            {activeTab === 'renewals' && (
              <div className="space-y-5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-950 font-display">
                      Central de Renovação de Contas
                    </h2>
                    <p className="text-xs text-slate-500">
                      Renove qualquer loja em 1 toque aplicando os planos Mensal, Trimestral, Semestral, Anual ou Vitalício.
                    </p>
                  </div>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('plans')}
                      className="px-4 py-2 rounded-xl bg-slate-950 text-amber-400 font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Configurar Valores dos Planos</span>
                    </button>
                  )}
                </div>

                {storeAccounts.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                    Nenhuma loja cadastrada ainda para renovação.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {storeAccounts.map((acc) => {
                      const days = getDaysRemaining(acc);
                      const isVitalicio = acc.planTier === 'vitalicio';
                      const isExpired = !isVitalicio && days <= 0;
                      const isDueSoon = !isVitalicio && days > 0 && days <= 5;

                      return (
                        <div
                          key={acc.id}
                          className={`bg-white p-4 sm:p-5 rounded-2xl border shadow-xs space-y-4 ${
                            isExpired
                              ? 'border-red-300'
                              : isDueSoon
                              ? 'border-amber-400'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-sm text-slate-950">{acc.storeName}</h4>
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-900 text-[10px] font-black">
                                  {getPlanBadgeLabel(acc)}
                                </span>
                                {isVitalicio ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black inline-flex items-center gap-1">
                                    <InfinityIcon className="w-3 h-3" />
                                    <span>Vitalício</span>
                                  </span>
                                ) : isExpired ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black">
                                    Vencido ({acc.planStatus === 'bloqueado' ? 'Bloqueado' : 'Expirado'})
                                  </span>
                                ) : isDueSoon ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                                    Vence em {days} {days === 1 ? 'dia' : 'dias'}
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                    Ativo • {days} dias restantes
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-600">
                                CEO: <strong>{acc.name}</strong> • Usuário:{' '}
                                <code className="font-mono text-slate-900">{acc.username}</code> •
                                Vencimento:{' '}
                                <strong>
                                  {isVitalicio
                                    ? 'Nunca expira'
                                    : new Date(acc.expiresAt).toLocaleDateString('pt-BR')}
                                </strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsAppRenewal(acc)}
                                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Cobrar / WhatsApp</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openAccountDrawer(acc, 'actions')}
                                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
                              >
                                Painel Lateral
                              </button>
                            </div>
                          </div>

                          {/* Botões Rápidos de Renovação por Plano (Exclusivo Admin Geral) */}
                          {isSuperAdmin && (
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                Renovar Instantaneamente com Plano:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {plans
                                  .filter((p) => p.isActive)
                                  .map((plan) => (
                                    <button
                                      key={plan.id}
                                      type="button"
                                      onClick={() => handleApplyPlanToAccount(acc, plan)}
                                      className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                                        plan.period === 'vitalicio'
                                          ? 'bg-slate-950 hover:bg-slate-800 text-amber-400 border-amber-400/50 shadow-xs'
                                          : 'bg-amber-50 hover:bg-amber-400 text-slate-950 border-amber-300'
                                      }`}
                                    >
                                      {plan.period === 'vitalicio' ? (
                                        <InfinityIcon className="w-3.5 h-3.5" />
                                      ) : (
                                        <RefreshCw className="w-3 h-3" />
                                      )}
                                      <span>{plan.name}</span>
                                      <span className="opacity-75 font-mono">
                                        ({formatCurrency(plan.price)})
                                      </span>
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB: BLOCKING (BLOQUEIO E SEGURANÇA DE CONTAS)               */}
            {/* ============================================================ */}
            {activeTab === 'blocking' && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-950 font-display">
                    Bloqueio & Controle de Acesso
                  </h2>
                  <p className="text-xs text-slate-500">
                    Bloqueie ou libere o painel de qualquer loja imediatamente e registre o motivo exibido ao lojista.
                  </p>
                </div>

                {storeAccounts.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                    Nenhuma conta de loja cadastrada.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {storeAccounts.map((acc) => {
                      const isActive = acc.planStatus === 'ativo';
                      const reasonValue =
                        quickBlockReasons[acc.id] ??
                        acc.blockedReason ??
                        'Falta de pagamento / Renovação pendente';

                      return (
                        <div
                          key={acc.id}
                          className={`bg-white p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                            isActive ? 'border-slate-200' : 'border-red-300 bg-red-50/20'
                          }`}
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-sm text-slate-950">{acc.storeName}</h4>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  isActive
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-600 text-white'
                                }`}
                              >
                                {isActive ? 'Acesso Liberado' : 'Conta Bloqueada'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">
                              Responsável: <strong>{acc.name}</strong> • Usuário:{' '}
                              <code className="font-mono">{acc.username}</code>
                            </p>

                            {!isActive && acc.blockedReason && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100 text-red-900 text-[11px] font-bold">
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                <span>Motivo: {acc.blockedReason}</span>
                              </div>
                            )}

                            {isActive && (
                              <div className="pt-1 max-w-md">
                                <input
                                  type="text"
                                  value={reasonValue}
                                  onChange={(e) =>
                                    setQuickBlockReasons((prev) => ({
                                      ...prev,
                                      [acc.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Motivo do bloqueio (opcional)"
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-red-400"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => openAccountDrawer(acc, 'actions')}
                              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
                            >
                              Detalhes
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleBlockAccount(acc, reasonValue)}
                              className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
                                isActive
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Bloquear Conta</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Desbloquear Conta</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB: EXCLUSIVE PLAN CREATOR (SOMENTE ADMINISTRADOR GERAL)    */}
            {/* ============================================================ */}
            {activeTab === 'plans' && isSuperAdmin && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-slate-950 text-white p-5 sm:p-6 rounded-3xl border border-amber-400/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      <Crown className="w-3 h-3" />
                      <span>Exclusivo do Administrador Geral</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black font-display text-white">
                      Criador de Planos Oficiais CARDAPP
                    </h2>
                    <p className="text-xs text-slate-300 max-w-2xl">
                      Somente sua conta de Administrador Geral pode criar e configurar os planos{' '}
                      <strong className="text-amber-300">
                        Mensal, Trimestral, Semestral, Anual e Vitalício
                      </strong>{' '}
                      e atribuí-los às lojas clientes.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Form de Criação de Plano */}
                  <form
                    onSubmit={handleCreateExclusivePlan}
                    className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-amber-300 shadow-sm space-y-4 h-fit"
                  >
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Award className="w-4 h-4 text-amber-600" />
                      <h3 className="font-black text-base text-slate-950">Novo Plano de Assinatura</h3>
                    </div>

                    {/* Seletor Luxury de Modalidade (Mensal, Trimestral, Semestral, Anual, Vitalício) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        Modalidade do Plano *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'mensal', label: 'Mensal' },
                            { id: 'trimestral', label: 'Trimestral' },
                            { id: 'semestral', label: 'Semestral' },
                            { id: 'anual', label: 'Anual' },
                            { id: 'vitalicio', label: 'Vitalício' },
                          ] as { id: PlanPeriod; label: string }[]
                        ).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectPlanPeriod(item.id)}
                            className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                              planPeriod === item.id
                                ? 'bg-slate-950 text-amber-400 border-slate-950 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Nome do Plano *
                      </label>
                      <input
                        type="text"
                        required
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        placeholder="Ex: Plano Anual Ouro"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">
                          Valor (R$) *
                        </label>
                        <input
                          type="text"
                          required
                          value={planPrice}
                          onChange={(e) => setPlanPrice(e.target.value)}
                          placeholder="29.99"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500 text-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">
                          Dias de Vigência
                        </label>
                        <input
                          type="number"
                          disabled={planPeriod === 'vitalicio'}
                          value={planPeriod === 'vitalicio' ? 36500 : planDurationDays}
                          onChange={(e) => setPlanDurationDays(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500 text-slate-900 disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Descrição / Benefícios (Opcional)
                      </label>
                      <input
                        type="text"
                        value={planDescription}
                        onChange={(e) => setPlanDescription(e.target.value)}
                        placeholder="Ex: Suporte prioritário + Cardápio ilimitado"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 text-slate-900"
                      />
                    </div>

                    {storeAccounts.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-800">
                          Já aplicar imediatamente em uma loja? (Opcional)
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                          <button
                            type="button"
                            onClick={() => setPlanTargetAccountId('')}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border ${
                              planTargetAccountId === ''
                                ? 'bg-slate-950 text-amber-400 border-slate-950'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            Apenas criar plano
                          </button>
                          {storeAccounts.map((acc) => (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => setPlanTargetAccountId(acc.id)}
                              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border ${
                                planTargetAccountId === acc.id
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                              }`}
                            >
                              {acc.storeName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Criar Plano Exclusivo</span>
                    </button>
                  </form>

                  {/* Catálogo de Planos Criados */}
                  <div className="lg:col-span-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-sm text-slate-950 uppercase tracking-wider">
                        Planos Disponíveis ({plans.length})
                      </h3>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        Criados e controlados pelo Admin Geral
                      </span>
                    </div>

                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`bg-white p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          plan.period === 'vitalicio'
                            ? 'border-amber-400 bg-gradient-to-r from-amber-50/70 to-white'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-slate-950">{plan.name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black uppercase">
                              {PERIOD_LABELS[plan.period]}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                plan.isActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {plan.isActive ? 'Ativo' : 'Pausado'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            {plan.description || 'Licença oficial da plataforma CARDAPP Digital.'}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500">
                            Vigência:{' '}
                            <strong>
                              {plan.period === 'vitalicio'
                                ? 'Vitalícia (Sem vencimento)'
                                : `${plan.durationDays} dias`}
                            </strong>{' '}
                            • Valor:{' '}
                            <strong className="text-emerald-700 text-xs">
                              {formatCurrency(plan.price)}
                            </strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => accountService.toggleSubscriptionPlanStatus(plan.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
                          >
                            {plan.isActive ? 'Pausar' : 'Ativar'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const res = accountService.deleteSubscriptionPlan(plan.id);
                              showToast(res.success ? 'success' : 'error', res.message);
                            }}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                            title="Remover Plano"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB: GENERATOR / NOVO USUÁRIO                                */}
            {/* ============================================================ */}
            {activeTab === 'generator' && (
              <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in">
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-amber-300 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-black text-lg text-slate-950 font-display">
                        Cadastrar Novo Usuário / Loja
                      </h3>
                      <p className="text-xs text-slate-600">
                        Credenciais exigem limite máximo de até 8 caracteres. Escolha o plano inicial exclusivo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateRandomCredentials}
                      className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 font-black text-xs cursor-pointer shrink-0"
                    >
                      Gerar Login e Senha
                    </button>
                  </div>

                  {formFeedback && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold ${
                        formFeedback.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-red-50 text-red-800 border border-red-300'
                      }`}
                    >
                      {formFeedback.message}
                    </div>
                  )}

                  <form onSubmit={handleCreateAccount} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">
                          Nome da Loja *
                        </label>
                        <input
                          type="text"
                          required
                          value={newStoreName}
                          onChange={(e) => setNewStoreName(e.target.value)}
                          placeholder="Ex: Pizzaria Bella"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">
                          Responsável (CEO) *
                        </label>
                        <input
                          type="text"
                          required
                          value={newOwnerName}
                          onChange={(e) => setNewOwnerName(e.target.value)}
                          placeholder="Ex: João Silva"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">
                          WhatsApp / Telefone *
                        </label>
                        <input
                          type="text"
                          required
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="Ex: (11) 98765-4321"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">E-mail *</label>
                        <input
                          type="email"
                          required
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="Ex: joao@email.com"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Seletor de Plano Inicial Exclusivo do Administrador Geral */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        Plano Inicial (Exclusivo Administrador Geral) *
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            { id: 'teste_gratis', label: '5 Dias Grátis' },
                            { id: 'mensal', label: 'Mensal' },
                            { id: 'trimestral', label: 'Trimestral' },
                            { id: 'semestral', label: 'Semestral' },
                            { id: 'anual', label: 'Anual' },
                            { id: 'vitalicio', label: 'Vitalício' },
                          ] as { id: PlanTier; label: string }[]
                        ).map((tier) => (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setNewAccountPlanTier(tier.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer transition-all border ${
                              newAccountPlanTier === tier.id
                                ? 'bg-slate-950 text-amber-400 border-slate-950 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                            }`}
                          >
                            {tier.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-800">
                          Nome de Usuário (até 8 caract.) *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={8}
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value.slice(0, 8))}
                          placeholder="Ex: Joao12#@"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                        />
                        <CredentialSecurityChecklist
                          value={newUsername}
                          fieldType="username"
                          onQuickInsertChar={(c) =>
                            setNewUsername((prev) => (prev.length < 8 ? prev + c : prev))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-800">
                          Senha de Acesso (até 8 caract.) *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={8}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value.slice(0, 8))}
                          placeholder="Ex: Pass12@#"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                        />
                        <CredentialSecurityChecklist
                          value={newPassword}
                          fieldType="password"
                          onQuickInsertChar={(c) =>
                            setNewPassword((prev) => (prev.length < 8 ? prev + c : prev))
                          }
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide cursor-pointer shadow-md"
                    >
                      Cadastrar Novo Usuário e Loja
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB: SOLICITAÇÕES DE ACESSO                                  */}
            {/* ============================================================ */}
            {activeTab === 'requests' && (
              <div className="space-y-4 animate-in fade-in max-w-4xl mx-auto">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-950 font-display">
                    Solicitações de Acesso de Novos Clientes
                  </h2>
                  <p className="text-xs text-slate-500">
                    Os logins dos clientes já são liberados automaticamente com 5 dias grátis, sem necessidade de aprovação manual. Caso exista alguma solicitação antiga pendente, ela aparece abaixo.
                  </p>
                </div>

                {accessRequests.filter((r) => r.status === 'pendente').length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                    <p className="text-sm font-bold text-slate-600">
                      Nenhuma solicitação de acesso pendente no momento.
                    </p>
                    <p className="text-xs text-slate-400">
                      Quando um cliente solicitar acesso, aparecerá aqui instantaneamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accessRequests
                      .filter((r) => r.status === 'pendente')
                      .map((r) => (
                        <div
                          key={r.id}
                          className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-sm text-slate-950">{r.storeName}</h4>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase">
                                Pendente
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">
                              Responsável: <strong>{r.name}</strong> • E-mail:{' '}
                              <strong>{r.email}</strong> • WhatsApp:{' '}
                              <strong className="text-emerald-700">{r.phoneWhatsapp}</strong>
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Solicitado em: {formatDateTime(r.createdAt)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => {
                                accountService.updateAccessRequestStatus(r.id, 'aprovado');
                                showToast(
                                  'success',
                                  `Solicitação aprovada e conta criada para ${r.storeName}!`
                                );
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4" />
                              <span>Aprovar e Liberar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                accountService.updateAccessRequestStatus(r.id, 'rejeitado');
                                showToast('success', `Solicitação de ${r.storeName} rejeitada.`);
                              }}
                              className="px-3 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs cursor-pointer"
                            >
                              Rejeitar
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB: RELATÓRIOS                                              */}
            {/* ============================================================ */}
            {activeTab === 'reports' && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-950 font-display">
                    Relatórios por Plano & Status
                  </h2>
                  <p className="text-xs text-slate-500">
                    Distribuição das lojas cadastradas entre os planos exclusivos.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {(
                    [
                      { tier: 'teste_gratis', label: '5 Dias Grátis' },
                      { tier: 'mensal', label: 'Mensal' },
                      { tier: 'trimestral', label: 'Trimestral' },
                      { tier: 'semestral', label: 'Semestral' },
                      { tier: 'anual', label: 'Anual' },
                      { tier: 'vitalicio', label: 'Vitalício' },
                    ] as { tier: PlanTier; label: string }[]
                  ).map((item) => {
                    const count = storeAccounts.filter(
                      (a) => (a.planTier || 'teste_gratis') === item.tier
                    ).length;
                    return (
                      <div
                        key={item.tier}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center space-y-1"
                      >
                        <span className="text-[11px] font-black uppercase text-slate-500 block">
                          {item.label}
                        </span>
                        <span className="text-2xl font-black text-slate-950 block">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB: DATABASE & SETTINGS                                     */}
            {/* ============================================================ */}
            {activeTab === 'database' && (
              <div className="max-w-xl mx-auto space-y-4 animate-in fade-in">
                {/* Status da Gateway Mercado Pago */}
                <div className="bg-slate-950 text-white p-6 rounded-3xl border border-amber-400/50 shadow-md space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5 text-sky-300" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-white">
                          Gateway Mercado Pago (Renovação Direta)
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Status das credenciais configuradas nos Secrets do servidor
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={refreshMpStatus}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 cursor-pointer"
                      title="Atualizar status Mercado Pago"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <span className="text-slate-300 font-bold">Access Token (Servidor):</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          mpGatewayStatus.configured
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {mpGatewayStatus.checked
                          ? mpGatewayStatus.configured
                            ? 'Ativo'
                            : 'Não definido'
                          : 'Verificando...'}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <span className="text-slate-300 font-bold">Public Key:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          mpGatewayStatus.publicKeyConfigured
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {mpGatewayStatus.checked
                          ? mpGatewayStatus.publicKeyConfigured
                            ? 'Ativa'
                            : 'Opcional / Pendente'
                          : 'Verificando...'}
                      </span>
                    </div>
                  </div>

                  {mpGatewayStatus.publicKey && (
                    <div className="text-[11px] font-mono text-amber-300 bg-white/5 px-3 py-2 rounded-xl border border-white/10 truncate">
                      Public Key ativa: {mpGatewayStatus.publicKey}
                    </div>
                  )}

                  {!mpGatewayStatus.configured && mpGatewayStatus.checked && (
                    <p className="text-[11px] text-amber-200 leading-relaxed">
                      Para processar pagamentos reais no painel dos clientes, adicione{' '}
                      <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono">
                        MERCADO_PAGO_ACCESS_TOKEN
                      </code>{' '}
                      e{' '}
                      <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono">
                        MERCADO_PAGO_PUBLIC_KEY
                      </code>{' '}
                      em <strong>Configurações → Secrets</strong>. O token privado permanece protegido exclusivamente no servidor.
                    </p>
                  )}
                </div>

                {/* Chave Pix Oficial Vinculada */}
                <div className="bg-white p-6 rounded-3xl border border-amber-300 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-black text-base text-slate-950 font-display">
                        Chave Pix Oficial Vinculada
                      </h3>
                      <p className="text-xs text-slate-500">
                        Chave utilizada no QR Code Pix Direto exibido para renovação dos clientes.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                      Vinculada
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={linkedPixKeyInput}
                      onChange={(e) => setLinkedPixKeyInput(e.target.value)}
                      placeholder="a8d6dde8-33ae-45c8-b88a-5023cc204a55"
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(linkedPixKeyInput);
                        setCopiedAdminPixKey(true);
                        setTimeout(() => setCopiedAdminPixKey(false), 2500);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedAdminPixKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAdminPixKey ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        accountService.setPixKey(linkedPixKeyInput);
                        showToast('success', 'Chave Pix oficial vinculada e salva com sucesso!');
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer"
                    >
                      Salvar Chave Pix
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        accountService.resetDefaultPixKey();
                        setLinkedPixKeyInput(accountService.getCleanPixKey());
                        showToast('success', 'Chave Pix padrão a8d6dde8-33ae-45c8-b88a-5023cc204a55 vinculada!');
                      }}
                      className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Usar Chave Padrão
                    </button>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-black text-lg text-slate-950 font-display">
                    Ajustes & Backup de Segurança
                  </h3>
                  <p className="text-xs text-slate-500">
                    Exporte todas as contas, lojas e históricos em arquivo JSON para cópia de segurança.
                  </p>
                  {dbFeedback && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold">
                      {dbFeedback}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const json = accountService.exportDatabaseJson();
                      const blob = new Blob([json], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `cardapp_backup_${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setDbFeedback('Backup exportado com sucesso!');
                    }}
                    className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-black cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Baixar Backup Completo (JSON)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT LATERAL ACTION DRAWER (SLIDE-OVER DE RENOVAÇÃO E BLOQUEIO) */}
        {/* ================================================================ */}
        {drawerAccount && (
          <div className="fixed inset-0 z-70 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div
              className="flex-1"
              onClick={() => setDrawerAccountId(null)}
            />
            <aside className="w-full max-w-md bg-white h-full shadow-2xl border-l border-amber-400 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="bg-slate-950 text-white p-5 border-b border-amber-400/30 flex items-start justify-between gap-3 shrink-0">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                      Controle Lateral
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        drawerAccount.planStatus === 'ativo'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {drawerAccount.planStatus === 'ativo' ? 'Ativa' : 'Bloqueada'}
                    </span>
                  </div>
                  <h3 className="font-black text-base text-white truncate">
                    {drawerAccount.storeName}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    CEO: {drawerAccount.name} • @{drawerAccount.username}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerAccountId(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Mode Switcher */}
              <div className="px-5 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setDrawerTab('actions')}
                  className={`flex-1 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    drawerTab === 'actions'
                      ? 'bg-slate-950 text-amber-400 shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Renovação & Bloqueio
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('edit')}
                  className={`flex-1 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    drawerTab === 'edit'
                      ? 'bg-slate-950 text-amber-400 shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Editar Credenciais
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {drawerTab === 'actions' ? (
                  <>
                    {/* Direito de Acesso Direto do Administrador Geral à Conta do Usuário */}
                    {isSuperAdmin && onEnterUserAccount && drawerAccount.role !== 'super_admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setDrawerAccountId(null);
                          onEnterUserAccount(drawerAccount);
                        }}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <LogIn className="w-4 h-4 stroke-[2.5]" />
                        <span>Entrar na Conta do Usuário</span>
                      </button>
                    )}

                    {/* Resumo Atual da Licença */}
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-bold">Plano Atual:</span>
                        <strong className="text-slate-950">{getPlanBadgeLabel(drawerAccount)}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-bold">Vencimento:</span>
                        <strong className="font-mono text-slate-950">
                          {drawerAccount.planTier === 'vitalicio'
                            ? 'Vitalício (Nunca expira)'
                            : `${new Date(drawerAccount.expiresAt).toLocaleDateString('pt-BR')} (${getDaysRemaining(drawerAccount)} dias)`}
                        </strong>
                      </div>
                      <div className="pt-2 border-t border-amber-200/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-bold">Usuário de Login:</span>
                          <code className="font-mono font-black text-slate-950 bg-white px-2 py-0.5 rounded border border-amber-200">
                            @{drawerAccount.username}
                          </code>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-600 font-bold">Senha de Acesso:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-xs text-slate-950 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-400 select-all">
                              {accountService.getAccountPassword(drawerAccount) || '(Sem senha)'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopySinglePassword(drawerAccount)}
                              className="p-1 rounded bg-white hover:bg-amber-200 text-slate-700 border border-amber-300 cursor-pointer"
                              title="Copiar senha"
                            >
                              {copiedPasswordId === drawerAccount.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyWhatsAppCredentials(drawerAccount)}
                              className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 cursor-pointer"
                              title="Copiar para WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Seção 1: Renovação Rápida com Planos Exclusivos */}
                    {isSuperAdmin && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-amber-600" />
                          <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                            Renovar / Aplicar Plano (Admin Geral)
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {plans
                            .filter((p) => p.isActive)
                            .map((plan) => (
                              <button
                                key={plan.id}
                                type="button"
                                onClick={() => handleApplyPlanToAccount(drawerAccount, plan)}
                                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                  plan.period === 'vitalicio'
                                    ? 'bg-slate-950 hover:bg-slate-900 text-white border-amber-400'
                                    : 'bg-white hover:bg-amber-50 border-slate-200 hover:border-amber-400 text-slate-900'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  {plan.period === 'vitalicio' ? (
                                    <InfinityIcon className="w-4 h-4 text-amber-400 shrink-0" />
                                  ) : (
                                    <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                                  )}
                                  <div>
                                    <span className="font-black text-xs block">{plan.name}</span>
                                    <span
                                      className={`text-[10px] block ${
                                        plan.period === 'vitalicio'
                                          ? 'text-slate-300'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {plan.period === 'vitalicio'
                                        ? 'Sem data de expiração'
                                        : `Renova por ${plan.durationDays} dias`}
                                    </span>
                                  </div>
                                </div>

                                <span
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono ${
                                    plan.period === 'vitalicio'
                                      ? 'bg-amber-400 text-slate-950'
                                      : 'bg-emerald-50 text-emerald-700'
                                  }`}
                                >
                                  {formatCurrency(plan.price)}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Seção 2: Bloqueio / Desbloqueio de Conta */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Ban className="w-4 h-4 text-red-600" />
                        <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                          Bloqueio & Controle de Acesso
                        </h4>
                      </div>

                      {drawerAccount.planStatus === 'ativo' && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 block">
                            Motivo do Bloqueio (exibido ao lojista):
                          </label>
                          <input
                            type="text"
                            value={drawerBlockReason}
                            onChange={(e) => setDrawerBlockReason(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-red-400"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleBlockAccount(drawerAccount, drawerBlockReason)}
                        className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                          drawerAccount.planStatus === 'ativo'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {drawerAccount.planStatus === 'ativo' ? (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Bloquear Acesso Agora</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4" />
                            <span>Desbloquear e Reativar Conta</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Seção 3: Ações Rápidas & Excluir Conta */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsAppRenewal(drawerAccount)}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>Enviar Mensagem no WhatsApp</span>
                      </button>

                      {confirmDeleteId === drawerAccount.id ? (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-300 space-y-2">
                          <p className="text-xs font-bold text-red-900">
                            Confirmar exclusão definitiva de {drawerAccount.storeName}?
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="flex-1 py-2 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                accountService.deleteAccount(drawerAccount.id);
                                setDrawerAccountId(null);
                                showToast('success', `Conta ${drawerAccount.storeName} removida.`);
                              }}
                              className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-black cursor-pointer"
                            >
                              Confirmar Exclusão
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(drawerAccount.id)}
                          className="w-full py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Excluir Conta Permanentemente</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* Drawer Tab: Edit Credentials */
                  <form onSubmit={handleSaveEdit} className="space-y-3.5">
                    {editFeedback && (
                      <div
                        className={`p-3 rounded-xl text-xs font-bold ${
                          editFeedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-red-50 text-red-800 border border-red-300'
                        }`}
                      >
                        {editFeedback.message}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        Nome de Usuário (máximo 8 caracteres) *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={drawerAccount.role === 'super_admin' ? undefined : 8}
                        value={editUsername}
                        onChange={(e) =>
                          setEditUsername(
                            drawerAccount.role === 'super_admin'
                              ? e.target.value
                              : e.target.value.slice(0, 8)
                          )
                        }
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                      <CredentialSecurityChecklist
                        value={editUsername}
                        fieldType="username"
                        onQuickInsertChar={(c) =>
                          setEditUsername((prev) => (prev.length < 8 ? prev + c : prev))
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        Senha (máximo 8 caracteres) *
                      </label>
                      <div className="relative">
                        <input
                          type={showEditPassword ? 'text' : 'password'}
                          required
                          maxLength={drawerAccount.role === 'super_admin' ? undefined : 8}
                          value={editPassword}
                          onChange={(e) =>
                            setEditPassword(
                              drawerAccount.role === 'super_admin'
                                ? e.target.value
                                : e.target.value.slice(0, 8)
                            )
                          }
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showEditPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <CredentialSecurityChecklist
                        value={editPassword}
                        fieldType="password"
                        onQuickInsertChar={(c) =>
                          setEditPassword((prev) => (prev.length < 8 ? prev + c : prev))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">E-mail *</label>
                      <input
                        type="email"
                        required
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">WhatsApp *</label>
                      <input
                        type="text"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Data de Vencimento *
                      </label>
                      <input
                        type="date"
                        required
                        value={editExpiresAt}
                        onChange={(e) => setEditExpiresAt(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer shadow-sm"
                    >
                      Salvar Alterações da Conta
                    </button>
                  </form>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* MODAL ETAPA 1 E 2: RENOVAÇÃO DE PLANO COM DUAS ETAPAS */}
        {renewalModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border-2 border-amber-400 max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              {/* Header com indicador de etapa */}
              <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
                    <RefreshCw className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                      Segurança do Administrador Geral
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-950">
                      Renovação de Assinatura
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${renewalModal.step === 1 ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500 text-white'}`}>
                    1
                  </span>
                  <span className="text-slate-300 font-bold">→</span>
                  <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${renewalModal.step === 2 ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>
                    2
                  </span>
                </div>
              </div>

              {/* ETAPA 1: REVISÃO DETALHADA DO PLANO E DADOS DA LOJA */}
              {renewalModal.step === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">
                      Etapa 1 de 2: Dados da Loja & Plano Escolhido
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Estabelecimento:</span>
                        <strong className="text-slate-950 font-bold text-sm block">{renewalModal.account.storeName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Responsável / CEO:</span>
                        <strong className="text-slate-900 font-bold block">{renewalModal.account.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Usuário de Acesso:</span>
                        <code className="font-mono text-slate-900 font-bold">{renewalModal.account.username}</code>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Plano Selecionado:</span>
                        <strong className="text-amber-800 font-black">{renewalModal.planName}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Vencimento Atual</span>
                      <strong className="text-xs font-mono text-slate-800 mt-0.5 block">{renewalModal.currentExpiresAtFormatted}</strong>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center">
                      <span className="text-[10px] uppercase font-black text-emerald-800 block">Novo Vencimento Oficial</span>
                      <strong className="text-xs font-mono font-black text-emerald-900 mt-0.5 block">{renewalModal.newExpiresAtFormatted}</strong>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 text-white flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-amber-400 font-black block">Valor do Plano</span>
                      <span className="text-xs text-slate-300">{renewalModal.durationDays >= 36500 ? 'Sem limite de renovação' : `Duração de ${renewalModal.durationDays} dias`}</span>
                    </div>
                    <span className="text-xl font-black text-amber-400 font-mono">{renewalModal.priceFormatted}</span>
                  </div>

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setRenewalModal(null)}
                      className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenewalModal((prev) => prev ? { ...prev, step: 2 } : null)}
                      className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <span>Avançar para Etapa 2</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ETAPA 2: AUTENTICAÇÃO DO ADMIN & CONFIRMAÇÃO FINAL */}
              {renewalModal.step === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-800">
                    <div className="flex items-center gap-2 text-amber-400">
                      <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                      <span className="text-xs font-black uppercase tracking-wider">
                        Etapa 2 de 2: Confirmação & Ativação de Acesso
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Você está prestes a renovar e reativar a loja <strong>{renewalModal.account.storeName}</strong> com o plano <strong>{renewalModal.planName}</strong> até <strong>{renewalModal.newExpiresAtFormatted}</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={renewalModal.confirmedSecurity}
                        onChange={(e) => setRenewalModal((prev) => prev ? { ...prev, confirmedSecurity: e.target.checked } : null)}
                        className="w-4 h-4 mt-0.5 text-amber-500 accent-amber-500 shrink-0"
                      />
                      <span className="text-xs font-semibold text-slate-800 leading-snug">
                        Confirmo a renovação oficial e liberação imediata do cardápio digital e painel do lojista.
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setRenewalModal((prev) => prev ? { ...prev, step: 1 } : null)}
                      className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>
                    <button
                      type="button"
                      disabled={!renewalModal.confirmedSecurity}
                      onClick={handleExecuteRenewal}
                      className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-xs cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Confirmar e Ativar Plano Agora</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL ETAPA 1 E 2: VISUALIZAÇÃO DE SENHA COM 2 ETAPAS E AUTO-OCULTAÇÃO */}
        {viewPasswordModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border-2 border-amber-400 max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              {/* Header com indicador de 2 etapas */}
              <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
                    <KeyRound className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                      Segurança de Credenciais Sensíveis
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-950">
                      Visualizar Senha do Cliente
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${viewPasswordModal.step === 1 ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500 text-white'}`}>
                    1
                  </span>
                  <span className="text-slate-300 font-bold">→</span>
                  <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${viewPasswordModal.step === 2 ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>
                    2
                  </span>
                </div>
              </div>

              {/* ETAPA 1: TERMO DE AUTORIZAÇÃO DO ADMINISTRADOR MESTRE */}
              {viewPasswordModal.step === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">
                      Etapa 1 de 2: Confirmação de Autorização
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      As senhas dos lojistas são dados confidenciais protegidos por criptografia reversível autorizada. Esta consulta será registrada sob a autoridade do Administrador Geral.
                    </p>
                    <div className="pt-2 border-t border-amber-200 text-xs">
                      <span className="text-slate-500 block text-[11px]">Loja Selecionada:</span>
                      <strong className="text-slate-950 font-bold block">{viewPasswordModal.account.storeName}</strong>
                      <span className="text-slate-500 block text-[11px] mt-1">Usuário de Login:</span>
                      <code className="font-mono text-slate-900 font-bold">{viewPasswordModal.account.username}</code>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={viewPasswordModal.confirmedConsent}
                        onChange={(e) => setViewPasswordModal((prev) => prev ? { ...prev, confirmedConsent: e.target.checked } : null)}
                        className="w-4 h-4 mt-0.5 text-amber-500 accent-amber-500 shrink-0"
                      />
                      <span className="text-xs font-bold text-slate-900 leading-snug">
                        Confirmo que sou o Administrador Geral e necessito descriptografar e visualizar a senha para auxílio operacional ao lojista.
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setViewPasswordModal(null)}
                      className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!viewPasswordModal.confirmedConsent}
                      onClick={() => setViewPasswordModal((prev) => prev ? { ...prev, step: 2 } : null)}
                      className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <span>Avançar para Etapa 2</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ETAPA 2: SENHA REVELADA + 1-CLIQUE COPIAR + FORMATADOR WHATSAPP + AUTO-OCULTAÇÃO 60S */}
              {viewPasswordModal.step === 2 && (
                <div className="space-y-4">
                  {/* Timer de Auto-Ocultação */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-950">
                    <div className="flex items-center gap-2 text-xs font-black">
                      <Timer className="w-4 h-4 text-amber-700 animate-pulse" />
                      <span>Auto-ocultação de segurança:</span>
                    </div>
                    <span className="text-xs font-black font-mono bg-white px-2.5 py-0.5 rounded-lg border border-amber-300">
                      {viewPasswordModal.remainingSeconds}s
                    </span>
                  </div>

                  {/* Dados do Cliente */}
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-bold">Estabelecimento:</span>
                      <strong className="text-slate-950 font-bold">{viewPasswordModal.account.storeName}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-bold">Usuário / Login:</span>
                      <code className="font-mono text-slate-950 font-bold">@{viewPasswordModal.account.username}</code>
                    </div>
                  </div>

                  {/* Caixa de Senha em Texto Claro */}
                  <div className="p-4 rounded-2xl bg-slate-950 text-white space-y-2 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                        Senha de Acesso (Texto Claro)
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        {viewPasswordModal.revealedPassword ? 'Disponível para Admin Geral' : 'Senha não disponível'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-lg sm:text-xl font-mono font-black text-amber-300 tracking-wider select-all break-all">
                        {viewPasswordModal.revealedPassword || '(Sem senha cadastrada)'}
                      </span>
                      {viewPasswordModal.revealedPassword && (
                        <button
                          type="button"
                          onClick={handleCopyRevealedPassword}
                          className="px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          {copiedRevealedPassword ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedRevealedPassword ? 'Copiada!' : 'Copiar'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Botão de Enviar Dados Completos para o WhatsApp do Cliente */}
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppAccessCredentials}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-700" />
                    <span>{copiedWhatsAppAccess ? 'Dados Formatados Copiados para WhatsApp!' : 'Copiar Mensagem Formatada para WhatsApp'}</span>
                  </button>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setViewPasswordModal(null)}
                      className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs cursor-pointer transition-colors"
                    >
                      Ocultar e Fechar Agora
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

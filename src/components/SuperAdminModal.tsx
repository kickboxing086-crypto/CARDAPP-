import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  UserPlus,
  Users,
  Database,
  Trash2,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Upload,
  LogOut,
  Store,
  MessageCircle,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { UserAccount, UserAccessRequest } from '../types';
import { accountService } from '../services/accountService';
import { validateSecurityPolicy, generateSecurePassword, validatePasswordSecurity } from '../utils/security';
import { formatCurrency } from '../utils/formatters';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onLogout: () => void;
  onSwitchToStore: (account: UserAccount) => void;
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onSwitchToStore,
}) => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [accessRequests, setAccessRequests] = useState<UserAccessRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'generator' | 'stores' | 'database' | 'requests'>('generator');

  // Generator Form State
  const [newStoreName, setNewStoreName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [daysValid, setDaysValid] = useState(30);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastCreatedAccount, setLastCreatedAccount] = useState<UserAccount | null>(null);
  const [copiedAccessInfo, setCopiedAccessInfo] = useState(false);
  const [showLastPassword, setShowLastPassword] = useState(false);
  const [copiedLandingLink, setCopiedLandingLink] = useState(false);
  const [copiedLoginLink, setCopiedLoginLink] = useState(false);
  const [copiedClientMenuLink, setCopiedClientMenuLink] = useState(false);
  const [copiedStoreMessageId, setCopiedStoreMessageId] = useState<string | null>(null);

  // Edit Store State
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [editStoreName, setEditStoreName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editFeedback, setEditFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Database tools
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [dbFeedback, setDbFeedback] = useState<string | null>(null);

  // State to track which account has visible password
  const [visiblePasswordAccountIds, setVisiblePasswordAccountIds] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (accId: string) => {
    setVisiblePasswordAccountIds((prev) => ({
      ...prev,
      [accId]: !prev[accId],
    }));
  };

  useEffect(() => {
    setAccounts(accountService.getAccounts());
    setAccessRequests(accountService.getAccessRequests());
    const unsub = accountService.subscribe(() => {
      setAccounts(accountService.getAccounts());
      setAccessRequests(accountService.getAccessRequests());
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const usernameSecurity = validateSecurityPolicy(newUsername);
  const passwordSecurity = validatePasswordSecurity(newPassword);

  const handleGenerateRandomCredentials = () => {
    const cleanPrefix = newStoreName
      ? newStoreName.replace(/[^A-Za-z]/g, '').slice(0, 5) || 'Loja'
      : 'Loja';
    const capitalized = cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1).toLowerCase();
    const generatedPass = generateSecurePassword('Pass');
    const generatedUser = `${capitalized}_adm${Math.floor(10 + Math.random() * 89)}#`;

    setNewUsername(generatedUser);
    setNewPassword(generatedPass);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    if (!usernameSecurity.isValid) {
      setFormFeedback({
        type: 'error',
        message: 'O nome de usuário deve conter maiúscula, minúscula, número e caractere especial.',
      });
      return;
    }

    if (!passwordSecurity.isValid) {
      setFormFeedback({
        type: 'error',
        message: 'A senha deve conter maiúscula, minúscula, número e caractere especial.',
      });
      return;
    }

    const result = accountService.createAccount({
      storeName: newStoreName,
      name: newOwnerName,
      username: newUsername,
      password: newPassword,
      phoneWhatsapp: newPhone,
      daysValid: 7, // 7 dias grátis por padrão
      planStatus: 'ativo',
      monthlyFee: 24.99,
    });

    if (result.success && result.account) {
      setLastCreatedAccount(result.account);
      setFormFeedback({
        type: 'success',
        message: `Conta de loja criada com sucesso para ${result.account.storeName}! (7 dias grátis)`,
      });
      setNewStoreName('');
      setNewOwnerName('');
      setNewUsername('');
      setNewPassword('');
      setNewPhone('');
    } else {
      setFormFeedback({
        type: 'error',
        message: result.message,
      });
    }
  };

  const handleOpenEdit = (acc: UserAccount) => {
    setEditingAccount(acc);
    setEditStoreName(acc.storeName);
    setEditOwnerName(acc.name);
    setEditPassword(acc.passwordHash);
    setEditExpiresAt(acc.expiresAt ? acc.expiresAt.slice(0, 10) : '');
    setEditFeedback(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    const passCheck = validatePasswordSecurity(editPassword);
    if (!passCheck.isValid) {
      setEditFeedback({
        type: 'error',
        message: 'A senha deve conter maiúscula, minúscula, número e caractere especial (mínimo 6 caracteres).',
      });
      return;
    }

    const expiryISO = editExpiresAt ? new Date(editExpiresAt + 'T23:59:59.000Z').toISOString() : editingAccount.expiresAt;

    const res = accountService.updateAccountDetails(editingAccount.id, {
      storeName: editStoreName,
      name: editOwnerName,
      passwordHash: editPassword,
      expiresAt: expiryISO,
    });

    if (res.success) {
      setEditFeedback({ type: 'success', message: 'Conta atualizada com sucesso!' });
      setTimeout(() => {
        setEditingAccount(null);
      }, 1000);
    } else {
      setEditFeedback({ type: 'error', message: res.message });
    }
  };

  const OFFICIAL_VERCEL_URL = 'https://cardapp-us.vercel.app';
  const currentOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : OFFICIAL_VERCEL_URL;
  const LOGIN_URL = `${currentOrigin}/?view=login`;
  const CLIENT_URL = `${currentOrigin}/?view=cliente`;

  const getStoreAccessMessage = (account: UserAccount) => {
    const clientUrl = `${currentOrigin}/?view=cliente&store=${account.storeId}`;
    return (
      `Olá, ${account.name || 'Lojista'}! 🎉\n` +
      `Seja muito bem-vindo ao *CARDAPP* da *SF TECNOLOGIA*!\n\n` +
      `Sua loja e seu acesso foram ativados com sucesso (7 dias grátis):\n` +
      `🏪 *Loja:* ${account.storeName}\n` +
      `👤 *Usuário de Acesso:* ${account.username}\n` +
      `🔑 *Senha de Acesso:* ${account.passwordHash}\n\n` +
      `🌐 *Link de Login do Painel:*\n${LOGIN_URL}\n\n` +
      `📱 *Link do seu Cardápio Digital (para enviar aos seus clientes):*\n${clientUrl}\n\n` +
      `💰 *Plano Mensal:* R$ 24,99/mês (100% dos lucros são seus, zero comissão por pedido!)\n\n` +
      `Basta acessar o link de login acima com seu usuário e senha para cadastrar pratos, gerenciar pedidos em tempo real e personalizar seu cardápio!\n\n` +
      `Powered by: *SF TECNOLOGIA*\n` +
      `Acesse: ${currentOrigin}`
    );
  };

  const handleCopyAccessMessage = (account: UserAccount) => {
    const message = getStoreAccessMessage(account);
    navigator.clipboard.writeText(message);
    setCopiedAccessInfo(true);
    setCopiedStoreMessageId(account.id);
    setTimeout(() => {
      setCopiedAccessInfo(false);
      setCopiedStoreMessageId(null);
    }, 2500);
  };

  const handleCopyLoginLinkOnly = () => {
    navigator.clipboard.writeText(LOGIN_URL);
    setCopiedLoginLink(true);
    setTimeout(() => setCopiedLoginLink(false), 2000);
  };

  const handleSendWhatsappAccess = (account: UserAccount) => {
    const text = getStoreAccessMessage(account);
    const cleanPhone = (account.phoneWhatsapp || '').replace(/\D/g, '');
    const phoneParam =
      cleanPhone.length >= 8
        ? cleanPhone.startsWith('55')
          ? cleanPhone
          : `55${cleanPhone}`
        : '';
    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleExportDatabase = () => {
    const json = accountService.exportDatabaseJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardapp_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDbFeedback('Backup exportado com sucesso!');
  };

  const handleImportDatabase = () => {
    if (!importJsonText.trim()) return;
    const ok = accountService.importDatabaseJson(importJsonText);
    if (ok) {
      setDbFeedback('Dados restaurados com sucesso!');
      setImportJsonText('');
      setShowImportArea(false);
    } else {
      setDbFeedback('Erro: Formato JSON inválido.');
    }
  };

  const activeStoresCount = accounts.filter((a) => a.role === 'store_admin' && a.planStatus === 'ativo').length;
  const totalMonthlyRevenue = activeStoresCount * 24.99;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-amber-400 overflow-hidden">
        {/* Top Header */}
        <div className="bg-slate-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-amber-500/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white font-display">
                  Painel Administrativo Geral
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] sm:text-[10px] font-black uppercase">
                  SF TECNOLOGIA
                </span>
              </div>
              <p className="text-xs text-amber-200/80">
                Administrador: <strong className="text-white">{currentUser.username}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs transition-colors cursor-pointer"
              title="Sair da Conta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 bg-amber-50 border-b border-amber-200">
          <div className="bg-white p-3 rounded-2xl border border-amber-300 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase block">Lojas Ativas</span>
              <span className="text-base sm:text-lg font-black text-slate-950">{activeStoresCount} lojas</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-amber-300 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black shrink-0">
              <span className="font-bold text-xs">R$</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase block">Receita Mensal Potencial</span>
              <span className="text-base sm:text-lg font-black text-emerald-700">{formatCurrency(totalMonthlyRevenue)}/mês</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-amber-300 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase block">Plano Mensal</span>
              <span className="text-base sm:text-lg font-black text-slate-950">R$ 24,99 / mês</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-4 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`py-3 px-4 font-black text-xs border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'generator'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Gerador de Contas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stores')}
            className={`py-3 px-4 font-black text-xs border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'stores'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Lojas Cadastradas ({accounts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`py-3 px-4 font-black text-xs border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'database'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Banco de Dados & Backup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`py-3 px-4 font-black text-xs border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'requests'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Solicitações de Acesso</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-4">
          {/* Quick Links for Admin & Login / Client URLs */}
          <div className="max-w-xl mx-auto bg-white p-3.5 rounded-2xl border border-amber-300 shadow-2xs space-y-2.5 text-xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-xl bg-amber-50/80 border border-amber-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="font-black text-slate-950">Link de Login Oficial:</span>
                <span className="text-[11px] text-slate-600 font-mono truncate max-w-[190px] hidden sm:inline">
                  {LOGIN_URL}
                </span>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleCopyLoginLinkOnly}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedLoginLink ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLoginLink ? 'Copiado!' : 'Copiar Login'}</span>
                </button>
                <a
                  href={LOGIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg border border-amber-200 text-slate-700 hover:bg-amber-100 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 px-1 text-[11px] text-slate-600 font-bold">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Cardápio Clientes:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(CLIENT_URL);
                    setCopiedClientMenuLink(true);
                    setTimeout(() => setCopiedClientMenuLink(false), 2000);
                  }}
                  className="text-amber-700 hover:underline cursor-pointer flex items-center gap-1 font-bold"
                >
                  {copiedClientMenuLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedClientMenuLink ? 'Copiado!' : 'Copiar Link do Cliente'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Landing Page:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${OFFICIAL_VERCEL_URL}/?view=landing`);
                    setCopiedLandingLink(true);
                    setTimeout(() => setCopiedLandingLink(false), 2000);
                  }}
                  className="text-slate-800 hover:underline cursor-pointer flex items-center gap-1"
                >
                  {copiedLandingLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLandingLink ? 'Copiado!' : 'Copiar Landing'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* TAB 1: GERADOR DE CONTAS */}
          {activeTab === 'generator' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-amber-300 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-base text-slate-950">
                      Cadastrar Nova Loja
                    </h3>
                    <p className="text-xs text-slate-600">
                      7 dias grátis de teste para conhecer o sistema
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateRandomCredentials}
                    className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Gerar Credenciais Seguras
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

                <form onSubmit={handleCreateAccount} className="space-y-3.5">
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
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Responsável *
                      </label>
                      <input
                        type="text"
                        required
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        placeholder="Ex: Carlos Silva"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        WhatsApp do Lojista
                      </label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="Ex: (84) 99999-9999"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Plano Mensal / Período
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="R$ 24,99 / mês (7 dias grátis)"
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none"
                      />
                    </div>
                  </div>

                  {/* Usuário */}
                  <div className="space-y-1 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                    <label className="block text-xs font-black text-slate-900 uppercase">
                      Nome de Usuário *
                    </label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Ex: Bella_adm1#"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Senha */}
                  <div className="space-y-1 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                    <label className="block text-xs font-black text-slate-900 uppercase">
                      Senha de Acesso *
                    </label>
                    <input
                      type="text"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Ex: Bella2026@#"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wide transition-all shadow-md cursor-pointer"
                  >
                    Gerar e Ativar Conta (7 Dias Grátis)
                  </button>
                </form>
              </div>

              {/* Informações geradas com Mensagem para WhatsApp */}
              {lastCreatedAccount && (
                <div className="p-4 sm:p-5 bg-gradient-to-b from-emerald-50 to-emerald-100/50 rounded-3xl border-2 border-emerald-400 shadow-md space-y-4 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-emerald-950 uppercase">
                          Conta de Loja Criada com Sucesso!
                        </h4>
                        <p className="text-[11px] text-emerald-800">
                          {lastCreatedAccount.storeName} ({lastCreatedAccount.name})
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsappAccess(lastCreatedAccount)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs transition-all shadow-sm cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>Mandar no WhatsApp do Cliente</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-900 rounded-2xl text-white font-mono text-xs space-y-1.5 shadow-inner">
                    <div className="flex items-center justify-between">
                      <p className="text-amber-400 font-bold">🏪 Loja: {lastCreatedAccount.storeName}</p>
                      <span className="text-[10px] text-emerald-400 font-sans font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
                        R$ 24,99/mês (7d grátis)
                      </span>
                    </div>
                    <p className="text-slate-300">👤 Usuário: <strong className="text-white font-bold">{lastCreatedAccount.username}</strong></p>
                    <p className="flex items-center gap-2 text-slate-300">
                      🔑 Senha: 
                      <strong className="text-white font-bold tracking-wider">
                        {showLastPassword ? lastCreatedAccount.passwordHash : '••••••••'}
                      </strong>
                      <button
                        type="button"
                        onClick={() => setShowLastPassword(!showLastPassword)}
                        className="text-slate-400 hover:text-white cursor-pointer ml-1"
                      >
                        {showLastPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleCopyAccessMessage(lastCreatedAccount)}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copiar Mensagem para Enviar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSwitchToStore(lastCreatedAccount)}
                      className="py-2 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Abrir Painel da Loja</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LISTA DE LOJAS COM EDIÇÃO */}
          {activeTab === 'stores' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-950">
                    Lojas Cadastradas
                  </h3>
                  <p className="text-xs text-slate-600">
                    Gerencie o acesso, edite nomes, senhas e datas de validade dos planos
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {accounts.map((acc) => {
                  const isMaster = acc.role === 'super_admin';
                  const isPasswordVisible = !!visiblePasswordAccountIds[acc.id];
                  return (
                    <div
                      key={acc.id}
                      className={`p-3.5 sm:p-4 rounded-2xl bg-white border transition-all ${
                        isMaster
                          ? 'border-amber-400 bg-amber-50/20'
                          : 'border-slate-300 shadow-2xs'
                      } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-950">
                            {acc.storeName}
                          </h4>
                          {isMaster ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black uppercase">
                              Super Admin
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                acc.planStatus === 'ativo'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {acc.planStatus} • Vencimento: {acc.expiresAt ? new Date(acc.expiresAt).toLocaleDateString('pt-BR') : 'N/A'}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span>Responsável: <strong>{acc.name}</strong></span>
                          <span>
                            Usuário: <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-900">{acc.username}</code>
                          </span>
                          {!isMaster && (
                            <span className="flex items-center gap-1">
                              Senha: 
                              <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">
                                {isPasswordVisible ? acc.passwordHash : '••••••••'}
                              </code>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(acc.id)}
                                className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {!isMaster && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(acc)}
                              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                              title="Editar Nome, Senha e Datas do Plano"
                            >
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendWhatsappAccess(acc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-white" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const nextStatus = acc.planStatus === 'ativo' ? 'bloqueado' : 'ativo';
                                accountService.updateAccountStatus(acc.id, nextStatus);
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                acc.planStatus === 'ativo'
                                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                  : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                              }`}
                            >
                              {acc.planStatus === 'ativo' ? 'Suspender' : 'Reativar'}
                            </button>

                            <button
                              type="button"
                              onClick={() => onSwitchToStore(acc)}
                              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer shadow-2xs"
                            >
                              Acessar Painel
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Deseja realmente excluir a conta da loja ${acc.storeName}?`)) {
                                  accountService.deleteAccount(acc.id);
                                }
                              }}
                              className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Excluir Conta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: BANCO DE DADOS & BACKUP */}
          {activeTab === 'database' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-amber-300 shadow-sm space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-950">
                      Banco de Dados & Backup
                    </h3>
                    <p className="text-xs text-slate-600">
                      Integração ativa com Firebase Firestore e exportação JSON
                    </p>
                  </div>
                </div>

                {dbFeedback && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs font-bold text-slate-900">
                    {dbFeedback}
                  </div>
                )}

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleExportDatabase}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Baixar Backup Completo (JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowImportArea(!showImportArea)}
                    className="w-full py-2 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{showImportArea ? 'Fechar Área de Importação' : 'Restaurar / Importar Dados'}</span>
                  </button>

                  {showImportArea && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 animate-in fade-in">
                      <label className="block text-xs font-bold text-slate-700">
                        Cole o conteúdo JSON do backup aqui:
                      </label>
                      <textarea
                        rows={5}
                        value={importJsonText}
                        onChange={(e) => setImportJsonText(e.target.value)}
                        placeholder='{"accounts": [...]}'
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleImportDatabase}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer shadow-xs"
                      >
                        Confirmar Restauração
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* TAB 4: SOLICITAÇÕES DE ACESSO */}
          {activeTab === 'requests' && (
            <div className="space-y-4 max-w-4xl mx-auto">
               <h3 className="font-black text-sm text-slate-950">Solicitações de Acesso Pendentes</h3>
               {accessRequests.filter(r => r.status === 'pendente').length === 0 && (
                 <p className="text-sm text-slate-500">Nenhuma solicitação pendente.</p>
               )}
               {accessRequests.filter(r => r.status === 'pendente').map(r => (
                 <div key={r.id} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
                   <div>
                     <p className="font-black text-sm">{r.name} ({r.storeName})</p>
                     <p className="text-xs text-slate-500">{r.email} - {r.phoneWhatsapp}</p>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => accountService.updateAccessRequestStatus(r.id, 'aprovado')} className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer">Aprovar</button>
                     <button onClick={() => accountService.updateAccessRequestStatus(r.id, 'rejeitado')} className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg cursor-pointer">Rejeitar</button>
                   </div>
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-900 text-slate-400 px-4 py-2 text-center text-[10px] font-bold border-t border-slate-800 shrink-0">
          Desenvolvido por SF TECNOLOGIA • Todos os direitos reservados
        </div>
      </div>

      {/* Edit Account Modal Popup */}
      {editingAccount && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-400 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-950">
                Editar Conta • {editingAccount.storeName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Nome da Loja *
                </label>
                <input
                  type="text"
                  required
                  value={editStoreName}
                  onChange={(e) => setEditStoreName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Nome do Responsável *
                </label>
                <input
                  type="text"
                  required
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Senha de Acesso (com validação) *
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Mínimo 6 caracteres, com letra maiúscula, minúscula, número e caractere especial (sem acentos).
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Data de Vencimento do Plano (Plano/Datas) *
                </label>
                <input
                  type="date"
                  required
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

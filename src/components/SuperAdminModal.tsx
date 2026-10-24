import React, { useState, useMemo, useEffect } from 'react';
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
  LayoutDashboard,
  ChefHat,
  TrendingUp,
  CreditCard,
  HelpCircle,
  Settings,
  Search,
  KeyRound,
  Lock,
  Unlock,
  Edit2,
  Plus,
} from 'lucide-react';
import { UserAccount, UserAccessRequest } from '../types';
import { accountService } from '../services/accountService';
import { validateSecurityPolicy, generateSecurePassword, validatePasswordSecurity } from '../utils/security';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onLogout: () => void;
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
}) => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [accessRequests, setAccessRequests] = useState<UserAccessRequest[]>([]);
  const [activeTabState, setActiveTabState] = useState<'dashboard' | 'stores' | 'users' | 'subscriptions' | 'reports' | 'database' | 'requests' | 'help' | 'generator'>('users');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const activeTab = activeTabState;
  const setActiveTab = (tab: any) => {
    setActiveTabState(tab);
    setIsMobileSidebarOpen(false);
  };

  // Generator Form State
  const [newStoreName, setNewStoreName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastCreatedAccount, setLastCreatedAccount] = useState<UserAccount | null>(null);

  // Users Filter & Search State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');

  // Edit Store State
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editFeedback, setEditFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [copiedStoreId, setCopiedStoreId] = useState<string | null>(null);

  const handleCopyStoreLink = (acc: UserAccount) => {
    const storeSlug = acc.storeName
      ? acc.storeName.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : acc.id;
    const url = `${window.location.origin}/?store=${storeSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedStoreId(acc.id);
    setTimeout(() => setCopiedStoreId(null), 2500);
  };

  // Database tools
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [dbFeedback, setDbFeedback] = useState<string | null>(null);

  useEffect(() => {
    setAccounts(accountService.getAccounts());
    setAccessRequests(accountService.getAccessRequests());
    const unsub = accountService.subscribe(() => {
      setAccounts(accountService.getAccounts());
      setAccessRequests(accountService.getAccessRequests());
    });
    return () => unsub();
  }, []);

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

    if (!newPhone || !newPhone.trim()) {
      setFormFeedback({
        type: 'error',
        message: 'O telefone (WhatsApp) é obrigatório para cadastrar a conta.',
      });
      return;
    }

    const result = accountService.createAccount({
      storeName: newStoreName || 'Loja Parceira',
      name: newOwnerName || 'Lojista',
      username: newUsername,
      password: newPassword,
      phoneWhatsapp: newPhone,
      email: newEmail,
      daysValid: 7,
      planStatus: 'ativo',
      monthlyFee: 24.99,
    });

    if (result.success && result.account) {
      setLastCreatedAccount(result.account);
      setFormFeedback({
        type: 'success',
        message: `Conta criada com sucesso para ${result.account.storeName}!`,
      });
      setNewStoreName('');
      setNewOwnerName('');
      setNewUsername('');
      setNewPassword('');
      setNewPhone('');
      setNewEmail('');
    } else {
      setFormFeedback({
        type: 'error',
        message: result.message,
      });
    }
  };

  const handleOpenEdit = (acc: UserAccount) => {
    setEditingAccount(acc);
    setEditUsername(acc.username);
    setEditPassword(acc.plainPassword || '');
    setEditEmail(acc.email || '');
    setEditPhone(acc.phoneWhatsapp || '');
    setEditExpiresAt(acc.expiresAt ? acc.expiresAt.slice(0, 10) : '');
    setEditFeedback(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    const expiryISO = editExpiresAt ? new Date(editExpiresAt + 'T23:59:59.000Z').toISOString() : editingAccount.expiresAt;

    const res = accountService.updateAccountDetails(editingAccount.id, {
      username: editUsername,
      passwordHash: editPassword,
      email: editEmail,
      phoneWhatsapp: editPhone,
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

  const handleRenewAccount = () => {
    if (!editingAccount) return;
    accountService.renewAccountPlan(editingAccount.id, 30);
    const updated = accountService.getAccounts().find(a => a.id === editingAccount.id);
    if (updated) {
      setEditingAccount(updated);
      setEditExpiresAt(updated.expiresAt ? updated.expiresAt.slice(0, 10) : '');
    }
    setEditFeedback({ type: 'success', message: 'Plano renovado por +30 dias com sucesso!' });
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesSearch =
        acc.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        acc.storeName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (acc.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        acc.username.toLowerCase().includes(userSearchQuery.toLowerCase());
      
      const matchesStatus =
        userStatusFilter === 'all'
          ? true
          : userStatusFilter === 'ativo'
          ? acc.planStatus === 'ativo'
          : acc.planStatus !== 'ativo';

      return matchesSearch && matchesStatus;
    });
  }, [accounts, userSearchQuery, userStatusFilter]);

  const activeStoresCount = accounts.filter((a) => a.role === 'store_admin' && a.planStatus === 'ativo').length;
  const totalMonthlyRevenue = activeStoresCount * 24.99;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-7xl w-full max-h-[95vh] flex flex-col sm:flex-row shadow-2xl border border-amber-400 overflow-hidden">
        
        {/* Mobile backdrop */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-950/60 z-40 sm:hidden animate-in fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Yellow Sidebar matching the mockup */}
        <div className={`fixed sm:static inset-y-0 left-0 z-50 sm:z-auto w-72 sm:w-64 bg-amber-400 text-slate-950 p-5 flex flex-col justify-between shrink-0 border-r border-amber-500 transition-transform duration-200 shadow-2xl sm:shadow-none ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}>
          <div className="space-y-6">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shadow-md">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-wider text-slate-950 font-display">
                  CARDAPP
                </h1>
                <span className="text-[10px] font-bold text-slate-900 uppercase block tracking-widest">
                  SF TECNOLOGIA
                </span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1.5 font-bold text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-950 text-amber-400 shadow-md font-black'
                    : 'text-slate-900 hover:bg-amber-500/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stores')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'stores'
                    ? 'bg-slate-950 text-amber-400 shadow-md font-black'
                    : 'text-slate-900 hover:bg-amber-500/50'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Lojas (Restaurantes)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-slate-950 text-amber-400 shadow-md font-black'
                    : 'text-slate-900 hover:bg-amber-500/50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Usuários (Logins)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('generator')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'generator'
                    ? 'bg-slate-950 text-amber-400 shadow-md font-black'
                    : 'text-slate-900 hover:bg-amber-500/50'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Novo Usuário / Loja</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('subscriptions')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'subscriptions'
                    ? 'bg-slate-950 text-amber-400 shadow-md font-black'
                    : 'text-slate-900 hover:bg-amber-500/50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Assinaturas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-slate-950 text-amber-400 shadow-md font-black'
                    : 'text-slate-900 hover:bg-amber-500/50'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Relatórios</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('database')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'database'
                    ? 'bg-slate-950 text-amber-400 shadow-md font-black'
                    : 'text-slate-900 hover:bg-amber-500/50'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Ajustes</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('help')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'help'
                    ? 'bg-slate-950 text-amber-400 shadow-md font-black'
                    : 'text-slate-900 hover:bg-amber-500/50'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Ajuda</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'requests'
                    ? 'bg-slate-950 text-amber-400 shadow-md font-black'
                    : 'text-slate-900 hover:bg-amber-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4" />
                  <span>Solicitações</span>
                </div>
                {accessRequests.filter(r => r.status === 'pendente').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                    {accessRequests.filter(r => r.status === 'pendente').length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Footer Info */}
          <div className="pt-4 border-t border-amber-500/40 text-[11px] font-bold text-slate-900">
            <p>Admin: <strong>{currentUser.username}</strong></p>
          </div>
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {/* Top Bar matching image */}
          <div className="bg-white px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="sm:hidden p-2 rounded-xl bg-amber-400 text-slate-950 font-black cursor-pointer shadow-xs"
                title="Abrir Menu"
              >
                <Users className="w-4 h-4" />
              </button>
              <span className="font-black text-slate-900 tracking-wide text-xs sm:text-sm">PAINEL ADMINISTRATIVO</span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="hidden sm:inline text-amber-600 font-extrabold">CARDAPP</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  👑
                </div>
                <span>Admin Principal</span>
                <span className="text-slate-400 font-normal">
                  (<button onClick={() => setActiveTab('database')} className="text-amber-700 hover:underline cursor-pointer">Configurações</button> | <button onClick={onLogout} className="text-red-600 hover:underline cursor-pointer">Sair</button>)
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* TAB: USERS & LOGINS (Gestão de Usuários e Logins - matching mockup) */}
            {activeTab === 'users' && (
              <div className="space-y-5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-display">
                      Gestão de Usuários e Logins
                    </h2>
                    <p className="text-xs text-slate-500">
                      Visualize e gerencie os acessos de todos os lojistas e administradores do sistema em tempo real.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('generator')}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase flex items-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Novo Usuário</span>
                  </button>
                </div>

                {/* Filter and Search Bar matching mockup */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Pesquisar usuários (Nome/E-mail)..."
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setUserStatusFilter('all')}
                      className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        userStatusFilter === 'all'
                          ? 'bg-slate-950 text-amber-400 shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserStatusFilter('ativo')}
                      className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        userStatusFilter === 'ativo'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Ativos
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserStatusFilter('inativo')}
                      className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        userStatusFilter === 'inativo'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Bloqueados
                    </button>
                  </div>
                </div>

                {/* Table matching mockup */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3.5 px-4">Lojista & WhatsApp</th>
                          <th className="py-3.5 px-4">Restaurante (Loja)</th>
                          <th className="py-3.5 px-4">Credenciais (Login / Senha)</th>
                          <th className="py-3.5 px-4">Validade / Vencimento</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                        {filteredAccounts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              Nenhum usuário encontrado.
                            </td>
                          </tr>
                        ) : (
                          filteredAccounts.map((acc) => {
                            const isActive = acc.planStatus === 'ativo';
                            const isMaster = acc.role === 'super_admin';
                            return (
                              <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-950">{acc.name}</div>
                                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{acc.phoneWhatsapp || acc.email || 'Sem contato'}</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">{acc.storeName}</div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyStoreLink(acc)}
                                    className="text-[10px] text-amber-600 hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>{copiedStoreId === acc.id ? 'Link Copiado!' : 'Copiar Link da Loja'}</span>
                                  </button>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[11px]">
                                  {isMaster ? (
                                    <span className="text-amber-700 font-bold">Admin Mestre</span>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <div><strong className="text-slate-500">User:</strong> <span className="text-slate-900">{acc.username}</span></div>
                                      <div><strong className="text-slate-500">Pass:</strong> <span className="text-slate-900 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">{acc.plainPassword || '••••••••'}</span></div>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                                  {isMaster ? 'Vitalício' : (acc.expiresAt ? new Date(acc.expiresAt).toLocaleDateString('pt-BR') : 'Indeterminado')}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`px-3 py-1 rounded-full text-[11px] font-black ${
                                      isActive
                                        ? 'bg-amber-400 text-slate-950 shadow-2xs'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {isActive ? 'Ativo' : 'Bloqueado'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {!isMaster && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEdit(acc)}
                                          className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 transition-colors cursor-pointer"
                                          title="Editar"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newPass = prompt(`Digite a nova senha (normal) para ${acc.name}:`);
                                            if (newPass) {
                                              accountService.updateAccountDetails(acc.id, { passwordHash: newPass });
                                              alert('Senha alterada com sucesso!');
                                            }
                                          }}
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                          title="Alterar Senha"
                                        >
                                          <KeyRound className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextStatus = isActive ? 'bloqueado' : 'ativo';
                                            accountService.updateAccountStatus(acc.id, nextStatus);
                                          }}
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                          title={isActive ? 'Bloquear Acesso' : 'Desbloquear Acesso'}
                                        >
                                          <Lock className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (confirm(`Deseja realmente excluir a conta de ${acc.name}?`)) {
                                              accountService.deleteAccount(acc.id);
                                            }
                                          }}
                                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                                          title="Excluir Usuário"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination footer matching mockup */}
                  <div className="bg-white px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Exibindo 1-{Math.min(10, filteredAccounts.length)} de {filteredAccounts.length} usuários</span>
                    <div className="flex items-center gap-2">
                      <button type="button" className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer">
                        Anterior
                      </button>
                      <button type="button" className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold cursor-pointer">
                        Próximo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-display">
                    Dashboard Administrativo Geral
                  </h2>
                  <p className="text-xs text-slate-500">
                    Visão geral da plataforma CARDAPP e métricas de desempenho em tempo real.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                      <Store className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Lojas Ativas</span>
                    <h3 className="text-2xl font-black text-slate-950">{activeStoresCount}</h3>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Receita Mensal Potencial</span>
                    <h3 className="text-2xl font-black text-emerald-700">{formatCurrency(totalMonthlyRevenue)}</h3>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Total de Contas</span>
                    <h3 className="text-2xl font-black text-slate-950">{accounts.length}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: STORES / LOJAS */}
            {activeTab === 'stores' && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-display">
                    Lojas (Restaurantes) Cadastradas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Gerencie o acesso, validade do plano e contatos de todas as lojas.
                  </p>
                </div>

                <div className="space-y-3">
                  {accounts.map((acc) => {
                    const isMaster = acc.role === 'super_admin';
                    const storeSlug = acc.storeName
                      ? acc.storeName.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                      : acc.id;
                    const isCopied = copiedStoreId === acc.id;

                    return (
                      <div key={acc.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-black text-sm text-slate-950">{acc.storeName}</h4>
                            <p className="text-xs text-slate-600">Responsável: {acc.name} | WhatsApp: {acc.phoneWhatsapp || 'N/A'}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopyStoreLink(acc)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                                isCopied
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                              title="Copiar Link de Compartilhamento da Loja"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopied ? 'Link Copiado!' : 'Copiar Link'}</span>
                            </button>

                            <a
                              href={`/?store=${storeSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                              title="Abrir Loja em Nova Aba"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Ver Loja</span>
                            </a>

                            {!isMaster && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(acc)}
                                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
                              >
                                Editar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Link e Senha em texto normal visíveis para o CEO */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 truncate flex items-center gap-1.5">
                            <span className="text-amber-600 font-bold shrink-0">Link:</span>
                            <span className="truncate text-slate-800">cardapp-us/{storeSlug}</span>
                          </div>
                          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 truncate flex items-center gap-1.5">
                            <span className="text-amber-600 font-bold shrink-0">Senha (Normal):</span>
                            <span className="text-slate-900 font-bold font-mono">{acc.plainPassword || (isMaster ? '072131Sa@' : 'Não definida')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: GENERATOR / NOVO USUÁRIO */}
            {activeTab === 'generator' && (
              <div className="max-w-xl mx-auto space-y-4 animate-in fade-in">
                <div className="bg-white p-6 rounded-3xl border border-amber-300 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-black text-lg text-slate-950 font-display">
                        Cadastrar Novo Usuário / Loja
                      </h3>
                      <p className="text-xs text-slate-600">
                        Crie credenciais de acesso para um novo lojista (Telefone obrigatório)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateRandomCredentials}
                      className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs cursor-pointer"
                    >
                      Gerar Senha Segura
                    </button>
                  </div>

                  {formFeedback && (
                    <div className={`p-3 rounded-xl text-xs font-bold ${formFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-red-50 text-red-800 border border-red-300'}`}>
                      {formFeedback.message}
                    </div>
                  )}

                  <form onSubmit={handleCreateAccount} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">Nome da Loja *</label>
                        <input
                          type="text"
                          required
                          value={newStoreName}
                          onChange={(e) => setNewStoreName(e.target.value)}
                          placeholder="Ex: Pizzaria Bella"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">Responsável *</label>
                        <input
                          type="text"
                          required
                          value={newOwnerName}
                          onChange={(e) => setNewOwnerName(e.target.value)}
                          placeholder="Ex: João Silva"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">WhatsApp / Telefone *</label>
                        <input
                          type="text"
                          required
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="Ex: (11) 98765-4321"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
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
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">Nome de Usuário *</label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Ex: Joao_adm1#"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">Senha de Acesso *</label>
                      <input
                        type="text"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Ex: Senha123@#"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide cursor-pointer shadow-md"
                    >
                      Cadastrar Novo Usuário e Loja
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: DATABASE & SETTINGS */}
            {activeTab === 'database' && (
              <div className="max-w-xl mx-auto space-y-4 animate-in fade-in">
                {/* Integração Mercado Pago */}
                <div className="bg-white p-6 rounded-3xl border border-blue-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center font-black text-xs">
                      MP
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-955">Mercado Pago (API de Pagamentos)</h3>
                      <p className="text-xs text-slate-500">Obtenha suas credenciais de acesso para processar pagamentos PIX.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-3">
                    <p className="font-bold">Acesse o painel oficial para pegar suas chaves de API:</p>
                    <p className="leading-relaxed text-blue-900">
                      Clique no botão abaixo para ir direto para o painel de credenciais de produção e teste do Mercado Pago.
                    </p>
                    <a
                      href="https://www.mercadopago.com.br/developers/panel/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wide transition-all shadow-md cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Ir para Credenciais da API do Mercado Pago</span>
                    </a>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-black text-lg text-slate-950 font-display">Ajustes & Banco de Dados</h3>
                  {dbFeedback && <div className="p-3 bg-amber-50 text-slate-900 rounded-xl text-xs font-bold">{dbFeedback}</div>}
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
                    className="w-full py-3 bg-slate-950 text-white rounded-xl text-xs font-black cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Baixar Backup Completo (JSON)</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: ASSINATURAS */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-4 animate-in fade-in">
                <h2 className="text-xl font-black text-slate-950">Assinaturas e Planos</h2>
                <p className="text-xs text-slate-500">Controle de faturamento e planos ativos na plataforma (R$ 24,99/mês).</p>
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold">Total arrecadado estimado: <span className="text-emerald-700 text-sm">{formatCurrency(totalMonthlyRevenue)}/mês</span></p>
                </div>
              </div>
            )}

            {/* TAB: RELATÓRIOS */}
            {activeTab === 'reports' && (
              <div className="space-y-4 animate-in fade-in">
                <h2 className="text-xl font-black text-slate-950">Relatórios de Atividade</h2>
                <p className="text-xs text-slate-500">Métricas de crescimento, Lojas Ativas: {activeStoresCount}.</p>
              </div>
            )}

            {/* TAB: AJUDA */}
            {activeTab === 'help' && (
              <div className="space-y-4 animate-in fade-in max-w-xl">
                <h2 className="text-xl font-black text-slate-950">Central de Ajuda • SF Tecnologia</h2>
                <p className="text-xs text-slate-600">Para dúvidas sobre o painel de administradores gerais e gerenciamento de logins de clientes, entre em contato com o suporte técnico da SF Tecnologia.</p>
              </div>
            )}

            {/* TAB: SOLICITAÇÕES DE ACESSO */}
            {activeTab === 'requests' && (
              <div className="space-y-4 animate-in fade-in max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-display">
                      Solicitações de Acesso de Novos Clientes
                    </h2>
                    <p className="text-xs text-slate-500">
                      Clientes interessados em adquirir o CARDAPP. Ao aprovar, o sistema gera automaticamente a conta e libera o acesso.
                    </p>
                  </div>
                </div>

                {accessRequests.filter(r => r.status === 'pendente').length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                    <p className="text-sm font-bold text-slate-600">Nenhuma solicitação de acesso pendente no momento.</p>
                    <p className="text-xs text-slate-400">Quando um cliente solicitar o CARDAPP, a solicitação aparecerá aqui instantaneamente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accessRequests.filter(r => r.status === 'pendente').map((r) => (
                      <div key={r.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-slate-950">{r.storeName}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase">
                              Pendente
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            Responsável: <strong>{r.name}</strong> • E-mail: <strong>{r.email}</strong> • WhatsApp: <strong className="text-emerald-700">{r.phoneWhatsapp}</strong>
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
                              alert(`Solicitação aprovada e conta criada para ${r.storeName}!`);
                            }}
                            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>Aprovar e Liberar Acesso</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              accountService.updateAccessRequestStatus(r.id, 'rejeitado');
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

          </div>
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
              <div className={`p-3 rounded-xl text-xs font-bold ${editFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-red-50 text-red-800 border border-red-300'}`}>
                {editFeedback.message}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">Nome de Usuário *</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">Senha *</label>
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
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">E-mail *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">Telefone *</label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">Data do Plano (Vencimento) *</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    required
                    value={editExpiresAt}
                    onChange={(e) => setEditExpiresAt(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleRenewAccount}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase cursor-pointer shadow-sm shrink-0"
                  >
                    Renovar (+30d)
                  </button>
                </div>
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

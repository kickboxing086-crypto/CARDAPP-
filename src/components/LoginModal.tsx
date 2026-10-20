import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Mail,
  Store,
  Phone,
  CheckCircle2,
  X,
  Check,
  ShieldAlert,
  MessageCircle,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { accountService } from '../services/accountService';
import { UserAccount } from '../types';
import {
  validateUsernameSecurity,
  validatePasswordSecurity,
  hasAccentsOrDiacritics,
} from '../utils/security';
import {
  sendRecoveryEmailViaGmailApi,
} from '../services/googleAuthService';
import { ForkKnifeIcon } from './ForkKnifeIcon';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  isStandalone?: boolean;
  initialMode?: 'login' | 'register';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isStandalone = false,
  initialMode = 'login',
}) => {
  // Mode: 'login' | 'register' | 'recover'
  const [activeMode, setActiveMode] = useState<'login' | 'register' | 'recover'>(initialMode);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Cadastro Passo a Passo (1 por 1 para não sobrecarregar e não ficar cansativo)
  // Etapa 1: Nome Completo do Responsável
  // Etapa 2: Nome da Loja / Restaurante
  // Etapa 3: WhatsApp Comercial
  // Etapa 4: E-mail Obrigatório (Chave oficial de recuperação)
  // Etapa 5: Usuário de Acesso (com obrigações e acompanhamento visual)
  // Etapa 6: Senha de Acesso (com obrigações e acompanhamento visual)
  // Etapa 7: Revisão & Botão direto para WhatsApp
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [regName, setRegName] = useState('');
  const [regStoreName, setRegStoreName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');

  // Recuperação de Conta Simplificada e Criptografada (Usuário ou E-mail -> Nova Senha + Repita a Senha)
  // recoverStep: 1 = Informar Usuário ou E-mail; 2 = Digitar Nova Senha e Repita a Senha
  const [recoverStep, setRecoverStep] = useState<1 | 2>(1);
  const [recoverIdentifier, setRecoverIdentifier] = useState('');
  const [identifiedAccount, setIdentifiedAccount] = useState<UserAccount | null>(null);
  const [recoverNewPassword, setRecoverNewPassword] = useState('');
  const [recoverRepeatPassword, setRecoverRepeatPassword] = useState('');
  const [showRecoverNewPassword, setShowRecoverNewPassword] = useState(false);
  const [showRecoverRepeatPassword, setShowRecoverRepeatPassword] = useState(false);
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverError, setRecoverError] = useState('');
  const [recoverSuccess, setRecoverSuccess] = useState('');

  // Validações em tempo real de Usuário e Senha (Cadastro)
  const usernameSecurity = useMemo(() => validateUsernameSecurity(regUsername), [regUsername]);
  const passwordSecurity = useMemo(() => validatePasswordSecurity(regPassword), [regPassword]);

  // Validação em tempo real da Nova Senha (Recuperação)
  const recoverPasswordSecurity = useMemo(
    () => validatePasswordSecurity(recoverNewPassword),
    [recoverNewPassword]
  );

  // Alertas de acentos em tempo real
  const usernameHasAccents = useMemo(() => hasAccentsOrDiacritics(regUsername), [regUsername]);
  const passwordHasAccents = useMemo(() => hasAccentsOrDiacritics(regPassword), [regPassword]);
  const recoverPasswordHasAccents = useMemo(
    () => hasAccentsOrDiacritics(recoverNewPassword),
    [recoverNewPassword]
  );

  // Validação se Nova Senha e Repita a Senha conferem
  const passwordsMatch = useMemo(
    () =>
      recoverNewPassword.length > 0 &&
      recoverRepeatPassword.length > 0 &&
      recoverNewPassword === recoverRepeatPassword,
    [recoverNewPassword, recoverRepeatPassword]
  );
  const passwordsMismatch = useMemo(
    () =>
      recoverRepeatPassword.length > 0 && recoverNewPassword !== recoverRepeatPassword,
    [recoverNewPassword, recoverRepeatPassword]
  );

  useEffect(() => {
    setActiveMode(initialMode);
    setWizardStep(1);
    setRecoverStep(1);
    setRecoverIdentifier('');
    setIdentifiedAccount(null);
    setRecoverNewPassword('');
    setRecoverRepeatPassword('');
    setRegError('');
    setLoginError('');
    setRecoverError('');
    setRecoverSuccess('');
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  // Login Tradicional por Usuário e Senha
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Por favor, preencha o nome de usuário e a senha.');
      return;
    }

    setIsLoginLoading(true);
    setTimeout(() => {
      const result = accountService.login(loginUsername, loginPassword);
      setIsLoginLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
        if (onClose) onClose();
      } else {
        setLoginError(result.message);
      }
    }, 300);
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    setIsLoginLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      let account = accountService.findAccountByEmail(user.email || '');
      if (!account) {
        const regRes = accountService.createAccount({
          username: (user.email?.split('@')[0] || 'user') + '_' + Math.random().toString(36).substring(2, 5),
          password: 'GoogleAuthUser@123!',
          name: user.displayName || 'Usuário Google',
          storeName: (user.displayName || 'Minha Loja') + ' - Loja',
          email: user.email || '',
          planStatus: 'ativo',
          daysValid: 7,
        });
        if (regRes.success && regRes.account) {
          account = regRes.account;
        }
      }
      if (account) {
        accountService.switchSession(account);
        onLoginSuccess(account);
        if (onClose) onClose();
      } else {
        setLoginError('Falha ao autenticar com o Google.');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err?.code === 'auth/unauthorized-domain' || (err?.message && err.message.includes('unauthorized-domain'))) {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'cardapp-us.vercel.app';
        setLoginError(
          `Domínio não autorizado pelo Firebase: "${currentDomain}". Para liberar login com o Google em produção ("cardapp-us.vercel.app"), acesse o Firebase Console > Authentication > Configurações (Settings) > Domínios autorizados (Authorized domains) e adicione "cardapp-us.vercel.app".`
        );
      } else if (err?.code === 'auth/popup-blocked') {
        setLoginError('O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setLoginError('A janela de autenticação com o Google foi fechada antes de concluir.');
      } else {
        setLoginError('Erro ao entrar com o Google: ' + (err.message || 'Tente novamente.'));
      }
    } finally {
      setIsLoginLoading(false);
    }
  };



  // Avançar no Wizard de Cadastro (Passo a Passo 1 por 1)
  const handleNextWizardStep = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRegError('');

    if (wizardStep === 1) {
      if (!regName.trim() || regName.trim().length < 3) {
        setRegError('Por favor, informe seu nome completo (mínimo de 3 letras).');
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      if (!regStoreName.trim() || regStoreName.trim().length < 2) {
        setRegError('Por favor, informe o nome do seu estabelecimento.');
        return;
      }
      setWizardStep(3);
    } else if (wizardStep === 3) {
      const digitsOnly = regPhone.replace(/\D/g, '');
      if (!regPhone.trim() || digitsOnly.length < 10) {
        setRegError('Por favor, informe seu WhatsApp com DDD (Ex: 11 98888-7777).');
        return;
      }
      setWizardStep(4);
    } else if (wizardStep === 4) {
      // E-MAIL OBRIGATÓRIO PARA RECUPERAÇÃO DE CONTA
      const cleanEmail = regEmail.trim().toLowerCase();
      if (!cleanEmail) {
        setRegError('O e-mail é OBRIGATÓRIO para garantir a recuperação segura da sua conta.');
        return;
      }
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(cleanEmail)) {
        setRegError('Por favor, informe um endereço de e-mail válido (Ex: seunome@gmail.com).');
        return;
      }
      setWizardStep(5);
    } else if (wizardStep === 5) {
      if (!usernameSecurity.isValid) {
        if (usernameHasAccents) {
          setRegError('Não é permitido adicionar acentos nem cedilhas no nome de usuário.');
        } else if (!usernameSecurity.hasUppercase) {
          setRegError('O nome de usuário precisa conter pelo menos uma letra MAIÚSCULA (A-Z).');
        } else if (!usernameSecurity.hasLowercase) {
          setRegError('O nome de usuário precisa conter pelo menos uma letra MINÚSCULA (a-z).');
        } else if (!usernameSecurity.hasNumber) {
          setRegError('O nome de usuário precisa conter pelo menos um NÚMERO (0-9).');
        } else if (!usernameSecurity.hasSpecialChar) {
          setRegError('O nome de usuário precisa conter pelo menos um CARACTERE ESPECIAL (@, #, $, %, &, *, !, _, etc).');
        } else if (!usernameSecurity.hasMinLength) {
          setRegError('O nome de usuário precisa ter no mínimo 4 caracteres.');
        } else if (!usernameSecurity.hasNoSpaces) {
          setRegError('Não é permitido espaços no nome de usuário.');
        } else {
          setRegError('Preencha todos os requisitos do nome de usuário.');
        }
        return;
      }
      setWizardStep(6);
    } else if (wizardStep === 6) {
      if (!passwordSecurity.isValid) {
        if (passwordHasAccents) {
          setRegError('Não é permitido adicionar acentos nem cedilhas na senha.');
        } else if (!passwordSecurity.hasUppercase) {
          setRegError('A senha precisa conter pelo menos uma letra MAIÚSCULA (A-Z).');
        } else if (!passwordSecurity.hasLowercase) {
          setRegError('A senha precisa conter pelo menos uma letra MINÚSCULA (a-z).');
        } else if (!passwordSecurity.hasNumber) {
          setRegError('A senha precisa conter pelo menos um número (0-9).');
        } else if (!passwordSecurity.hasSpecialChar) {
          setRegError('A senha precisa conter pelo menos um caractere especial (@, #, $, %, etc).');
        } else if (!passwordSecurity.hasMinLength) {
          setRegError('A senha precisa ter no mínimo 6 caracteres.');
        } else {
          setRegError('Preencha todos os requisitos de segurança da senha.');
        }
        return;
      }
      setWizardStep(7);
    }
  };

  // Voltar um passo no wizard
  const handlePrevWizardStep = () => {
    setRegError('');
    if (wizardStep > 1) {
      setWizardStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
    }
  };

  // Finalizar Cadastro e Entrar Imediatamente com 7 Dias Grátis
  const handleFinishRegistration = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRegError('');

    if (!usernameSecurity.isValid) {
      setWizardStep(5);
      setRegError('Verifique os requisitos do nome de usuário.');
      return;
    }

    if (!passwordSecurity.isValid) {
      setWizardStep(6);
      setRegError('Verifique os requisitos da senha.');
      return;
    }

    // Registra a conta com 7 dias grátis de período de teste
    const res = accountService.registerClientAccount({
      name: regName.trim(),
      storeName: regStoreName.trim(),
      phoneWhatsapp: regPhone.trim(),
      email: regEmail.trim().toLowerCase(),
      username: regUsername.trim(),
      password: regPassword,
    });

    if (!res.success) {
      setRegError(res.message);
      return;
    }

    // Faz o login automático na nova conta criada
    const loginRes = accountService.login(regUsername.trim(), regPassword);
    if (loginRes.success && loginRes.user) {
      onLoginSuccess(loginRes.user);
      if (onClose) onClose();
    } else {
      setActiveMode('login');
      setLoginError('Conta criada com sucesso! Faça seu login abaixo.');
    }
  };

  // 1. Identificar conta por Nome de Usuário ou E-mail (com busca local e Firestore)
  const handleIdentifyAccountForRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');
    setRecoverSuccess('');

    const clean = recoverIdentifier.trim();
    if (!clean) {
      setRecoverError('Por favor, informe seu nome de usuário ou e-mail cadastrado.');
      return;
    }

    setRecoverLoading(true);
    try {
      const account = await accountService.findAccountByUsernameOrEmailAsync(clean);
      if (!account) {
        setRecoverError('Nenhuma conta encontrada com este usuário ou e-mail. Verifique a digitação ou cadastre sua loja.');
        return;
      }

      setIdentifiedAccount(account);
      setRecoverStep(2);
      setRecoverSuccess(`Conta localizada: ${account.name || account.username} (${account.storeName})! Crie sua nova senha abaixo.`);
    } catch {
      setRecoverError('Erro ao consultar banco de dados. Tente novamente.');
    } finally {
      setRecoverLoading(false);
    }
  };

  // 2. Salvar Nova Senha e Repita a Senha com Criptografia no Firebase
  const handleSaveNewPasswordDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');

    if (!recoverNewPassword.trim() || !recoverRepeatPassword.trim()) {
      setRecoverError('Preencha a Nova Senha e confirme no campo Repita a Senha.');
      return;
    }

    if (recoverNewPassword !== recoverRepeatPassword) {
      setRecoverError('As senhas digitadas não coincidem. Digite exatamente a mesma senha nos dois campos.');
      return;
    }

    if (!recoverPasswordSecurity.isValid) {
      if (recoverPasswordHasAccents) {
        setRecoverError('Não é permitido adicionar acentos ou cedilhas na senha.');
      } else {
        setRecoverError('A nova senha precisa cumprir todos os requisitos de segurança indicados.');
      }
      return;
    }

    setRecoverLoading(true);

    try {
      const result = await accountService.resetPasswordDirectly(
        recoverIdentifier,
        recoverNewPassword
      );

      if (result.success && result.user) {
        onLoginSuccess(result.user);
        if (onClose) onClose();
      } else {
        setRecoverError(result.message);
      }
    } catch {
      setRecoverError('Erro ao salvar nova credencial criptografada no Firebase. Tente novamente.');
    } finally {
      setRecoverLoading(false);
    }
  };

  const formContent = (
    <div className="bg-white rounded-3xl max-w-sm sm:max-w-lg w-full shadow-2xl border-2 border-amber-300 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 p-5 sm:p-6 text-slate-950 relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-950/10 hover:bg-slate-950/20 text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="w-11 h-11 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center mb-3 shadow-md">
          {activeMode === 'login' ? (
            <Lock className="w-5 h-5 stroke-[2.5]" />
          ) : activeMode === 'recover' ? (
            <KeyRound className="w-5 h-5 stroke-[2.5]" />
          ) : (
            <Store className="w-5 h-5 stroke-[2.5]" />
          )}
        </div>

        <h2 className="text-lg sm:text-xl font-black tracking-tight font-display">
          {activeMode === 'login'
            ? 'Acessar Minha Conta'
            : activeMode === 'recover'
            ? 'Recuperação de Conta'
            : 'Cadastro da Loja'}
        </h2>
        <p className="text-xs text-slate-950 font-medium mt-0.5">
          {activeMode === 'login'
            ? 'Área de acesso para o lojista e administrador'
            : activeMode === 'recover'
            ? 'Recupere sua senha via E-mail obrigatório ou Google OAuth'
            : 'Preenchimento passo a passo para criar e ativar seu cardápio'}
        </p>

        {/* Tab Switcher: Login vs Cadastro vs Recuperação */}
        <div className="mt-4 flex p-1 bg-slate-950/15 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveMode('login');
              setLoginError('');
              setRegError('');
              setRecoverError('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeMode === 'login'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-900/80 hover:text-slate-950'
            }`}
          >
            Acessar Conta
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('register');
              setWizardStep(1);
              setLoginError('');
              setRegError('');
              setRecoverError('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeMode === 'register'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-900/80 hover:text-slate-950'
            }`}
          >
            Cadastrar Loja
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('recover');
              setRecoverStep(1);
              setLoginError('');
              setRegError('');
              setRecoverError('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeMode === 'recover'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-900/80 hover:text-slate-950'
            }`}
          >
            Esqueci a Senha
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 space-y-4 bg-white overflow-y-auto max-h-[75vh]">
        {/* ============================================================== */}
        {/* ABA 1: LOGIN TRADICIONAL + GOOGLE OAUTH + RECUPERAÇÃO          */}
        {/* ============================================================== */}
        {activeMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}



            {/* Usuário */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Digite seu usuário cadastrado"
                  autoComplete="username"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200 transition-all text-slate-900"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('recover');
                    setRecoverStep(1);
                    setRecoverError('');
                    setRecoverSuccess('');
                  }}
                  className="text-xs font-bold text-amber-900 hover:text-amber-950 underline underline-offset-2 cursor-pointer flex items-center gap-1.5 bg-amber-100/80 hover:bg-amber-200/90 px-2.5 py-1 rounded-lg border border-amber-300 transition-colors shadow-2xs"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-800" />
                  <span>Esqueci a senha</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Digite sua senha de acesso"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200 transition-all text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('recover');
                    setRecoverStep(1);
                    setRecoverError('');
                    setRecoverSuccess('');
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-amber-900 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Esqueci a senha? Clique para redefinir</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isLoginLoading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase">ou</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoginLoading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-200 active:scale-98 text-slate-800 font-black text-sm flex items-center justify-center gap-3 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Entrar com o Google</span>
            </button>

            <div className="pt-2 text-center">
              <p className="text-xs text-slate-500">
                Ainda não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('register');
                    setWizardStep(1);
                  }}
                  className="text-amber-800 font-extrabold hover:underline cursor-pointer"
                >
                  Cadastre sua loja agora
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* ABA 2: CADASTRO PASSO A PASSO (E-MAIL OBRIGATÓRIO)            */}
        {/* ============================================================== */}
        {activeMode === 'register' && (
          <div className="space-y-4">
            {/* Barra de Progresso do Wizard (1 a 7) */}
            <div className="space-y-1.5 pb-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span className="uppercase tracking-wider text-amber-800">
                  Etapa {wizardStep} de 7
                </span>
                <span className="text-slate-500 font-medium">
                  {wizardStep === 1 && '1. Seu Nome'}
                  {wizardStep === 2 && '2. Nome da Loja'}
                  {wizardStep === 3 && '3. WhatsApp'}
                  {wizardStep === 4 && '4. E-mail Obrigatório'}
                  {wizardStep === 5 && '5. Usuário'}
                  {wizardStep === 6 && '6. Senha'}
                  {wizardStep === 7 && '7. Ativação'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(wizardStep / 7) * 100}%` }}
                />
              </div>
            </div>

            {/* Mensagem de Erro Geral */}
            {regError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {/* ETAPA 1: NOME DO RESPONSÁVEL */}
            {wizardStep === 1 && (
              <form onSubmit={handleNextWizardStep} className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider block">
                    Etapa 1 de 7
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Como você se chama?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Informe seu nome completo para a identificação da sua conta.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Seu Nome Completo *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      required
                      value={regName}
                      onChange={(e) => {
                        setRegName(e.target.value);
                        setRegError('');
                      }}
                      placeholder="Ex: Carlos Eduardo Silva"
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98"
                >
                  <span>Continuar para Nome da Loja</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            )}

            {/* ETAPA 2: NOME DA LOJA */}
            {wizardStep === 2 && (
              <form onSubmit={handleNextWizardStep} className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider block">
                    Etapa 2 de 7
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Qual o nome da sua loja ou restaurante?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Este nome aparecerá em destaque no seu cardápio digital para seus clientes.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Nome da Loja / Estabelecimento *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Store className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      required
                      value={regStoreName}
                      onChange={(e) => {
                        setRegStoreName(e.target.value);
                        setRegError('');
                      }}
                      placeholder="Ex: Pizzaria & Forneria Bella Massa"
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePrevWizardStep}
                    className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98"
                  >
                    <span>Continuar para WhatsApp</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 3: WHATSAPP */}
            {wizardStep === 3 && (
              <form onSubmit={handleNextWizardStep} className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider block">
                    Etapa 3 de 7
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Qual o seu número de WhatsApp?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Onde você receberá a ativação e os pedidos enviados pelos seus clientes.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Seu WhatsApp com DDD *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      required
                      value={regPhone}
                      onChange={(e) => {
                        setRegPhone(e.target.value);
                        setRegError('');
                      }}
                      placeholder="Ex: (11) 98765-4321"
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePrevWizardStep}
                    className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98"
                  >
                    <span>Continuar para E-mail</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 4: E-MAIL OBRIGATÓRIO PARA RECUPERAÇÃO DE CONTA */}
            {wizardStep === 4 && (
              <form onSubmit={handleNextWizardStep} className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">
                      Etapa 4 de 7
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black uppercase">
                      Obrigatório
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Qual o seu e-mail de acesso e recuperação? *
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>O e-mail é obrigatório:</strong> será através dele que você recuperará sua conta caso esqueça a senha, além de receber faturas e confirmações oficiais.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-800">
                    E-mail Oficial do Responsável *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      autoFocus
                      required
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        setRegError('');
                      }}
                      placeholder="Ex: seunome@gmail.com"
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePrevWizardStep}
                    className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98"
                  >
                    <span>Continuar para Criar Usuário</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 5: USUÁRIO COM OBRIGAÇÕES & ATALHOS DE CARACTERES ESPECIAIS */}
            {wizardStep === 5 && (
              <form onSubmit={handleNextWizardStep} className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider block">
                    Etapa 5 de 7
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Crie seu Nome de Usuário (Login)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhe os requisitos abaixo. <strong>Não é permitido usar acentos nem cedilhas.</strong>
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                      Nome de Usuário *
                    </label>
                    {regUsername && (
                      <span className={`text-[10px] font-bold ${usernameSecurity.isValid ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {usernameSecurity.isValid ? 'Usuário Válido ✓' : 'Ajuste os requisitos'}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      required
                      value={regUsername}
                      onChange={(e) => {
                        setRegUsername(e.target.value);
                        setRegError('');
                      }}
                      placeholder="Ex: Carlos_adm1#"
                      className={`w-full pl-10 pr-3 py-3 bg-slate-50 border rounded-xl text-sm font-mono font-bold focus:outline-none transition-colors ${
                        usernameHasAccents
                          ? 'border-red-500 bg-red-50 text-red-900 ring-2 ring-red-200'
                          : usernameSecurity.isValid
                          ? 'border-emerald-500 bg-emerald-50/30 text-slate-900'
                          : 'border-slate-300 focus:border-amber-500 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Alerta de Acentos no Usuário */}
                  {usernameHasAccents && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Não é permitido adicionar acentos nem cedilhas (ã, é, ç...) no usuário.</span>
                    </div>
                  )}

                  {/* Atalhos rápidos para inserir Caracteres Especiais com 1 toque */}
                  <div className="space-y-1 pt-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Toque para inserir um caractere especial:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['@', '#', '$', '%', '&', '*', '!', '_', '-'].map((char) => (
                        <button
                          key={char}
                          type="button"
                          onClick={() => {
                            setRegUsername((prev) => prev + char);
                            setRegError('');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 border border-slate-300 hover:border-amber-400 rounded-lg text-xs font-mono font-black text-slate-800 hover:text-amber-950 transition-colors cursor-pointer"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Checklist de Acompanhamento do Usuário em Tempo Real */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <span className="text-[11px] uppercase font-bold text-slate-600 block">
                      Acompanhamento das Obrigações do Usuário:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <div className={`flex items-center gap-2 transition-colors ${usernameSecurity.hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {usernameSecurity.hasMinLength ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Mínimo de 4 caracteres</span>
                      </div>

                      <div className={`flex items-center gap-2 transition-colors ${usernameSecurity.hasUppercase ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {usernameSecurity.hasUppercase ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Letra maiúscula (A-Z)</span>
                      </div>

                      <div className={`flex items-center gap-2 transition-colors ${usernameSecurity.hasLowercase ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {usernameSecurity.hasLowercase ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Letra minúscula (a-z)</span>
                      </div>

                      <div className={`flex items-center gap-2 transition-colors ${usernameSecurity.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {usernameSecurity.hasNumber ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Número (0-9)</span>
                      </div>

                      <div className={`flex items-center gap-2 transition-colors ${usernameSecurity.hasSpecialChar ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {usernameSecurity.hasSpecialChar ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Caractere especial (@, #, $, etc)</span>
                      </div>

                      <div className={`flex items-center gap-2 transition-colors ${usernameSecurity.hasNoAccents ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}`}>
                        {usernameSecurity.hasNoAccents ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-red-600 stroke-[3]" />
                        )}
                        <span>Sem acentos ou cedilhas</span>
                      </div>

                      <div className={`flex items-center gap-2 transition-colors ${usernameSecurity.hasNoSpaces ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {usernameSecurity.hasNoSpaces ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Sem espaços</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePrevWizardStep}
                    className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!usernameSecurity.isValid}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Continuar para Criar Senha</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 6: SENHA COM OBRIGAÇÕES & ATALHOS DE CARACTERES ESPECIAIS */}
            {wizardStep === 6 && (
              <form onSubmit={handleNextWizardStep} className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider block">
                    Etapa 6 de 7
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Crie sua Senha de Acesso
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhe os requisitos de segurança abaixo. <strong>Proibido o uso de acentos.</strong>
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                      Senha de Acesso *
                    </label>
                    {regPassword && (
                      <span className={`text-[10px] font-bold ${passwordSecurity.isValid ? 'text-emerald-700' : 'text-amber-700'}`}>
                        Força: {passwordSecurity.strengthLabel}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      autoFocus
                      required
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        setRegError('');
                      }}
                      placeholder="Ex: Carlos2026@#"
                      className={`w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-xl text-sm font-mono font-bold focus:outline-none transition-colors ${
                        passwordHasAccents
                          ? 'border-red-500 bg-red-50 text-red-900 ring-2 ring-red-200'
                          : passwordSecurity.isValid
                          ? 'border-emerald-500 bg-emerald-50/30 text-slate-900'
                          : 'border-slate-300 focus:border-amber-500 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Alerta de Acentos na Senha */}
                  {passwordHasAccents && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Não é permitido adicionar acentos nem cedilhas (ã, é, ç...) na senha.</span>
                    </div>
                  )}

                  {/* Atalhos rápidos para inserir Caracteres Especiais na Senha */}
                  <div className="space-y-1 pt-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Toque para inserir um caractere especial na senha:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['@', '#', '$', '%', '&', '*', '!', '_', '-'].map((char) => (
                        <button
                          key={char}
                          type="button"
                          onClick={() => {
                            setRegPassword((prev) => prev + char);
                            setRegError('');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 border border-slate-300 hover:border-amber-400 rounded-lg text-xs font-mono font-black text-slate-800 hover:text-amber-950 transition-colors cursor-pointer"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Barra de Progresso de Força da Senha */}
                  {regPassword && (
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordSecurity.score <= 40
                            ? 'bg-red-500'
                            : passwordSecurity.score <= 60
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${passwordSecurity.score}%` }}
                      />
                    </div>
                  )}

                  {/* Checklist de Acompanhamento da Senha em Tempo Real */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <span className="text-[11px] uppercase font-bold text-slate-600 block">
                      Acompanhamento das Obrigações da Senha:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <div className={`flex items-center gap-2 transition-colors ${passwordSecurity.hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {passwordSecurity.hasMinLength ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Mínimo 6 caracteres</span>
                      </div>

                      <div className={`flex items-center gap-2 transition-colors ${passwordSecurity.hasUppercase ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {passwordSecurity.hasUppercase ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Letra maiúscula (A-Z)</span>
                      </div>

                      <div className={`flex items-center gap-2 transition-colors ${passwordSecurity.hasLowercase ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {passwordSecurity.hasLowercase ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Letra minúscula (a-z)</span>
                      </div>

                      <div className={`flex items-center gap-2 transition-colors ${passwordSecurity.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {passwordSecurity.hasNumber ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Número (0-9)</span>
                      </div>

                      <div className={`flex items-center gap-2 transition-colors ${passwordSecurity.hasSpecialChar ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {passwordSecurity.hasSpecialChar ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Caractere especial (@, #, $, etc)</span>
                      </div>

                      <div className={`flex items-center gap-2 transition-colors ${passwordSecurity.hasNoAccents ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}`}>
                        {passwordSecurity.hasNoAccents ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-red-600 stroke-[3]" />
                        )}
                        <span>Sem acentos ou cedilhas</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePrevWizardStep}
                    className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!passwordSecurity.isValid}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Revisar e Ativar</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 7: REVISÃO & BOTÃO DIRETO PARA O WHATSAPP */}
            {wizardStep === 7 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider block">
                    Etapa 7 Final
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Tudo pronto! 7 Dias Grátis Liberados
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Sua conta foi criada com sucesso! Você tem <strong>7 dias grátis</strong> para cadastrar produtos, configurar e conhecer todo o sistema sem compromisso.
                  </p>
                </div>

                {/* Resumo Limpo das Informações */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-slate-800 space-y-2">
                  <span className="font-extrabold uppercase text-amber-900 text-[11px] block">
                    Resumo do Cadastro:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Loja:</span>
                      <strong className="text-slate-900">{regStoreName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Responsável:</span>
                      <strong className="text-slate-900">{regName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">E-mail Oficial:</span>
                      <strong className="text-slate-900">{regEmail}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Usuário Criado:</span>
                      <strong className="text-slate-900 font-mono">{regUsername}</strong>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleFinishRegistration()}
                    className="w-full py-4 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2.5 transition-all shadow-lg hover:shadow-emerald-200 cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>Acessar Sistema (7 Dias Grátis)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrevWizardStep}
                    className="w-full py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar e revisar informações</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 3: RECUPERAÇÃO DE CONTA POR E-MAIL E GOOGLE OAUTH          */}
        {/* ============================================================== */}
        {activeMode === 'recover' && (
          <div className="space-y-4">
            {/* Feedbacks de Alerta / Sucesso */}
            {recoverError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{recoverError}</span>
              </div>
            )}

            {recoverSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{recoverSuccess}</span>
              </div>
            )}

            {/* ETAPA 1: DIGITAR NOME DE USUÁRIO OU E-MAIL */}
            {recoverStep === 1 && (
              <form onSubmit={handleIdentifyAccountForRecovery} className="space-y-4 animate-in fade-in">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-1">
                    <ShieldCheck className="w-3 h-3 text-amber-700" />
                    <span>Recuperação Segura Criptografada</span>
                  </div>
                  <h3 className="text-base font-black text-slate-950 font-display">
                    Esqueceu sua senha de acesso?
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Informe seu <strong>Nome de Usuário</strong> ou <strong>E-mail</strong> para localizar sua conta e redefinir sua senha com segurança.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                    Nome de Usuário ou E-mail *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={recoverIdentifier}
                      onChange={(e) => {
                        setRecoverIdentifier(e.target.value);
                        setRecoverError('');
                      }}
                      placeholder="Ex: SeuUsuario ou seunome@gmail.com"
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                {/* Badge de Criptografia do Firebase */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Criptografia Ativa:</strong> Todos os dados e senhas são protegidos de ponta a ponta no Firebase contra vazamentos.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!recoverIdentifier.trim()}
                  className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <span>Localizar Conta e Redefinir Senha</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('login');
                      setRecoverError('');
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Lembrei da senha • Voltar ao Login
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 2: NOVA SENHA E REPITA A SENHA */}
            {recoverStep === 2 && (
              <form onSubmit={handleSaveNewPasswordDirect} className="space-y-4 animate-in fade-in">
                {/* Cartão de Identificação da Conta */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-950">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold block text-emerald-900">
                      Conta Localizada: {identifiedAccount?.name || identifiedAccount?.username}
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      {identifiedAccount?.storeName} • Usuário: @{identifiedAccount?.username}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-950 font-display">
                    Crie sua Nova Senha
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina sua nova senha e repita no campo abaixo para confirmar.
                  </p>
                </div>

                {/* CAMPO 1: NOVA SENHA */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                      • NOVA SENHA *
                    </label>
                    {recoverNewPassword && (
                      <span className={`text-[10px] font-bold ${recoverPasswordSecurity.isValid ? 'text-emerald-700' : 'text-amber-700'}`}>
                        Força: {recoverPasswordSecurity.strengthLabel}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRecoverNewPassword ? 'text' : 'password'}
                      autoFocus
                      required
                      value={recoverNewPassword}
                      onChange={(e) => {
                        setRecoverNewPassword(e.target.value);
                        setRecoverError('');
                      }}
                      placeholder="Digite sua nova senha"
                      className={`w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-xl text-sm font-mono font-bold focus:outline-none transition-colors ${
                        recoverPasswordHasAccents
                          ? 'border-red-500 bg-red-50 text-red-900 ring-2 ring-red-200'
                          : recoverPasswordSecurity.isValid
                          ? 'border-emerald-500 bg-emerald-50/30 text-slate-900'
                          : 'border-slate-300 focus:border-amber-500 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecoverNewPassword(!showRecoverNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showRecoverNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Alerta de Acentos */}
                  {recoverPasswordHasAccents && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Não é permitido adicionar acentos nem cedilhas na senha.</span>
                    </div>
                  )}

                  {/* Atalhos rápidos para inserir Caracteres Especiais */}
                  <div className="space-y-1 pt-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Toque para inserir um caractere especial:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['@', '#', '$', '%', '&', '*', '!', '_', '-'].map((char) => (
                        <button
                          key={char}
                          type="button"
                          onClick={() => {
                            setRecoverNewPassword((prev) => prev + char);
                            setRecoverError('');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 border border-slate-300 hover:border-amber-400 rounded-lg text-xs font-mono font-black text-slate-800 hover:text-amber-950 transition-colors cursor-pointer"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CAMPO 2: REPITA A SENHA */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                      • REPITA A SENHA *
                    </label>
                    {recoverRepeatPassword && (
                      <span className={`text-[10px] font-bold ${passwordsMatch ? 'text-emerald-700' : 'text-red-600'}`}>
                        {passwordsMatch ? 'Senhas conferem ✓' : 'Senhas não conferem'}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRecoverRepeatPassword ? 'text' : 'password'}
                      required
                      value={recoverRepeatPassword}
                      onChange={(e) => {
                        setRecoverRepeatPassword(e.target.value);
                        setRecoverError('');
                      }}
                      placeholder="Repita exatamente a mesma senha"
                      className={`w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-xl text-sm font-mono font-bold focus:outline-none transition-colors ${
                        passwordsMatch
                          ? 'border-emerald-500 bg-emerald-50/30 text-slate-900 ring-2 ring-emerald-200'
                          : passwordsMismatch
                          ? 'border-red-500 bg-red-50 text-red-900 ring-2 ring-red-200'
                          : 'border-slate-300 focus:border-amber-500 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecoverRepeatPassword(!showRecoverRepeatPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showRecoverRepeatPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Checklist de Validação das Obrigações de Segurança */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <span className="text-[11px] uppercase font-bold text-slate-600 block">
                    Acompanhamento das Obrigações da Senha:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div className={`flex items-center gap-2 transition-colors ${recoverPasswordSecurity.hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      {recoverPasswordSecurity.hasMinLength ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300" />
                      )}
                      <span>Mínimo 6 caracteres</span>
                    </div>

                    <div className={`flex items-center gap-2 transition-colors ${recoverPasswordSecurity.hasUppercase ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      {recoverPasswordSecurity.hasUppercase ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300" />
                      )}
                      <span>Letra maiúscula (A-Z)</span>
                    </div>

                    <div className={`flex items-center gap-2 transition-colors ${recoverPasswordSecurity.hasLowercase ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      {recoverPasswordSecurity.hasLowercase ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300" />
                      )}
                      <span>Letra minúscula (a-z)</span>
                    </div>

                    <div className={`flex items-center gap-2 transition-colors ${recoverPasswordSecurity.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      {recoverPasswordSecurity.hasNumber ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300" />
                      )}
                      <span>Número (0-9)</span>
                    </div>

                    <div className={`flex items-center gap-2 transition-colors ${recoverPasswordSecurity.hasSpecialChar ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      {recoverPasswordSecurity.hasSpecialChar ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300" />
                      )}
                      <span>Caractere especial (@, #...)</span>
                    </div>

                    <div className={`flex items-center gap-2 transition-colors ${passwordsMatch ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      {passwordsMatch ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300" />
                      )}
                      <span>Senhas idênticas</span>
                    </div>
                  </div>
                </div>

                {/* Banner de Criptografia do Firebase */}
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 text-[11px] flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Criptografia no Firebase:</strong> A nova senha é criptografada com algoritmo SHA-256 e salt seguro antes da gravação no banco de dados, impossibilitando vazamentos.
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoverStep(1);
                      setRecoverError('');
                    }}
                    className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!recoverPasswordSecurity.isValid || !passwordsMatch || recoverLoading}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {recoverLoading ? (
                      <span>Criptografando e Salvando...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Salvar Nova Senha e Acessar Conta</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer branding */}
        <div className="pt-3 border-t border-slate-100 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">
            CARDAPP DIGITAL • SF TECNOLOGIA
          </span>
        </div>
      </div>
    </div>
  );

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-[#FFFDF7] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[500px] h-96 sm:h-[500px] bg-amber-300/20 blur-3xl rounded-full pointer-events-none -z-10" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-md mx-auto mb-2.5">
            <ForkKnifeIcon className="w-6 h-6 stroke-[2.3]" />
          </div>
          <h1 className="text-sm sm:text-base font-black text-slate-950 font-display tracking-tight">
            CARDAPP DIGITAL
          </h1>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider mt-1">
            <ShieldCheck className="w-3 h-3 text-amber-700" />
            <span>Portal do Lojista & Cadastro</span>
          </div>
        </div>

        {formContent}

        <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center font-display">
          CARDAPP DIGITAL • SF TECNOLOGIA • Todos os direitos reservados
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      {formContent}
    </div>
  );
};

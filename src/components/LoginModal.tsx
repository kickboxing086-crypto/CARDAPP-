import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Mail,
  Store,
  Phone,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  ExternalLink,
  X,
  Check,
} from 'lucide-react';
import { accountService } from '../services/accountService';
import { emailVerificationService } from '../services/emailVerificationService';
import { UserAccount, ClientRegistrationFormData } from '../types';
import { validateSecurityPolicy } from '../utils/security';
import { ForkKnifeIcon } from './ForkKnifeIcon';

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
  // Mode: 'login' | 'register'
  const [activeMode, setActiveMode] = useState<'login' | 'register'>(initialMode);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Registration Form State (Etapa 1: Dados Pessoais & da Loja)
  const [regStep, setRegStep] = useState<1 | 2>(1); // 1: Dados, 2: Código 6 Dígitos
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regStoreName, setRegStoreName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [isRegLoading, setIsRegLoading] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);

  // Registration Verification Code State (Etapa 2: Código de 6 Dígitos)
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(false);

  // Security policy validations
  const usernameSecurity = validateSecurityPolicy(regUsername);
  const passwordSecurity = validateSecurityPolicy(regPassword);

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  // Resend Countdown Timer in Step 2
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (regStep === 2 && resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [regStep, resendCountdown]);

  // Auto-verificação periódica de link de e-mail enquanto está na etapa 2
  useEffect(() => {
    let poller: NodeJS.Timeout | null = null;
    if (regStep === 2 && regEmail) {
      poller = setInterval(async () => {
        try {
          const res = await emailVerificationService.checkEmailVerifiedViaLink(regEmail);
          if (res.verified && res.registrationData) {
            if (poller) clearInterval(poller);
            setRegSuccess('E-mail confirmado pelo link de segurança! Ativando sua conta...');
            setIsRegLoading(true);
            const createRes = accountService.registerClientAccount(res.registrationData);
            setIsRegLoading(false);
            if (createRes.success && createRes.account) {
              emailVerificationService.clearSession();
              onLoginSuccess(createRes.account);
              if (onClose) onClose();
            }
          }
        } catch {
          // ignore
        }
      }, 3000);
    }
    return () => {
      if (poller) clearInterval(poller);
    };
  }, [regStep, regEmail, onLoginSuccess, onClose]);

  // Check email domain typo suggestion in real time
  const handleEmailChange = (val: string) => {
    setRegEmail(val);
    setRegError('');
    if (val.includes('@')) {
      const check = emailVerificationService.validateEmail(val);
      if (check.suggestion) {
        setEmailSuggestion(check.suggestion);
      } else {
        setEmailSuggestion(null);
      }
    } else {
      setEmailSuggestion(null);
    }
  };

  if (!isOpen) return null;

  // SUBMIT LOGIN
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

  // SUBMIT REGISTRATION STEP 1 (ENVIAR CÓDIGO DE 6 DÍGITOS NO-REPLY)
  const handleRegisterStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regName.trim()) {
      setRegError('Preencha seu nome completo.');
      return;
    }

    const emailValidation = emailVerificationService.validateEmail(regEmail);
    if (!emailValidation.isValid) {
      setRegError(emailValidation.errorMessage || 'E-mail inválido.');
      return;
    }

    if (!regStoreName.trim()) {
      setRegError('Preencha o nome do seu estabelecimento / loja.');
      return;
    }

    if (!usernameSecurity.isValid) {
      setRegError(
        'O nome de usuário precisa conter maiúscula, minúscula, número e caractere especial (@, #, etc).'
      );
      return;
    }

    if (!passwordSecurity.isValid) {
      setRegError(
        'A senha de acesso precisa conter maiúscula, minúscula, número e caractere especial (@, #, etc).'
      );
      return;
    }

    setIsRegLoading(true);

    const formData: ClientRegistrationFormData = {
      name: regName.trim(),
      email: regEmail.trim(),
      phoneWhatsapp: regPhone.trim(),
      storeName: regStoreName.trim(),
      username: regUsername.trim(),
      password: regPassword,
    };

    const res = await emailVerificationService.sendVerificationCode(formData);
    setIsRegLoading(false);

    if (res.success) {
      setRegStep(2);
      setDigits(['', '', '', '', '', '']);
      setResendCountdown(60);
      setCanResend(false);
      setRegSuccess(
        `Código de segurança de 6 dígitos enviado para ${regEmail}. Verifique sua caixa de entrada de e-mail!`
      );
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 150);
    } else {
      setRegError(res.message);
    }
  };

  // DIGIT HANDLING FOR 6-DIGIT CODE
  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const copy = [...digits];
      copy[index] = '';
      setDigits(copy);
      return;
    }

    // Se o usuário colou múltiplos dígitos (ex: 742918)
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split('');
      const copy = [...digits];
      pasted.forEach((char, i) => {
        if (i < 6) copy[i] = char;
      });
      setDigits(copy);
      const nextFocus = Math.min(pasted.length, 5);
      digitInputRefs.current[nextFocus]?.focus();
      return;
    }

    // Apenas um dígito digitado
    const singleDigit = clean.slice(-1);
    const copy = [...digits];
    copy[index] = singleDigit;
    setDigits(copy);

    if (singleDigit && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePasteCode = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste) {
      const copy = [...digits];
      paste.split('').forEach((char, i) => {
        if (i < 6) copy[i] = char;
      });
      setDigits(copy);
      const focusIndex = Math.min(paste.length, 5);
      digitInputRefs.current[focusIndex]?.focus();
    }
  };

  // REENVIAR CÓDIGO NO-REPLY
  const handleResendCode = async () => {
    if (!canResend) return;
    setIsRegLoading(true);
    setRegError('');
    setRegSuccess('');

    const res = await emailVerificationService.resendCode();
    setIsRegLoading(false);

    if (res.success) {
      setDigits(['', '', '', '', '', '']);
      setResendCountdown(60);
      setCanResend(false);
      setRegSuccess(`Novo código de 6 dígitos enviado para ${regEmail}. Verifique sua caixa de entrada!`);
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 100);
    } else {
      setRegError(res.message);
    }
  };

  // SUBMIT REGISTRATION STEP 2 (CONFIRMAR CÓDIGO DE 6 DÍGITOS E CRIAR LOJA)
  const handleConfirmCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    const fullCode = digits.join('');

    if (fullCode.length !== 6) {
      setRegError('Por favor, preencha todos os 6 dígitos do código.');
      return;
    }

    setIsRegLoading(true);
    const verifyRes = await emailVerificationService.verifyCode(regEmail, fullCode);

    if (!verifyRes.success || !verifyRes.registrationData) {
      setIsRegLoading(false);
      setRegError(verifyRes.message);
      return;
    }

    // Código validado com sucesso! Cria e ativa a conta no sistema
    const createRes = accountService.registerClientAccount(verifyRes.registrationData);
    setIsRegLoading(false);

    if (createRes.success && createRes.account) {
      emailVerificationService.clearSession();
      onLoginSuccess(createRes.account);
      if (onClose) onClose();
    } else {
      setRegError(createRes.message);
    }
  };

  // CHECAGEM MANUAL DE CONFIRMAÇÃO VIA LINK DE E-MAIL
  const handleManualCheckLink = async () => {
    setIsCheckingLink(true);
    setRegError('');
    setRegSuccess('');

    try {
      const res = await emailVerificationService.checkEmailVerifiedViaLink(regEmail);
      setIsCheckingLink(false);

      if (res.verified && res.registrationData) {
        setRegSuccess('E-mail confirmado pelo link de segurança! Ativando sua conta...');
        setIsRegLoading(true);
        const createRes = accountService.registerClientAccount(res.registrationData);
        setIsRegLoading(false);
        if (createRes.success && createRes.account) {
          emailVerificationService.clearSession();
          onLoginSuccess(createRes.account);
          if (onClose) onClose();
        }
      } else {
        setRegError(
          'Ainda não identificamos a confirmação. Por favor, abra o e-mail recebido e clique no link de verificação, ou digite o código de 6 dígitos.'
        );
      }
    } catch {
      setIsCheckingLink(false);
      setRegError('Não foi possível verificar no momento. Tente novamente em instantes.');
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
          ) : (
            <Store className="w-5 h-5 stroke-[2.5]" />
          )}
        </div>

        <h2 className="text-lg sm:text-xl font-black tracking-tight font-display">
          {activeMode === 'login'
            ? 'Acessar Minha Conta'
            : regStep === 1
            ? 'Criar Minha Conta de Loja'
            : 'Verificação em Duas Etapas'}
        </h2>
        <p className="text-xs text-slate-950 font-medium mt-0.5">
          {activeMode === 'login'
            ? 'Área restrita para lojistas e administração do CARDAPP'
            : regStep === 1
            ? 'Cadastre seus dados e ative seu cardápio com verificação segura'
            : `Confirmação de e-mail real com código no-reply de 6 dígitos`}
        </p>

        {/* Tab Switcher: Login vs Cadastro */}
        <div className="mt-4 flex p-1 bg-slate-950/15 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setActiveMode('login');
              setLoginError('');
              setRegError('');
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
              setLoginError('');
              setRegError('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeMode === 'register'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-900/80 hover:text-slate-950'
            }`}
          >
            Criar Nova Conta
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 space-y-4 bg-white overflow-y-auto max-h-[75vh]">
        {/* ============================================================== */}
        {/* ABA 1: LOGIN TRADICIONAL                                       */}
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
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                Senha
              </label>
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

            <div className="pt-2 text-center">
              <p className="text-xs text-slate-500">
                Ainda não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setActiveMode('register')}
                  className="text-amber-800 font-extrabold hover:underline cursor-pointer"
                >
                  Cadastre sua loja agora
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* ABA 2: CADASTRO DO PRÓPRIO CLIENTE (ETAPA 1: DADOS)            */}
        {/* ============================================================== */}
        {activeMode === 'register' && regStep === 1 && (
          <form onSubmit={handleRegisterStep1Submit} className="space-y-3.5">
            {regError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {/* Nome Completo (Dados Pessoais) */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                Nome Completo (Responsável) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            {/* E-mail com Validação e Sugestão de Typo */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                  E-mail Pessoal / Comercial *
                </label>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                  Receberá código de 6 dígitos
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="Ex: seunome@gmail.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Sugestão de Typo Inteligente */}
              {emailSuggestion && (
                <div className="p-2 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-950 flex items-center justify-between gap-2">
                  <span>
                    Você quis dizer: <strong>{emailSuggestion}</strong>?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRegEmail(emailSuggestion);
                      setEmailSuggestion(null);
                    }}
                    className="px-2 py-0.5 bg-amber-400 text-slate-950 rounded-lg font-bold text-[10px] cursor-pointer"
                  >
                    Corrigir
                  </button>
                </div>
              )}
            </div>

            {/* WhatsApp / Telefone */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                WhatsApp / Celular *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="Ex: (84) 98611-3980"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Nome da Loja / Estabelecimento */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                Nome da Loja / Estabelecimento *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Store className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  required
                  value={regStoreName}
                  onChange={(e) => setRegStoreName(e.target.value)}
                  placeholder="Ex: Pastelaria & Caldo do Zé"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Nome de Usuário para Acesso */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                Nome de Usuário para Login *
              </label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="Ex: Ze_adm1#"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
              />
              <div className="flex flex-wrap gap-1 text-[10px] pt-0.5">
                <span className={usernameSecurity.hasUppercase ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                  • Maiúscula
                </span>
                <span className={usernameSecurity.hasLowercase ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                  • Minúscula
                </span>
                <span className={usernameSecurity.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                  • Número
                </span>
                <span className={usernameSecurity.hasSpecialChar ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                  • Caractere Especial (@, #, etc)
                </span>
              </div>
            </div>

            {/* Senha de Acesso */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                Senha de Acesso *
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Ex: Pastel2026@#"
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px] pt-0.5">
                <span className={passwordSecurity.hasUppercase ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                  • Maiúscula
                </span>
                <span className={passwordSecurity.hasLowercase ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                  • Minúscula
                </span>
                <span className={passwordSecurity.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                  • Número
                </span>
                <span className={passwordSecurity.hasSpecialChar ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                  • Especial (@, #)
                </span>
                <span className={passwordSecurity.hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                  • Mín. 6 dígitos
                </span>
              </div>
            </div>

            {/* Botão de Enviar Código No-Reply */}
            <button
              type="submit"
              disabled={isRegLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isRegLoading ? (
                <span>Enviando código no-reply...</span>
              ) : (
                <>
                  <Mail className="w-4 h-4 stroke-[2.5]" />
                  <span>Continuar e Verificar E-mail</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* ABA 2: CADASTRO DO PRÓPRIO CLIENTE (ETAPA 2: CÓDIGO DE 6 DÍGITOS) */}
        {/* ============================================================== */}
        {activeMode === 'register' && regStep === 2 && (
          <form onSubmit={handleConfirmCodeSubmit} className="space-y-4">
            {regSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{regSuccess}</span>
              </div>
            )}

            {regError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {/* Informações do E-mail Destinatário */}
            <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">E-mail verificado:</span>
                <button
                  type="button"
                  onClick={() => {
                    setRegStep(1);
                    setRegError('');
                    setRegSuccess('');
                  }}
                  className="text-amber-800 font-extrabold hover:underline text-[11px] cursor-pointer"
                >
                  Alterar dados
                </button>
              </div>
              <p className="font-mono font-black text-slate-900 text-sm">{regEmail}</p>
              <p className="text-[11px] text-slate-500">
                Uma mensagem no-reply com seu código foi despachada para este endereço.
              </p>
            </div>

            {/* Caixas para os 6 Dígitos */}
            <div className="space-y-2">
              <label className="block text-center text-xs font-black text-slate-800 uppercase tracking-wider">
                Digite o código de 6 dígitos recebido:
              </label>

              <div className="flex items-center justify-center gap-1.5 sm:gap-2" onPaste={handlePasteCode}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      digitInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(index, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center font-mono font-black text-xl sm:text-2xl rounded-2xl bg-slate-50 border-2 border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none transition-all shadow-2xs"
                  />
                ))}
              </div>
            </div>

            {/* Card de Instruções de Segurança e Checagem da Caixa de Entrada */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-black">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Autenticação Real de E-mail (Anti-Fraude)</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Enviado</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Um e-mail de segurança oficial foi enviado diretamente para sua caixa de entrada no endereço <strong>{regEmail}</strong>.
              </p>

              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 space-y-1.5 text-[11px] text-amber-950 font-medium">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Como validar seu cadastro:</span>
                </div>
                <ul className="space-y-1 list-disc list-inside text-slate-700 pl-1 text-[11px]">
                  <li>
                    <strong>Opção 1:</strong> Abra seu e-mail e <strong>clique no link de confirmação</strong> (esta tela reconhece automaticamente e ativa sua loja).
                  </li>
                  <li>
                    <strong>Opção 2:</strong> Ou digite o <strong>código de 6 dígitos</strong> recebido nos campos acima.
                  </li>
                </ul>
                <p className="text-[10px] text-slate-500 pt-1">
                  💡 Caso não encontre na Caixa de Entrada, confira sua pasta de <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>.
                </p>
              </div>
            </div>

            {/* Botão de Confirmação Final por Código */}
            <button
              type="submit"
              disabled={isRegLoading || digits.join('').length !== 6}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isRegLoading ? (
                <span>Ativando sua conta...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirmar Código e Ativar Minha Loja</span>
                </>
              )}
            </button>

            {/* Botão Secundário: Checar se já confirmou pelo link de e-mail */}
            <button
              type="button"
              disabled={isCheckingLink || isRegLoading}
              onClick={handleManualCheckLink}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isCheckingLink ? 'animate-spin' : ''}`} />
              <span>
                {isCheckingLink
                  ? 'Verificando confirmação do e-mail...'
                  : 'Já cliquei no link do e-mail (Verificar Agora)'}
              </span>
            </button>

            {/* Reenvio com Contador */}
            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <button
                type="button"
                onClick={() => setRegStep(1)}
                className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
              >
                Voltar aos dados
              </button>

              <button
                type="button"
                disabled={!canResend || isRegLoading}
                onClick={handleResendCode}
                className={`flex items-center gap-1 font-bold ${
                  canResend
                    ? 'text-amber-800 hover:underline cursor-pointer'
                    : 'text-slate-400 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {canResend ? 'Reenviar Mensagem' : `Reenviar em ${resendCountdown}s`}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Footer branding */}
        <div className="pt-3 border-t border-slate-100 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Desenvolvido por SF TECNOLOGIA • Segurança em 2 Etapas
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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 font-display tracking-tight">
            CARD<span className="text-amber-500">APP</span>
          </h1>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider mt-1">
            <ShieldCheck className="w-3 h-3 text-amber-700" />
            <span>Portal do Lojista & Cadastro Seguro</span>
          </div>
        </div>

        {formContent}

        <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          CARDAPP • SF TECNOLOGIA • Todos os direitos reservados
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

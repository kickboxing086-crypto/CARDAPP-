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

  // SUBMIT WHATSAPP ACCOUNT REQUEST
  const handleWhatsAppRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim() || !regStoreName.trim() || !regPhone.trim()) {
      setRegError('Por favor, preencha os campos obrigatórios (*).');
      return;
    }

    const text = `*SOLICITAÇÃO DE CONTA - CARDAPP*\n\n` +
      `• *Loja:* ${regStoreName.trim()}\n` +
      `• *Responsável:* ${regName.trim()}\n` +
      `• *WhatsApp:* ${regPhone.trim()}\n` +
      `• *E-mail:* ${regEmail.trim() || 'Não informado'}\n` +
      `• *Usuário desejado:* ${regUsername.trim() || 'Não informado'}\n` +
      `• *Senha desejada:* ${regPassword || 'Não informada'}\n\n` +
      `Olá! Preenchi meus dados no sistema e gostaria de solicitar a criação e ativação do meu acesso.`;

    const url = `https://wa.me/5584986113980?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
          {activeMode === 'login' ? 'Acessar Minha Conta' : 'Solicitar Acesso'}
        </h2>
        <p className="text-xs text-slate-950 font-medium mt-0.5">
          {activeMode === 'login'
            ? 'Área restrita para lojistas e administração do sistema'
            : 'Preencha seus dados e envie diretamente para o WhatsApp para que o acesso seja gerado'}
        </p>

        {/* Tab Switcher: Login vs Solicitar Conta */}
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
            Solicitar Conta
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
                  Solicite sua conta agora
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* ABA 2: SOLICITAÇÃO DE CONTA VIA WHATSAPP                       */}
        {/* ============================================================== */}
        {activeMode === 'register' && (
          <form onSubmit={handleWhatsAppRequest} className="space-y-3.5">
            {regError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-2 font-black text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Solicite seu acesso direto no WhatsApp</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Preencha seus dados abaixo e clique em enviar. Sua solicitação será encaminhada diretamente para o WhatsApp do suporte técnico para a geração do seu acesso.
              </p>
            </div>

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

            {/* E-mail */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                E-mail Pessoal / Comercial
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Ex: seunome@gmail.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
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

            {/* Nome de Usuário Desejado */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                Usuário Desejado para Login
              </label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="Ex: Ze_adm1#"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            {/* Senha Desejada */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                Senha Desejada
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
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
            </div>

            {/* Password Security Requirements Checklist */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1.5">
              <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Requisitos de Segurança da Senha:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-600">
                <div className={`flex items-center gap-1.5 ${passwordSecurity.hasMinLength ? 'text-emerald-700 font-bold' : ''}`}>
                  {passwordSecurity.hasMinLength ? <Check className="w-3 h-3 text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                  <span>Mínimo de 6 caracteres</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordSecurity.hasUppercase ? 'text-emerald-700 font-bold' : ''}`}>
                  {passwordSecurity.hasUppercase ? <Check className="w-3 h-3 text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                  <span>Letra maiúscula (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordSecurity.hasLowercase ? 'text-emerald-700 font-bold' : ''}`}>
                  {passwordSecurity.hasLowercase ? <Check className="w-3 h-3 text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                  <span>Letra minúscula (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordSecurity.hasNumber ? 'text-emerald-700 font-bold' : ''}`}>
                  {passwordSecurity.hasNumber ? <Check className="w-3 h-3 text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                  <span>Número (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordSecurity.hasSpecialChar ? 'text-emerald-700 font-bold' : ''}`}>
                  {passwordSecurity.hasSpecialChar ? <Check className="w-3 h-3 text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                  <span>Caractere especial (@,#,$,etc)</span>
                </div>
              </div>
            </div>

            {/* Botão de Enviar para WhatsApp */}
            <button
              type="submit"
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Phone className="w-4 h-4 stroke-[2.5]" />
              <span>Enviar Solicitação para o WhatsApp</span>
            </button>
          </form>
        )}

        {/* Footer branding */}
        <div className="pt-3 border-t border-slate-100 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">
            CARDAPP DIGITAL • Suporte Técnico via WhatsApp
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
            <span>Portal do Lojista & Solicitação de Acesso</span>
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

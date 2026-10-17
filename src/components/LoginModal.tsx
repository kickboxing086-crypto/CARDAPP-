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

  // Recuperação de Conta via E-mail e Google OAuth
  // recoverStep: 1 = Digitar E-mail / Conectar Google; 2 = Digitar Código 6 dígitos; 3 = Redefinir Senha
  const [recoverStep, setRecoverStep] = useState<1 | 2 | 3>(1);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverCode, setRecoverCode] = useState('');
  const [recoverNewPassword, setRecoverNewPassword] = useState('');
  const [showRecoverNewPassword, setShowRecoverNewPassword] = useState(false);
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

  useEffect(() => {
    setActiveMode(initialMode);
    setWizardStep(1);
    setRecoverStep(1);
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

  // Finalizar e Enviar para o WhatsApp (Sem expor o número em tela)
  const handleFinalSubmitWhatsApp = (e?: React.FormEvent) => {
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

    // Registra a conta com o e-mail obrigatório
    accountService.registerClientAccount({
      name: regName.trim(),
      storeName: regStoreName.trim(),
      phoneWhatsapp: regPhone.trim(),
      email: regEmail.trim().toLowerCase(),
      username: regUsername.trim(),
      password: regPassword,
    });

    const text =
      `*SOLICITAÇÃO DE CADASTRO - CARDAPP*\n\n` +
      `• *Loja:* ${regStoreName.trim()}\n` +
      `• *Responsável:* ${regName.trim()}\n` +
      `• *WhatsApp:* ${regPhone.trim()}\n` +
      `• *E-mail Oficial:* ${regEmail.trim().toLowerCase()}\n` +
      `• *Usuário Criado:* ${regUsername.trim()}\n` +
      `• *Senha Definida:* ${regPassword}\n\n` +
      `Olá! Conclui o cadastro da minha loja com e-mail obrigatório para recuperação e gostaria de solicitar a ativação do meu cardápio digital.`;

    // Redireciona diretamente para o WhatsApp sem expor o número de telefone em texto na tela
    const url = `https://wa.me/5584986113980?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Solicitar Código de Recuperação por E-mail (com Gmail OAuth ou API)
  const handleRequestRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');
    setRecoverSuccess('');

    const cleanEmail = recoverEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setRecoverError('Informe um endereço de e-mail válido.');
      return;
    }

    const account = accountService.findAccountByEmail(cleanEmail);
    if (!account) {
      setRecoverError(
        'Nenhuma conta encontrada com este e-mail. Verifique a digitação ou cadastre sua loja.'
      );
      return;
    }

    setRecoverLoading(true);

    try {
      // 1. Gera o código oficial de 6 dígitos no sistema
      const session = accountService.createPasswordResetCode(cleanEmail);
      if (!session) {
        throw new Error('Falha ao gerar código de recuperação.');
      }

      // 2. Tenta enviar o e-mail via Gmail API (OAuth) ou servidor
      let sent = false;
      try {
        const gmailRes = await sendRecoveryEmailViaGmailApi(
          cleanEmail,
          session.code,
          session.name,
          session.storeName
        );
        if (gmailRes.success) {
          sent = true;
        }
      } catch {
        // segue para o servidor
      }

      if (!sent) {
        // Envia via servidor backend
        await fetch('/api/send-recovery-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: cleanEmail,
            clientName: session.name,
            storeName: session.storeName,
            code: session.code,
          }),
        });
      }

      setRecoverSuccess(`Código de segurança enviado com sucesso para ${cleanEmail}!`);
      setRecoverStep(2);
    } catch (err: any) {
      console.error('Erro na recuperação:', err);
      setRecoverError('Erro ao enviar e-mail de recuperação. Tente novamente.');
    } finally {
      setRecoverLoading(false);
    }
  };

  // Validar Código de 6 Dígitos
  const handleVerifyRecoveryCode = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');

    const cleanCode = recoverCode.trim();
    if (cleanCode.length !== 6) {
      setRecoverError('O código precisa ter exatamente 6 dígitos.');
      return;
    }

    const isValid = accountService.verifyPasswordResetCode(recoverEmail, cleanCode);
    if (!isValid) {
      setRecoverError('Código de recuperação inválido ou expirado. Solicite um novo código.');
      return;
    }

    setRecoverSuccess('Código confirmado com sucesso! Crie sua nova senha abaixo.');
    setRecoverStep(3);
  };

  // Redefinir Nova Senha de Acesso
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');

    if (!recoverPasswordSecurity.isValid) {
      if (recoverPasswordHasAccents) {
        setRecoverError('Não é permitido adicionar acentos ou cedilhas na senha.');
      } else {
        setRecoverError('A nova senha precisa cumprir todos os requisitos de segurança indicados.');
      }
      return;
    }

    setRecoverLoading(true);

    setTimeout(() => {
      const result = accountService.resetPasswordWithCode(
        recoverEmail,
        recoverCode,
        recoverNewPassword
      );
      setRecoverLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
        if (onClose) onClose();
      } else {
        setRecoverError(result.message);
      }
    }, 300);
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
                  className="text-[11px] font-bold text-amber-800 hover:text-amber-900 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Esqueci minha senha</span>
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
                    Tudo pronto! Vamos ativar sua loja?
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Seus dados e e-mail oficial foram validados com sucesso. Clique no botão abaixo para ir diretamente ao WhatsApp e receber a ativação imediata do seu cardápio.
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
                    onClick={() => handleFinalSubmitWhatsApp()}
                    className="w-full py-4 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2.5 transition-all shadow-lg hover:shadow-emerald-200 cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5 fill-white" />
                    <span>Ir Diretamente para o WhatsApp</span>
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

            {/* FASE 1: DIGITAR E-MAIL CADASTRADO OU ENTRAR COM GOOGLE */}
            {recoverStep === 1 && (
              <form onSubmit={handleRequestRecoveryCode} className="space-y-4 animate-in fade-in">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-950 font-display">
                    Esqueceu sua senha de acesso?
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Informe seu e-mail cadastrado. Você receberá um código de segurança de 6 dígitos.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    E-mail Cadastrado *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={recoverEmail}
                      onChange={(e) => {
                        setRecoverEmail(e.target.value);
                        setRecoverError('');
                      }}
                      placeholder="Ex: seunome@gmail.com"
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={recoverLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {recoverLoading ? (
                    <span>Enviando Código...</span>
                  ) : (
                    <>
                      <span>Enviar Código de Recuperação no E-mail</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
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

            {/* FASE 2: DIGITAR O CÓDIGO DE 6 DÍGITOS */}
            {recoverStep === 2 && (
              <form onSubmit={handleVerifyRecoveryCode} className="space-y-4 animate-in fade-in">
                <div className="space-y-1 text-center">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mx-auto mb-1">
                    <Mail className="w-5 h-5 text-amber-700" />
                  </div>
                  <h3 className="text-base font-black text-slate-950 font-display">
                    Digite o Código de 6 Dígitos
                  </h3>
                  <p className="text-xs text-slate-600">
                    Enviamos um código de verificação para o e-mail: <strong className="text-slate-900">{recoverEmail}</strong>
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wide text-center">
                    Código de Segurança (6 dígitos) *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={recoverCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setRecoverCode(val);
                      setRecoverError('');
                    }}
                    placeholder="000000"
                    className="w-full text-center py-3 bg-slate-50 border-2 border-amber-300 rounded-xl text-2xl font-mono font-black tracking-widest focus:outline-none focus:border-amber-500 focus:bg-white text-slate-950"
                  />
                  <p className="text-[11px] text-slate-400 text-center">
                    Verifique também a caixa de Spam ou Promoções do seu e-mail.
                  </p>
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
                    disabled={recoverCode.trim().length !== 6}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    <span>Verificar Código</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={handleRequestRecoveryCode}
                    disabled={recoverLoading}
                    className="text-xs font-bold text-amber-800 hover:text-amber-900 hover:underline cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${recoverLoading ? 'animate-spin' : ''}`} />
                    <span>Reenviar código por e-mail</span>
                  </button>
                </div>
              </form>
            )}

            {/* FASE 3: CRIAR NOVA SENHA DE ACESSO */}
            {recoverStep === 3 && (
              <form onSubmit={handleSaveNewPassword} className="space-y-4 animate-in fade-in">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-700 uppercase">
                      Código Validado
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-950 font-display">
                    Crie sua Nova Senha de Acesso
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina sua nova senha cumprindo todos os requisitos de segurança abaixo.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                      Nova Senha *
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
                      placeholder="Ex: NovaSenha2026@#"
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

                  {/* Checklist de Acompanhamento da Nova Senha */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <span className="text-[11px] uppercase font-bold text-slate-600 block">
                      Acompanhamento das Obrigações da Nova Senha:
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
                        <span>Caractere especial (@, #, $, etc)</span>
                      </div>

                      <div className={`flex items-center gap-2 transition-colors ${recoverPasswordSecurity.hasNoAccents ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}`}>
                        {recoverPasswordSecurity.hasNoAccents ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-red-600 stroke-[3]" />
                        )}
                        <span>Sem acentos ou cedilhas</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!recoverPasswordSecurity.isValid || recoverLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {recoverLoading ? (
                    <span>Salvando Nova Senha...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Salvar Nova Senha e Acessar Conta</span>
                    </>
                  )}
                </button>
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

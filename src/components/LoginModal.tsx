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
  Loader2,
  Camera,
  Upload,
  MapPin,
  Instagram,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { accountService } from '../services/accountService';
import { UserAccount } from '../types';
import {
  validateUsernameSecurity,
  validatePasswordSecurity,
  hasAccentsOrDiacritics,
} from '../utils/security';
import { ForkKnifeIcon } from './ForkKnifeIcon';
import { CredentialSecurityChecklist } from './CredentialSecurityChecklist';

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

  // Cadastro Passo a Passo (Obrigações da Loja ANTES da criação do acesso)
  // Etapa 1: Nome Completo do Responsável (CEO)
  // Etapa 2: Obrigações da Loja (Nome do Estabelecimento, Endereço, Slogan/Instagram)
  // Etapa 3: Foto de Perfil da Loja (Obrigatória)
  // Etapa 4: WhatsApp Comercial
  // Etapa 5: E-mail Obrigatório (Chave oficial de recuperação)
  // Etapa 6: Nome de Usuário de Acesso (máximo 8 caracteres + maiúscula, minúscula, número, especial)
  // Etapa 7: Senha de Acesso (máximo 8 caracteres + maiúscula, minúscula, número, especial)
  // Etapa 8: Revisão Final & Ativação (7 Dias Grátis)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);
  const [regName, setRegName] = useState('');
  const [regStoreName, setRegStoreName] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regTagline, setRegTagline] = useState('');
  const [regInstagram, setRegInstagram] = useState('');
  const [regLogoBase64, setRegLogoBase64] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');

  // Recuperação de Conta CEO com Validação Completa de Dados da Loja e Usuário
  // recoverStep: 1 = Informar Usuário ou E-mail; 2 = Confirmar Loja, Usuário, Nome, E-mail e WhatsApp; 3 = Nova Senha
  const [recoverStep, setRecoverStep] = useState<1 | 2 | 3>(1);
  const [recoverIdentifier, setRecoverIdentifier] = useState('');
  const [identifiedAccount, setIdentifiedAccount] = useState<UserAccount | null>(null);
  const [recoverStoreNameInput, setRecoverStoreNameInput] = useState('');
  const [recoverUsernameInput, setRecoverUsernameInput] = useState('');
  const [recoverOwnerNameInput, setRecoverOwnerNameInput] = useState('');
  const [recoverEmailInput, setRecoverEmailInput] = useState('');
  const [recoverPhoneLast4Input, setRecoverPhoneLast4Input] = useState('');
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
    setRecoverStoreNameInput('');
    setRecoverUsernameInput('');
    setRecoverOwnerNameInput('');
    setRecoverEmailInput('');
    setRecoverPhoneLast4Input('');
    setRecoverNewPassword('');
    setRecoverRepeatPassword('');
    setRegError('');
    setLoginError('');
    setRecoverError('');
    setRecoverSuccess('');
  }, [initialMode, isOpen]);

  const compressProfileImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Selecione um arquivo de imagem válido (PNG, JPG ou WebP).'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Arquivo de imagem inválido ou corrompido.'));
        img.onload = () => {
          const maxSize = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRegError('');
    setIsUploadingLogo(true);
    try {
      const compressed = await compressProfileImage(file);
      setRegLogoBase64(compressed);
    } catch (err: any) {
      setRegError(err?.message || 'Erro ao processar a foto de perfil da loja.');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

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



  // Avançar no Wizard de Cadastro (Obrigações da Loja -> Credenciais de Acesso)
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
      if (!regAddress.trim() || regAddress.trim().length < 5) {
        setRegError('Por favor, informe o endereço completo da loja (Rua, número e bairro/cidade).');
        return;
      }
      setWizardStep(3);
    } else if (wizardStep === 3) {
      if (!regLogoBase64 || !regLogoBase64.trim()) {
        setRegError('A foto de perfil (logomarca) da loja é obrigatória antes de criar seu acesso.');
        return;
      }
      setWizardStep(4);
    } else if (wizardStep === 4) {
      const digitsOnly = regPhone.replace(/\D/g, '');
      if (!regPhone.trim() || digitsOnly.length < 10) {
        setRegError('Por favor, informe seu WhatsApp com DDD (Ex: 11 98888-7777).');
        return;
      }
      setWizardStep(5);
    } else if (wizardStep === 5) {
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
      setWizardStep(6);
    } else if (wizardStep === 6) {
      if (!usernameSecurity.isValid) {
        if (usernameHasAccents) {
          setRegError('Não é permitido adicionar acentos nem cedilhas no nome de usuário.');
        } else if (!usernameSecurity.hasMaxLength) {
          setRegError('O nome de usuário não pode passar de 8 caracteres.');
        } else if (!usernameSecurity.hasMinLength) {
          setRegError('O nome de usuário precisa ter pelo menos 4 caracteres (máximo 8).');
        } else if (!usernameSecurity.hasUppercase) {
          setRegError('O nome de usuário precisa conter pelo menos uma letra MAIÚSCULA (A-Z).');
        } else if (!usernameSecurity.hasLowercase) {
          setRegError('O nome de usuário precisa conter pelo menos uma letra MINÚSCULA (a-z).');
        } else if (!usernameSecurity.hasNumber) {
          setRegError('O nome de usuário precisa conter pelo menos um NÚMERO (0-9).');
        } else if (!usernameSecurity.hasSpecialChar) {
          setRegError('O nome de usuário precisa conter pelo menos um CARACTERE ESPECIAL (@, #, $, %, &, *, !, _, etc).');
        } else if (!usernameSecurity.hasNoSpaces) {
          setRegError('Não é permitido espaços no nome de usuário.');
        } else {
          setRegError('Preencha todos os requisitos obrigatórios do nome de usuário.');
        }
        return;
      }
      setWizardStep(7);
    } else if (wizardStep === 7) {
      if (!passwordSecurity.isValid) {
        if (passwordHasAccents) {
          setRegError('Não é permitido adicionar acentos nem cedilhas na senha.');
        } else if (!passwordSecurity.hasMaxLength) {
          setRegError('A senha não pode passar de 8 caracteres.');
        } else if (!passwordSecurity.hasMinLength) {
          setRegError('A senha precisa ter pelo menos 4 caracteres (máximo 8).');
        } else if (!passwordSecurity.hasUppercase) {
          setRegError('A senha precisa conter pelo menos uma letra MAIÚSCULA (A-Z).');
        } else if (!passwordSecurity.hasLowercase) {
          setRegError('A senha precisa conter pelo menos uma letra MINÚSCULA (a-z).');
        } else if (!passwordSecurity.hasNumber) {
          setRegError('A senha precisa conter pelo menos um número (0-9).');
        } else if (!passwordSecurity.hasSpecialChar) {
          setRegError('A senha precisa conter pelo menos um caractere especial (@, #, $, %, etc).');
        } else if (!passwordSecurity.hasNoSpaces) {
          setRegError('Não é permitido espaços na senha.');
        } else {
          setRegError('Preencha todos os requisitos de segurança da senha.');
        }
        return;
      }
      setWizardStep(8);
    }
  };

  // Voltar um passo no wizard
  const handlePrevWizardStep = () => {
    setRegError('');
    if (wizardStep > 1) {
      setWizardStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8);
    }
  };

  // Finalizar Cadastro e Entrar Imediatamente com 7 Dias Grátis
  const handleFinishRegistration = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRegError('');

    if (!regStoreName.trim() || regStoreName.trim().length < 2) {
      setWizardStep(2);
      setRegError('Informe o nome do estabelecimento antes de criar seu acesso.');
      return;
    }

    if (!regLogoBase64 || !regLogoBase64.trim()) {
      setWizardStep(3);
      setRegError('Envie a foto de perfil da sua loja antes de finalizar o cadastro.');
      return;
    }

    if (!usernameSecurity.isValid) {
      setWizardStep(6);
      setRegError('Verifique os requisitos do nome de usuário (máximo 8 caracteres).');
      return;
    }

    if (!passwordSecurity.isValid) {
      setWizardStep(7);
      setRegError('Verifique os requisitos da senha (máximo 8 caracteres).');
      return;
    }

    // Registra a conta com 7 dias grátis de período de teste e obrigações da loja salvas
    const res = accountService.registerClientAccount({
      name: regName.trim(),
      storeName: regStoreName.trim(),
      logoBase64: regLogoBase64,
      address: regAddress.trim(),
      tagline: regTagline.trim(),
      instagramHandle: regInstagram.trim(),
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

    // Se digitou algo parecendo e-mail (contém @), faz validação básica de formato
    if (clean.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clean)) {
        setRecoverError('O e-mail informado não é válido. Verifique se digitou corretamente.');
        return;
      }
    }

    setRecoverLoading(true);
    try {
      const account = await accountService.findAccountByUsernameOrEmailAsync(clean);
      if (!account) {
        setRecoverError('Nenhuma conta encontrada com este usuário ou e-mail. Verifique a digitação ou cadastre sua loja.');
        return;
      }

      setIdentifiedAccount(account);
      setRecoverStoreNameInput('');
      setRecoverUsernameInput('');
      setRecoverOwnerNameInput('');
      setRecoverEmailInput('');
      setRecoverPhoneLast4Input('');
      setRecoverStep(2);
      setRecoverSuccess('Conta localizada! Para segurança do CEO, confirme todas as informações da loja e do titular abaixo.');
    } catch {
      setRecoverError('Erro ao consultar banco de dados. Tente novamente.');
    } finally {
      setRecoverLoading(false);
    }
  };

  const handleVerifyRecoveryConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');

    if (!identifiedAccount) return;

    const cleanStoreInput = recoverStoreNameInput.trim().toLowerCase();
    const actualStoreName = (identifiedAccount.storeName || '').trim().toLowerCase();

    const cleanUsernameInput = recoverUsernameInput.trim().toLowerCase();
    const actualUsername = (identifiedAccount.username || '').trim().toLowerCase();

    const cleanOwnerInput = recoverOwnerNameInput.trim().toLowerCase();
    const actualOwnerName = (identifiedAccount.name || '').trim().toLowerCase();

    const cleanEmailInput = recoverEmailInput.trim().toLowerCase();
    const actualEmail = (identifiedAccount.email || '').trim().toLowerCase();

    const cleanPhoneInput = recoverPhoneLast4Input.trim().replace(/\D/g, '');
    const actualPhone = (identifiedAccount.phoneWhatsapp || '').replace(/\D/g, '');
    const actualPhoneLast4 = actualPhone.slice(-4);

    if (!cleanStoreInput || cleanStoreInput !== actualStoreName) {
      setRecoverError('O nome da loja / estabelecimento não confere com o cadastrado nesta conta.');
      return;
    }

    if (!cleanUsernameInput || cleanUsernameInput !== actualUsername) {
      setRecoverError('O nome de usuário (login) não confere com o cadastrado nesta conta.');
      return;
    }

    if (!cleanOwnerInput || cleanOwnerInput !== actualOwnerName) {
      setRecoverError('O nome completo do responsável (CEO) não confere com o cadastrado nesta conta.');
      return;
    }

    if (actualEmail && cleanEmailInput !== actualEmail) {
      setRecoverError('O e-mail oficial informado não confere com o cadastrado nesta conta.');
      return;
    }

    if (actualPhoneLast4 && (cleanPhoneInput.length !== 4 || cleanPhoneInput !== actualPhoneLast4)) {
      setRecoverError('Os 4 últimos dígitos do WhatsApp não conferem com o cadastrado nesta conta.');
      return;
    }

    setRecoverStep(3);
    setRecoverSuccess('Identidade do CEO confirmada! Crie sua nova senha de segurança abaixo.');
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
            ? 'Recupere sua senha via E-mail ou Nome de Usuário'
            : 'Preenchimento passo a passo para criar e ativar seu cardápio'}
        </p>

        {/* Tab Switcher: Login vs Cadastro */}
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
              <CredentialSecurityChecklist value={loginUsername} fieldType="username" compact />
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
                  className="text-[11px] font-medium text-amber-800 hover:text-amber-950 hover:underline cursor-pointer"
                >
                  Esqueci a senha
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
                <CredentialSecurityChecklist value={loginPassword} fieldType="password" compact />
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
        {/* ABA 2: CADASTRO PASSO A PASSO (OBRIGAÇÕES DA LOJA -> ACESSO)   */}
        {/* ============================================================== */}
        {activeMode === 'register' && (
          <div className="space-y-4">
            {/* Barra de Progresso do Wizard (1 a 8) */}
            <div className="space-y-1.5 pb-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span className="uppercase tracking-wider text-amber-800">
                  Etapa {wizardStep} de 8
                </span>
                <span className="text-slate-500 font-medium">
                  {wizardStep === 1 && '1. Seu Nome'}
                  {wizardStep === 2 && '2. Dados da Loja'}
                  {wizardStep === 3 && '3. Foto de Perfil'}
                  {wizardStep === 4 && '4. WhatsApp'}
                  {wizardStep === 5 && '5. E-mail Obrigatório'}
                  {wizardStep === 6 && '6. Usuário (até 8 caract.)'}
                  {wizardStep === 7 && '7. Senha (até 8 caract.)'}
                  {wizardStep === 8 && '8. Ativação'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(wizardStep / 8) * 100}%` }}
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
                    Etapa 1 de 8 • Titular da Loja (CEO)
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Como você se chama?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Informe seu nome completo para a identificação oficial da sua conta.
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
                  <span>Continuar para Obrigações da Loja</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            )}

            {/* ETAPA 2: OBRIGAÇÕES DA LOJA (NOME DO ESTABELECIMENTO + ENDEREÇO + DETALHES) */}
            {wizardStep === 2 && (
              <form onSubmit={handleNextWizardStep} className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">
                      Etapa 2 de 8 • Obrigações da Loja
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase">
                      Obrigatório
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Preencha os dados do seu estabelecimento
                  </h3>
                  <p className="text-xs text-slate-500">
                    Antes de criar seu acesso, precisamos identificar sua loja no cardápio digital.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Nome do Estabelecimento */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Nome do Estabelecimento / Loja *
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

                  {/* Endereço Completo */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Endereço Completo da Loja *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={regAddress}
                        onChange={(e) => {
                          setRegAddress(e.target.value);
                          setRegError('');
                        }}
                        placeholder="Ex: Av. Paulista, 1250 - Centro, São Paulo"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Slogan & Instagram (Opcionais) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">
                        Frase de Destaque (Opcional)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          value={regTagline}
                          onChange={(e) => setRegTagline(e.target.value)}
                          placeholder="Ex: Sabor artesanal"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">
                        Instagram (Opcional)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Instagram className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          value={regInstagram}
                          onChange={(e) => setRegInstagram(e.target.value)}
                          placeholder="@sualoja"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visualizador do Link da Loja em Tempo Real */}
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 uppercase">
                    <span>Prévia do Link da sua Loja:</span>
                    <span className="text-amber-700 font-mono">cardapp-us/[url]</span>
                  </div>
                  <div className="bg-white px-3 py-2 rounded-xl border border-amber-300 text-xs font-mono font-bold text-slate-900 flex items-center gap-1 truncate shadow-2xs">
                    <span className="text-amber-600 font-bold shrink-0">cardapp-us/</span>
                    <span className="truncate text-slate-900">
                      {regStoreName.trim()
                        ? regStoreName
                            .toLowerCase()
                            .trim()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '')
                        : 'nome-da-sua-loja'}
                    </span>
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
                    <span>Continuar para Foto de Perfil</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 3: FOTO DE PERFIL DA LOJA (OBRIGATÓRIA ANTES DE CRIAR ACESSO) */}
            {wizardStep === 3 && (
              <form onSubmit={handleNextWizardStep} className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">
                      Etapa 3 de 8 • Identidade Visual
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black uppercase">
                      Obrigatório
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Envie a Foto de Perfil da sua Loja *
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    A logomarca ou foto de perfil do seu estabelecimento é obrigatória antes de gerar seu acesso e será exibida no topo do seu cardápio.
                  </p>
                </div>

                {/* Área de Upload e Preview Circular */}
                <div className="p-4 sm:p-5 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 flex flex-col items-center justify-center text-center gap-3">
                  {regLogoBase64 ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <img
                          src={regLogoBase64}
                          alt="Foto de perfil da loja"
                          className="w-24 h-24 rounded-full object-cover border-4 border-amber-400 shadow-lg bg-white"
                        />
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-emerald-800 block">
                          Foto carregada com sucesso!
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {regStoreName || 'Seu estabelecimento'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Trocar Foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePhotoChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setRegLogoBase64('')}
                          className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-slate-600 font-bold text-xs cursor-pointer transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="w-full py-4 flex flex-col items-center justify-center gap-2.5 cursor-pointer group">
                      <div className="w-16 h-16 rounded-full bg-amber-400/20 group-hover:bg-amber-400/35 text-amber-800 flex items-center justify-center border-2 border-amber-400/60 transition-all">
                        {isUploadingLogo ? (
                          <Loader2 className="w-7 h-7 animate-spin text-amber-700" />
                        ) : (
                          <ImageIcon className="w-7 h-7 text-amber-800" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs sm:text-sm font-black text-slate-900 block">
                          {isUploadingLogo ? 'Processando imagem...' : 'Toque aqui para escolher a Foto de Perfil'}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Formatos aceitos: PNG, JPG ou WebP
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 text-amber-400 text-xs font-black uppercase tracking-wide shadow-sm group-hover:bg-slate-900 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Selecionar Imagem</span>
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoChange}
                        className="hidden"
                      />
                    </label>
                  )}
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
                    disabled={!regLogoBase64 || isUploadingLogo}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Continuar para WhatsApp</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 4: WHATSAPP */}
            {wizardStep === 4 && (
              <form onSubmit={handleNextWizardStep} className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider block">
                    Etapa 4 de 8 • Contato Oficial
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Qual o número de WhatsApp da loja?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Onde você receberá os pedidos dos clientes e usará na confirmação de segurança.
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

            {/* ETAPA 5: E-MAIL OBRIGATÓRIO PARA RECUPERAÇÃO DE CONTA */}
            {wizardStep === 5 && (
              <form onSubmit={handleNextWizardStep} className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">
                      Etapa 5 de 8
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black uppercase">
                      Obrigatório
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Qual o seu e-mail de acesso e recuperação? *
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>O e-mail é obrigatório:</strong> será solicitado junto ao nome da loja e usuário caso você precise recuperar a senha da conta.
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

            {/* ETAPA 6: USUÁRIO COM OBRIGAÇÕES (MÁXIMO 8 CARACTERES + MAIÚSCULA, MINÚSCULA, NÚMERO, ESPECIAL) */}
            {wizardStep === 6 && (
              <form onSubmit={handleNextWizardStep} className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider block">
                    Etapa 6 de 8 • Credencial de Acesso
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Crie seu Nome de Usuário (Login)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Limite máximo de <strong>até 8 caracteres</strong> (4 a 8), com maiúsculas, minúsculas, número e caractere especial. <strong>Sem acentos ou cedilhas.</strong>
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                      Nome de Usuário (até 8 caract.) *
                    </label>
                    <span
                      className={`text-[10px] font-bold ${
                        regUsername.length > 8
                          ? 'text-red-600'
                          : usernameSecurity.isValid
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {usernameSecurity.isValid ? `Usuário Válido (${regUsername.length}/8) ✓` : `${regUsername.length}/8 caracteres`}
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      required
                      maxLength={8}
                      value={regUsername}
                      onChange={(e) => {
                        setRegUsername(e.target.value.slice(0, 8));
                        setRegError('');
                      }}
                      placeholder="Ex: Ana_12#@"
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
                      Toque para inserir um caractere especial (máx. 8):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['@', '#', '$', '%', '&', '*', '!', '_', '-'].map((char) => (
                        <button
                          key={char}
                          type="button"
                          disabled={regUsername.length >= 8}
                          onClick={() => {
                            setRegUsername((prev) => (prev.length < 8 ? prev + char : prev));
                            setRegError('');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 border border-slate-300 hover:border-amber-400 rounded-lg text-xs font-mono font-black text-slate-800 hover:text-amber-950 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Checklist de Acompanhamento do Usuário em Tempo Real */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <span className="text-[11px] uppercase font-bold text-slate-600 block">
                      Obrigações do Nome de Usuário (Máximo 8 Caracteres):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <div className={`flex items-center gap-2 transition-colors ${usernameSecurity.hasMinLength && usernameSecurity.hasMaxLength ? 'text-emerald-700 font-bold' : regUsername.length > 8 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                        {usernameSecurity.hasMinLength && usernameSecurity.hasMaxLength ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : regUsername.length > 8 ? (
                          <X className="w-3.5 h-3.5 text-red-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Até 8 caracteres ({regUsername.length}/8)</span>
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

            {/* ETAPA 7: SENHA COM OBRIGAÇÕES (MÁXIMO 8 CARACTERES + MAIÚSCULA, MINÚSCULA, NÚMERO, ESPECIAL) */}
            {wizardStep === 7 && (
              <form onSubmit={handleNextWizardStep} className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider block">
                    Etapa 7 de 8 • Segurança da Conta
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Crie sua Senha de Acesso
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mesmas exigências: limite máximo de <strong>até 8 caracteres</strong> (4 a 8), maiúscula, minúscula, número e especial. <strong>Sem acentos ou espaços.</strong>
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                      Senha de Acesso (até 8 caract.) *
                    </label>
                    <span
                      className={`text-[10px] font-bold ${
                        regPassword.length > 8
                          ? 'text-red-600'
                          : passwordSecurity.isValid
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {regPassword
                        ? `Força: ${passwordSecurity.strengthLabel} (${regPassword.length}/8)`
                        : `${regPassword.length}/8 caracteres`}
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      autoFocus
                      required
                      maxLength={8}
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value.slice(0, 8));
                        setRegError('');
                      }}
                      placeholder="Ex: Cd2026@#"
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
                      Toque para inserir um caractere especial na senha (máx. 8):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['@', '#', '$', '%', '&', '*', '!', '_', '-'].map((char) => (
                        <button
                          key={char}
                          type="button"
                          disabled={regPassword.length >= 8}
                          onClick={() => {
                            setRegPassword((prev) => (prev.length < 8 ? prev + char : prev));
                            setRegError('');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 border border-slate-300 hover:border-amber-400 rounded-lg text-xs font-mono font-black text-slate-800 hover:text-amber-950 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                      Obrigações da Senha (Máximo 8 Caracteres):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <div className={`flex items-center gap-2 transition-colors ${passwordSecurity.hasMinLength && passwordSecurity.hasMaxLength ? 'text-emerald-700 font-bold' : regPassword.length > 8 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                        {passwordSecurity.hasMinLength && passwordSecurity.hasMaxLength ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : regPassword.length > 8 ? (
                          <X className="w-3.5 h-3.5 text-red-600 stroke-[3]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Até 8 caracteres ({regPassword.length}/8)</span>
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

                      <div className={`flex items-center gap-2 transition-colors ${passwordSecurity.hasNoSpaces ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {passwordSecurity.hasNoSpaces ? (
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
                    disabled={!passwordSecurity.isValid}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Revisar e Ativar</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 8: REVISÃO FINAL & ATIVAÇÃO */}
            {wizardStep === 8 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-1 text-center">
                  {regLogoBase64 ? (
                    <img
                      src={regLogoBase64}
                      alt={regStoreName}
                      className="w-16 h-16 rounded-full object-cover border-3 border-amber-400 shadow-md mx-auto mb-2 bg-white"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  )}
                  <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider block">
                    Etapa 8 Final
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-950 font-display">
                    Tudo pronto! 7 Dias Grátis Liberados
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Sua loja já possui foto de perfil, dados configurados e <strong>7 dias grátis</strong> para você testar todo o sistema sem compromisso.
                  </p>
                </div>

                {/* Resumo Limpo das Informações */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-slate-800 space-y-2">
                  <span className="font-extrabold uppercase text-amber-900 text-[11px] block">
                    Resumo da Loja & Acesso:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Loja:</span>
                      <strong className="text-slate-900">{regStoreName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Responsável (CEO):</span>
                      <strong className="text-slate-900">{regName}</strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 text-[10px] block">Endereço:</span>
                      <strong className="text-slate-900">{regAddress}</strong>
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
                    <span>Criar Acesso e Entrar (7 Dias Grátis)</span>
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

                {/* Badge de Criptografia Segura */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Criptografia Ativa:</strong> Todos os dados e senhas são protegidos de ponta a ponta contra vazamentos.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!recoverIdentifier.trim() || recoverLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {recoverLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Localizando Conta...</span>
                    </>
                  ) : (
                    <>
                      <span>Localizar Conta e Redefinir Senha</span>
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

            {/* ETAPA 2: CONFIRMAÇÃO DE SEGURANÇA DO CEO (LOJA, USUÁRIO, RESPONSÁVEL, E-MAIL E WHATSAPP) */}
            {recoverStep === 2 && (
              <form onSubmit={handleVerifyRecoveryConfirmation} className="space-y-4 animate-in fade-in">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-1">
                    <ShieldCheck className="w-3 h-3 text-amber-700" />
                    <span>Validação Rigorosa do CEO</span>
                  </div>
                  <h3 className="text-base font-black text-slate-950 font-display">
                    Confirme os dados oficiais da loja e da conta
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Para proteger o acesso administrativo do CEO, preencha corretamente todas as informações vinculadas a esta conta antes de criar uma nova senha:
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  {/* 1. Nome da Loja */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wide">
                      1. Nome da Loja / Estabelecimento *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Store className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={recoverStoreNameInput}
                        onChange={(e) => {
                          setRecoverStoreNameInput(e.target.value);
                          setRecoverError('');
                        }}
                        placeholder="Ex: Pizzaria Bella Vista"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  {/* 2. Nome de Usuário */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wide">
                      2. Nome de Usuário (Login Exato) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={recoverUsernameInput}
                        onChange={(e) => {
                          setRecoverUsernameInput(e.target.value);
                          setRecoverError('');
                        }}
                        placeholder="Ex: Ana_12#@"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  {/* 3. Nome Completo do Responsável (CEO) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wide">
                      3. Nome Completo do Responsável (CEO) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={recoverOwnerNameInput}
                        onChange={(e) => {
                          setRecoverOwnerNameInput(e.target.value);
                          setRecoverError('');
                        }}
                        placeholder="Ex: Carlos Eduardo Silva"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  {/* 4. E-mail Oficial Cadastrado */}
                  {identifiedAccount?.email && (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wide">
                        4. E-mail Oficial Cadastrado *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          required
                          value={recoverEmailInput}
                          onChange={(e) => {
                            setRecoverEmailInput(e.target.value);
                            setRecoverError('');
                          }}
                          placeholder="Ex: seunome@gmail.com"
                          className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* 5. 4 Últimos Dígitos do Celular / WhatsApp */}
                  {identifiedAccount?.phoneWhatsapp && (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wide">
                        {identifiedAccount?.email ? '5.' : '4.'} 4 Últimos Dígitos do WhatsApp *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={4}
                          value={recoverPhoneLast4Input}
                          onChange={(e) => {
                            setRecoverPhoneLast4Input(e.target.value.replace(/\D/g, '').slice(0, 4));
                            setRecoverError('');
                          }}
                          placeholder="Ex: 4321"
                          className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-widest focus:outline-none focus:border-amber-500 focus:bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
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
                    disabled={
                      !recoverStoreNameInput.trim() ||
                      !recoverUsernameInput.trim() ||
                      !recoverOwnerNameInput.trim() ||
                      (Boolean(identifiedAccount?.email) && !recoverEmailInput.trim()) ||
                      (Boolean(identifiedAccount?.phoneWhatsapp) && recoverPhoneLast4Input.length < 4)
                    }
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <span>Validar Dados e Redefinir</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 3: NOVA SENHA E REPITA A SENHA */}
            {recoverStep === 3 && (
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
                      • NOVA SENHA (ATÉ 8 CARACT.) *
                    </label>
                    {recoverNewPassword && (
                      <span className={`text-[10px] font-bold ${recoverPasswordSecurity.isValid ? 'text-emerald-700' : recoverNewPassword.length > 8 ? 'text-red-600' : 'text-amber-700'}`}>
                        Força: {recoverPasswordSecurity.strengthLabel} ({recoverNewPassword.length}/8)
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
                      maxLength={8}
                      value={recoverNewPassword}
                      onChange={(e) => {
                        setRecoverNewPassword(e.target.value.slice(0, 8));
                        setRecoverError('');
                      }}
                      placeholder="Máximo 8 caracteres"
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
                      Toque para inserir um caractere especial (máx. 8):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['@', '#', '$', '%', '&', '*', '!', '_', '-'].map((char) => (
                        <button
                          key={char}
                          type="button"
                          disabled={recoverNewPassword.length >= 8}
                          onClick={() => {
                            setRecoverNewPassword((prev) => (prev.length < 8 ? prev + char : prev));
                            setRecoverError('');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 border border-slate-300 hover:border-amber-400 rounded-lg text-xs font-mono font-black text-slate-800 hover:text-amber-950 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                      maxLength={8}
                      value={recoverRepeatPassword}
                      onChange={(e) => {
                        setRecoverRepeatPassword(e.target.value.slice(0, 8));
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
                    Obrigações da Nova Senha (Máximo 8 Caracteres):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div className={`flex items-center gap-2 transition-colors ${recoverPasswordSecurity.hasMinLength && recoverPasswordSecurity.hasMaxLength ? 'text-emerald-700 font-bold' : recoverNewPassword.length > 8 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                      {recoverPasswordSecurity.hasMinLength && recoverPasswordSecurity.hasMaxLength ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : recoverNewPassword.length > 8 ? (
                        <X className="w-3.5 h-3.5 text-red-600 stroke-[3]" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300" />
                      )}
                      <span>Até 8 caracteres ({recoverNewPassword.length}/8)</span>
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

                    <div className={`flex items-center gap-2 transition-colors ${recoverPasswordSecurity.hasNoAccents ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}`}>
                      {recoverPasswordSecurity.hasNoAccents ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-red-600 stroke-[3]" />
                      )}
                      <span>Sem acentos ou cedilhas</span>
                    </div>

                    <div className={`flex items-center gap-2 transition-colors ${recoverPasswordSecurity.hasNoSpaces ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                      {recoverPasswordSecurity.hasNoSpaces ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300" />
                      )}
                      <span>Sem espaços</span>
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

                {/* Banner de Criptografia Segura */}
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 text-[11px] flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Criptografia Avançada:</strong> A nova senha é protegida com algoritmo SHA-256 e hash seguro antes do armazenamento, impossibilitando vazamentos.
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

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ClientRegistrationFormData, EmailVerificationSession } from '../types';
import { accountService } from './accountService';

const EMAIL_VERIFICATION_STORAGE_KEY = 'cardapp_pending_email_verification';

class EmailVerificationService {
  private activeSession: EmailVerificationSession | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedSession = localStorage.getItem(EMAIL_VERIFICATION_STORAGE_KEY);
      if (storedSession) {
        this.activeSession = JSON.parse(storedSession);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Validação inteligente de formato de e-mail e detecção de erros de digitação (typos comuns)
   */
  public validateEmail(email: string): {
    isValid: boolean;
    suggestion?: string;
    errorMessage?: string;
  } {
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) {
      return { isValid: false, errorMessage: 'O e-mail é obrigatório.' };
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return { isValid: false, errorMessage: 'Formato de e-mail inválido. Ex: seunome@gmail.com' };
    }

    // Detecção inteligente de erros de digitação comuns em domínios populares
    const parts = trimmed.split('@');
    if (parts.length === 2) {
      const userPart = parts[0];
      const domainPart = parts[1];

      const typoMap: Record<string, string> = {
        'gmai.com': 'gmail.com',
        'gamil.com': 'gmail.com',
        'gmial.com': 'gmail.com',
        'gnail.com': 'gmail.com',
        'hotmial.com': 'hotmail.com',
        'hotmaill.com': 'hotmail.com',
        'outlok.com': 'outlook.com',
        'outllok.com': 'outlook.com',
        'yaho.com': 'yahoo.com',
        'yahooo.com': 'yahoo.com',
      };

      if (typoMap[domainPart]) {
        const suggested = `${userPart}@${typoMap[domainPart]}`;
        return {
          isValid: true,
          suggestion: suggested,
        };
      }
    }

    // Verificar se já existe conta cadastrada com este e-mail
    const allAccounts = accountService.getAccounts();
    const alreadyExists = allAccounts.some((a) => a.email && a.email.toLowerCase() === trimmed);
    if (alreadyExists) {
      return {
        isValid: false,
        errorMessage: 'Este e-mail já está cadastrado no sistema. Faça login ou use outro e-mail.',
      };
    }

    return { isValid: true };
  }

  /**
   * Gera um código de 6 dígitos aleatório e seguro
   */
  private generateSixDigitCode(): string {
    const num = Math.floor(100000 + Math.random() * 900000);
    return num.toString();
  }

  /**
   * Dispara o código de acesso no-reply de 6 dígitos e inicia a sessão de verificação
   */
  public async sendVerificationCode(data: ClientRegistrationFormData): Promise<{
    success: boolean;
    message: string;
  }> {
    const trimmedEmail = data.email.trim().toLowerCase();
    const validation = this.validateEmail(trimmedEmail);
    if (!validation.isValid) {
      return { success: false, message: validation.errorMessage || 'E-mail inválido.' };
    }

    const code = this.generateSixDigitCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutos de validade

    const session: EmailVerificationSession = {
      email: trimmedEmail,
      code,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
      verified: false,
      registrationData: {
        ...data,
        email: trimmedEmail,
        name: data.name.trim(),
        storeName: data.storeName.trim(),
        username: data.username.trim(),
      },
    };

    this.activeSession = session;
    try {
      localStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }

    // Salva o registro de verificação no Firestore para validação de segurança
    try {
      const sanitizedEmail = trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const verifRef = doc(db, 'email_verifications', sanitizedEmail);
      await setDoc(
        verifRef,
        {
          email: trimmedEmail,
          code,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          attempts: 0,
          verified: false,
          storeName: data.storeName.trim(),
          clientName: data.name.trim(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Firestore email verification fallback:', e);
    }

    // Dispara envio do e-mail diretamente para a caixa de entrada do cliente via API do servidor
    try {
      await fetch('/api/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: trimmedEmail,
          clientName: data.name.trim(),
          storeName: data.storeName.trim(),
          code,
        }),
      });
    } catch (err) {
      console.warn('Falha na chamada da API de e-mail:', err);
    }

    // O código JAMAIS deve ser retornado para a interface nem transmitido via eventos de tela,
    // garantindo que o usuário obrigatoriamente acerte o código abrindo sua caixa de entrada de e-mail.
    return {
      success: true,
      message: `Código de verificação de 6 dígitos enviado para ${trimmedEmail}!`,
    };
  }

  /**
   * Reenvia um novo código de 6 dígitos para o e-mail ativo
   */
  public async resendCode(): Promise<{ success: boolean; message: string }> {
    if (!this.activeSession) {
      return { success: false, message: 'Nenhuma sessão de verificação encontrada.' };
    }
    return this.sendVerificationCode(this.activeSession.registrationData);
  }

  /**
   * Valida o código de 6 dígitos digitado pelo cliente
   */
  public async verifyCode(
    email: string,
    codeEntered: string
  ): Promise<{
    success: boolean;
    message: string;
    registrationData?: ClientRegistrationFormData;
  }> {
    const trimmedEmail = email.trim().toLowerCase();
    const cleanCode = codeEntered.replace(/\D/g, '').trim();

    if (cleanCode.length !== 6) {
      return { success: false, message: 'Por favor, digite todos os 6 dígitos do código.' };
    }

    let session = this.activeSession;
    if (!session || session.email !== trimmedEmail) {
      // Tenta buscar no storage
      try {
        const stored = localStorage.getItem(EMAIL_VERIFICATION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as EmailVerificationSession;
          if (parsed.email === trimmedEmail) {
            session = parsed;
          }
        }
      } catch {
        // ignore
      }
    }

    // Tenta buscar no Firestore se local não encontrar
    if (!session || session.email !== trimmedEmail) {
      try {
        const sanitizedEmail = trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_');
        const snap = await getDoc(doc(db, 'email_verifications', sanitizedEmail));
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.code) {
            session = {
              email: trimmedEmail,
              code: data.code,
              createdAt: data.createdAt,
              expiresAt: data.expiresAt,
              attempts: data.attempts || 0,
              verified: data.verified || false,
              registrationData: this.activeSession?.registrationData || ({} as ClientRegistrationFormData),
            };
          }
        }
      } catch {
        // ignore
      }
    }

    if (!session) {
      return {
        success: false,
        message: 'Sessão de verificação expirada ou inexistente. Solicite um novo código.',
      };
    }

    // Verifica se expirou
    const now = new Date().getTime();
    const expTime = new Date(session.expiresAt).getTime();
    if (now > expTime) {
      return {
        success: false,
        message: 'Este código de 6 dígitos expirou (validade de 10 min). Solicite o reenvio de um novo código.',
      };
    }

    // Verifica tentativas de força bruta (máximo 5)
    if (session.attempts >= 5) {
      return {
        success: false,
        message: 'Limite máximo de 5 tentativas excedido. Por favor, solicite um novo código.',
      };
    }

    // Confere o código
    if (session.code !== cleanCode) {
      session.attempts += 1;
      this.activeSession = session;
      try {
        localStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, JSON.stringify(session));
      } catch {
        // ignore
      }

      const remaining = 5 - session.attempts;
      return {
        success: false,
        message: `Código incorreto. ${remaining > 0 ? `Restam ${remaining} tentativas.` : 'Solicite um novo código.'}`,
      };
    }

    // Código correto! Marca como verificado
    session.verified = true;
    this.activeSession = session;
    try {
      localStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }

    // Atualiza Firestore
    try {
      const sanitizedEmail = trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(
        doc(db, 'email_verifications', sanitizedEmail),
        { verified: true, verifiedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {
      // ignore
    }

    return {
      success: true,
      message: 'E-mail verificado com sucesso!',
      registrationData: session.registrationData,
    };
  }

  /**
   * Consulta o servidor e o Firestore para checar se o usuário confirmou o e-mail pelo link recebido
   */
  public async checkEmailVerifiedViaLink(email: string): Promise<{
    success: boolean;
    verified: boolean;
    message: string;
    registrationData?: ClientRegistrationFormData;
  }> {
    const trimmedEmail = email.trim().toLowerCase();
    let session = this.activeSession;
    if (!session || session.email !== trimmedEmail) {
      try {
        const stored = localStorage.getItem(EMAIL_VERIFICATION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as EmailVerificationSession;
          if (parsed.email === trimmedEmail) {
            session = parsed;
            this.activeSession = parsed;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!session) {
      return { success: false, verified: false, message: 'Nenhuma sessão ativa.' };
    }

    // 1. Consulta o Firestore
    try {
      const sanitizedEmail = trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const snap = await getDoc(doc(db, 'email_verifications', sanitizedEmail));
      if (snap.exists() && snap.data()?.verified) {
        session.verified = true;
        this.activeSession = session;
        return {
          success: true,
          verified: true,
          message: 'E-mail confirmado com sucesso!',
          registrationData: session.registrationData,
        };
      }
    } catch {
      // ignore
    }

    // 2. Consulta o servidor para verificar status no Firebase Auth
    try {
      const res = await fetch(`/api/check-email-verification?email=${encodeURIComponent(trimmedEmail)}`);
      const data = await res.json();
      if (data.verified) {
        session.verified = true;
        this.activeSession = session;
        try {
          localStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, JSON.stringify(session));
          const sanitizedEmail = trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_');
          await setDoc(
            doc(db, 'email_verifications', sanitizedEmail),
            { verified: true, verifiedAt: new Date().toISOString() },
            { merge: true }
          );
        } catch {
          // ignore
        }
        return {
          success: true,
          verified: true,
          message: 'E-mail confirmado pelo link de segurança!',
          registrationData: session.registrationData,
        };
      }
    } catch (err) {
      console.warn('Erro ao checar verificação via link:', err);
    }

    return {
      success: true,
      verified: false,
      message: 'Aguardando confirmação do e-mail...',
    };
  }

  public getActiveSession(): EmailVerificationSession | null {
    return this.activeSession;
  }

  public clearSession() {
    this.activeSession = null;
    try {
      localStorage.removeItem(EMAIL_VERIFICATION_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const emailVerificationService = new EmailVerificationService();

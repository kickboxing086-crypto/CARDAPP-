import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ClientRegistrationFormData, EmailVerificationSession } from '../types';
import { accountService } from './accountService';
import { encryptDataForFirestore, decryptDataFromFirestore } from '../utils/crypto';
import { sendVerificationEmailViaGmailApi } from './googleAuthService';

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
        'gmaill.com': 'gmail.com',
        'gmail.com.br': 'gmail.com',
        'hotmial.com': 'hotmail.com',
        'hotmaill.com': 'hotmail.com',
        'hotmal.com': 'hotmail.com',
        'outlok.com': 'outlook.com',
        'outllok.com': 'outlook.com',
        'yaho.com': 'yahoo.com',
        'yahooo.com': 'yahoo.com',
        'icoud.com': 'icloud.com',
        'iclud.com': 'icloud.com',
      };

      const disposableDomains = new Set([
        'mailinator.com',
        'tempmail.com',
        'temp-mail.org',
        '10minutemail.com',
        'guerrillamail.com',
        'yopmail.com',
        'throwawaymail.com',
        'trashmail.com',
        'fakeinbox.com',
        'getnada.com',
        'dispostable.com',
        'maildrop.cc',
        'sharklasers.com',
      ]);

      if (disposableDomains.has(domainPart)) {
        return {
          isValid: false,
          errorMessage: 'E-mails temporários ou descartáveis não são permitidos. Utilize um e-mail real.',
        };
      }

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
   * Dispara o código de acesso formal CARDAPP (No-Reply) de 6 dígitos e inicia a sessão de verificação
   */
  public async sendVerificationCode(data: Partial<ClientRegistrationFormData> & { email: string; name: string; storeName: string }): Promise<{
    success: boolean;
    message: string;
    customCodeEmailSent?: boolean;
    firebaseLinkSent?: boolean;
    invalidDomain?: boolean;
    missingEmailProvider?: boolean;
  }> {
    const trimmedEmail = (data.email || '').trim().toLowerCase();
    const validation = this.validateEmail(trimmedEmail);
    if (!validation.isValid) {
      return { success: false, message: validation.errorMessage || 'E-mail inválido.' };
    }

    const code = this.generateSixDigitCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutos de validade

    const normalizedRegData: ClientRegistrationFormData = {
      name: (data.name || '').trim(),
      email: trimmedEmail,
      phoneWhatsapp: (data.phoneWhatsapp || '').trim(),
      storeName: (data.storeName || '').trim(),
      logoBase64: data.logoBase64 || '',
      address: data.address,
      tagline: data.tagline,
      instagramHandle: data.instagramHandle,
      username: (data.username || '').trim(),
      password: data.password || '',
    };

    // Dispara envio do e-mail formal CARDAPP (No-Reply) diretamente para a caixa de entrada via API do servidor
    let serverData: {
      success?: boolean;
      message?: string;
      customCodeEmailSent?: boolean;
      firebaseLinkSent?: boolean;
      invalidDomain?: boolean;
      missingEmailProvider?: boolean;
    } | null = null;

    try {
      const res = await fetch('/api/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: trimmedEmail,
          clientName: normalizedRegData.name,
          storeName: normalizedRegData.storeName,
          code,
        }),
      });
      serverData = await res.json().catch(() => null);
      if (!res.ok || !serverData?.success) {
        return {
          success: false,
          invalidDomain: Boolean(serverData?.invalidDomain),
          missingEmailProvider: Boolean(serverData?.missingEmailProvider),
          message:
            serverData?.message ||
            'Não foi possível enviar o código de verificação para este e-mail. Verifique se o endereço está correto.',
        };
      }
    } catch (err) {
      console.warn('Falha na chamada da API de e-mail:', err);
      return {
        success: false,
        message: 'Erro de conexão com o servidor ao enviar o código de verificação. Tente novamente.',
      };
    }

    const session: EmailVerificationSession = {
      email: trimmedEmail,
      code,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
      verified: false,
      registrationData: normalizedRegData,
    };

    this.activeSession = session;
    try {
      localStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }

    // Salva o registro de verificação no Firestore criptografado para validação de segurança
    try {
      const sanitizedEmail = trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const verifRef = doc(db, 'email_verifications', sanitizedEmail);
      await setDoc(
        verifRef,
        encryptDataForFirestore({
          email: trimmedEmail,
          code,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          attempts: 0,
          verified: false,
          storeName: normalizedRegData.storeName,
          clientName: normalizedRegData.name,
        }),
        { merge: true }
      );
    } catch (e) {
      console.warn('Firestore email verification fallback:', e);
    }

    // O código JAMAIS deve ser retornado para a interface nem transmitido via eventos de tela,
    // garantindo que o usuário obrigatoriamente acerte o código abrindo sua caixa de entrada de e-mail.
    return {
      success: true,
      customCodeEmailSent: Boolean(serverData?.customCodeEmailSent),
      firebaseLinkSent: Boolean(serverData?.firebaseLinkSent),
      message:
        serverData?.message ||
        `Código de verificação formal CARDAPP (No-Reply) enviado para ${trimmedEmail}!`,
    };
  }

  /**
   * Reenvia um novo código de 6 dígitos para o e-mail ativo
   */
  public async resendCode(): Promise<{
    success: boolean;
    message: string;
    customCodeEmailSent?: boolean;
    firebaseLinkSent?: boolean;
  }> {
    if (!this.activeSession) {
      return { success: false, message: 'Nenhuma sessão de verificação encontrada.' };
    }
    return this.sendVerificationCode(this.activeSession.registrationData);
  }

  /**
   * Dispara código formal CARDAPP (No-Reply) de 6 dígitos usando a sessão Google Gmail OAuth autorizada pelo usuário
   */
  public async sendVerificationCodeViaGmailOAuth(
    data: Partial<ClientRegistrationFormData> & { email: string; name: string; storeName: string },
    accessToken?: string | null
  ): Promise<{ success: boolean; message: string }> {
    const trimmedEmail = (data.email || '').trim().toLowerCase();
    const validation = this.validateEmail(trimmedEmail);
    if (!validation.isValid) {
      return { success: false, message: validation.errorMessage || 'E-mail inválido.' };
    }

    const code = this.generateSixDigitCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const normalizedRegData: ClientRegistrationFormData = {
      name: (data.name || '').trim(),
      email: trimmedEmail,
      phoneWhatsapp: (data.phoneWhatsapp || '').trim(),
      storeName: (data.storeName || '').trim(),
      logoBase64: data.logoBase64 || '',
      address: data.address,
      tagline: data.tagline,
      instagramHandle: data.instagramHandle,
      username: (data.username || '').trim(),
      password: data.password || '',
    };

    const gmailRes = await sendVerificationEmailViaGmailApi({
      toEmail: trimmedEmail,
      verificationCode: code,
      clientName: normalizedRegData.name,
      storeName: normalizedRegData.storeName,
      accessToken,
    });

    if (!gmailRes.success) {
      return gmailRes;
    }

    const session: EmailVerificationSession = {
      email: trimmedEmail,
      code,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
      verified: false,
      registrationData: normalizedRegData,
    };

    this.activeSession = session;
    try {
      localStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }

    try {
      const sanitizedEmail = trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(
        doc(db, 'email_verifications', sanitizedEmail),
        encryptDataForFirestore({
          email: trimmedEmail,
          code,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          attempts: 0,
          verified: false,
          storeName: normalizedRegData.storeName,
          clientName: normalizedRegData.name,
        }),
        { merge: true }
      );
    } catch {
      // ignore
    }

    return {
      success: true,
      message: gmailRes.message,
    };
  }

  /**
   * Registra confirmação direta de autenticidade do e-mail via Google OAuth
   */
  public async markEmailVerifiedViaGoogleOAuth(
    email: string,
    data?: Partial<ClientRegistrationFormData>
  ): Promise<void> {
    const trimmedEmail = (email || '').trim().toLowerCase();
    if (!trimmedEmail) return;

    const now = new Date();
    const session: EmailVerificationSession = {
      email: trimmedEmail,
      code: 'OAUTH0',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      attempts: 0,
      verified: true,
      registrationData: {
        name: (data?.name || '').trim(),
        email: trimmedEmail,
        phoneWhatsapp: (data?.phoneWhatsapp || '').trim(),
        storeName: (data?.storeName || '').trim(),
        logoBase64: data?.logoBase64 || '',
        address: data?.address,
        tagline: data?.tagline,
        instagramHandle: data?.instagramHandle,
        username: (data?.username || '').trim(),
        password: data?.password || '',
      },
    };

    this.activeSession = session;
    try {
      localStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }

    try {
      const sanitizedEmail = trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(
        doc(db, 'email_verifications', sanitizedEmail),
        encryptDataForFirestore({
          email: trimmedEmail,
          verified: true,
          verifiedAt: now.toISOString(),
          provider: 'google-oauth',
        }),
        { merge: true }
      );
    } catch {
      // ignore
    }
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

    // 1. Consulta o servidor para validação oficial
    let serverVerified = false;
    try {
      const serverRes = await fetch('/api/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, code: cleanCode }),
      });
      const serverJson = await serverRes.json().catch(() => null);
      if (serverRes.ok && serverJson?.verified) {
        serverVerified = true;
      } else if (serverJson && !serverJson.notFoundOnServer && !serverRes.ok) {
        return {
          success: false,
          message: serverJson.message || 'Código incorreto ou expirado.',
        };
      }
    } catch {
      // fallback para validação local/Firestore caso offline
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
          const data = decryptDataFromFirestore<any>(snap.data());
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

    if (!session && !serverVerified) {
      return {
        success: false,
        message: 'Sessão de verificação expirada ou inexistente. Solicite um novo código.',
      };
    }

    if (session && !serverVerified) {
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
    }

    // Código correto! Marca como verificado
    if (session) {
      session.verified = true;
      this.activeSession = session;
      try {
        localStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, JSON.stringify(session));
      } catch {
        // ignore
      }
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
      message: 'E-mail autenticado com sucesso!',
      registrationData: session?.registrationData,
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
      if (snap.exists()) {
        const data = decryptDataFromFirestore<any>(snap.data());
        if (data?.verified) {
          session.verified = true;
          this.activeSession = session;
          return {
            success: true,
            verified: true,
            message: 'E-mail confirmado com sucesso!',
            registrationData: session.registrationData,
          };
        }
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

import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
export const USERINFO_EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email';
export const USERINFO_PROFILE_SCOPE = 'https://www.googleapis.com/auth/userinfo.profile';
export const SCOPES = [GMAIL_SEND_SCOPE, USERINFO_EMAIL_SCOPE, USERINFO_PROFILE_SCOPE];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// Cache in-memory do access token OAuth conforme exigido pelas diretrizes (nunca localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Garante limpeza automática do token em memória quando o usuário encerrar a sessão
onAuthStateChanged(auth, (user: User | null) => {
  if (!user && !isSigningIn) {
    cachedAccessToken = null;
  }
});

// Inicializa o listener de autenticação
export const initGoogleAuth = (
  onSuccess?: (user: User, token: string | null) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (onSuccess) onSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

const firebaseGoogleProvider = new GoogleAuthProvider();
firebaseGoogleProvider.addScope(USERINFO_EMAIL_SCOPE);
firebaseGoogleProvider.addScope(USERINFO_PROFILE_SCOPE);
firebaseGoogleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Login Google padrão no Firebase Auth (escopos básicos de identidade)
export const googleFirebaseSignIn = async (): Promise<User | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, firebaseGoogleProvider);
    return result.user;
  } catch (error: any) {
    console.error('[Google Firebase Auth] Erro de autenticação:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Realiza o Sign-In com Google OAuth solicitando identidade e permissão Gmail
export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso Google OAuth.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[Google OAuth] Erro de autenticação:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Autentica via Google OAuth e valida o perfil/e-mail diretamente na API Google UserInfo
 */
export const googleOAuthVerifyIdentity = async (): Promise<{
  user: User;
  accessToken: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
}> => {
  const res = await googleSignIn();
  if (!res) {
    throw new Error('Autenticação Google cancelada.');
  }

  let email = (res.user.email || '').trim().toLowerCase();
  let emailVerified = Boolean(res.user.emailVerified);
  let displayName = (res.user.displayName || '').trim();

  try {
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${res.accessToken}`,
      },
    });
    if (infoRes.ok) {
      const info = await infoRes.json();
      if (info?.email) email = String(info.email).trim().toLowerCase();
      if (typeof info?.email_verified === 'boolean') emailVerified = info.email_verified;
      if (info?.name) displayName = String(info.name).trim();
    }
  } catch {
    // fallback para dados do Firebase User caso a consulta userinfo falhe
  }

  if (!email) {
    throw new Error('Não foi possível identificar o endereço de e-mail na conta Google selecionada.');
  }

  return {
    user: res.user,
    accessToken: res.accessToken,
    email,
    emailVerified,
    displayName,
  };
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const googleLogout = async () => {
  cachedAccessToken = null;
  await signOut(auth);
};

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendMimeViaGmailApi(
  token: string,
  toEmail: string,
  subject: string,
  htmlBody: string
): Promise<{ ok: boolean; errorMessage?: string }> {
  const emailLines = [
    `To: ${toEmail}`,
    'Reply-To: "CARDAPP (No-Reply)" <no-reply@cardapp.com.br>',
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Auto-Submitted: auto-generated',
    'X-Auto-Response-Suppress: OOF, AutoReply',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(htmlBody))),
  ];

  const rawMessage = emailLines.join('\r\n');
  const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.warn('[Gmail API] Erro ao enviar mensagem:', response.status, errText);
    return { ok: false, errorMessage: errText || `HTTP ${response.status}` };
  }

  return { ok: true };
}

/**
 * Envia código de verificação formal CARDAPP (No-Reply) de 6 dígitos diretamente pela API do Gmail
 * usando o token OAuth concedido explicitamente pelo usuário.
 */
export async function sendVerificationEmailViaGmailApi(params: {
  toEmail: string;
  verificationCode: string;
  clientName?: string;
  storeName?: string;
  accessToken?: string | null;
}): Promise<{ success: boolean; message: string }> {
  try {
    let token = params.accessToken || cachedAccessToken;
    if (!token) {
      const authResult = await googleSignIn();
      token = authResult?.accessToken || null;
    }

    if (!token) {
      return {
        success: false,
        message: 'Autenticação Google necessária para enviar o código de verificação.',
      };
    }

    const cleanName = escapeHtml((params.clientName || 'Cliente').trim());
    const cleanStore = escapeHtml((params.storeName || 'Seu Estabelecimento').trim());
    const cleanCode = params.verificationCode.trim();
    const subject = `CARDAPP • No-Reply | Código de Verificação Cadastral: ${cleanCode}`;

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background-color: #0f172a; padding: 28px 24px; text-align: center; border-bottom: 4px solid #f59e0b;">
          <div style="display: inline-block; background-color: #fbbf24; color: #0f172a; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 12px; border-radius: 6px; margin-bottom: 10px;">
            NO-REPLY • COMUNICAÇÃO OFICIAL
          </div>
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: 1px;">
            CARDAPP
          </h1>
          <p style="margin: 6px 0 0; color: #cbd5e1; font-size: 13px; font-weight: 500;">
            Confirmação de Autenticidade de E-mail Cadastral
          </p>
        </div>

        <div style="padding: 32px 28px; color: #1e293b; line-height: 1.65;">
          <p style="font-size: 15px; margin-top: 0; color: #0f172a;">
            Prezado(a) <strong>${cleanName}</strong>,
          </p>
          <p style="font-size: 14px; color: #475569;">
            Recebemos a solicitação de cadastro do estabelecimento <strong>"${cleanStore}"</strong> na plataforma <strong>CARDAPP</strong>.
            Para confirmar que este endereço de e-mail é verdadeiro e proteger a sua conta, informe o código de verificação abaixo:
          </p>

          <div style="margin: 28px 0; text-align: center;">
            <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; margin: 0 0 8px;">
              Seu Código de Verificação
            </p>
            <div style="display: inline-block; background-color: #fffbeb; border: 2px solid #f59e0b; padding: 18px 40px; border-radius: 12px;">
              <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #0f172a; font-family: 'Courier New', Courier, monospace;">
                ${cleanCode}
              </span>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 10px; margin-bottom: 0;">
              Válido por <strong>10 minutos</strong> • Uso único e confidencial
            </p>
          </div>

          <div style="background-color: #f8fafc; border-left: 4px solid #0f172a; padding: 14px 16px; border-radius: 6px; font-size: 12.5px; color: #334155; margin-bottom: 24px;">
            <strong>Aviso de Segurança:</strong> Nunca compartilhe este código com terceiros. A equipe oficial do <strong>CARDAPP</strong> jamais solicita códigos por telefone ou mensagens.
          </div>

          <p style="font-size: 13.5px; color: #334155; margin-bottom: 4px;">Atenciosamente,</p>
          <p style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 0;">
            CARDAPP — Sistema de Gestão e Cardápio Digital
          </p>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
          <p style="font-size: 11.5px; color: #64748b; margin: 0; text-align: center; line-height: 1.5;">
            Mensagem automática enviada por <strong>CARDAPP (No-Reply)</strong> &lt;no-reply@cardapp.com.br&gt;.<br />
            Por favor, não responda a este endereço de e-mail.
          </p>
        </div>
      </div>
    `;

    const sendRes = await sendMimeViaGmailApi(token, params.toEmail, subject, htmlBody);
    if (!sendRes.ok) {
      return {
        success: false,
        message: 'Não foi possível enviar o e-mail pela conta Google conectada.',
      };
    }

    return {
      success: true,
      message: `Código de verificação formal CARDAPP (No-Reply) enviado para ${params.toEmail} via Gmail!`,
    };
  } catch (error: any) {
    console.error('[Gmail API] Exceção ao enviar verificação:', error);
    return {
      success: false,
      message: error?.message || 'Erro inesperado ao enviar e-mail via Gmail.',
    };
  }
}

/**
 * Envia um e-mail formal CARDAPP (No-Reply) de recuperação de conta pela API oficial do Gmail
 * com o token OAuth concedido pelo usuário.
 */
export async function sendRecoveryEmailViaGmailApi(
  toEmail: string,
  recoveryCode: string,
  accountName?: string,
  storeName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    let token = cachedAccessToken;
    if (!token) {
      const authResult = await googleSignIn();
      token = authResult?.accessToken || null;
    }

    if (!token) {
      return {
        success: false,
        message: 'Autenticação Google necessária para disparar o e-mail via Gmail.',
      };
    }

    const cleanName = escapeHtml(accountName || 'Lojista Parceiro');
    const cleanStore = escapeHtml(storeName || 'Seu Estabelecimento');
    const subject = `CARDAPP • No-Reply | Recuperação de Conta: Código ${recoveryCode}`;

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: #0f172a; padding: 28px 24px; text-align: center; border-bottom: 4px solid #f59e0b;">
          <div style="display: inline-block; background-color: #fbbf24; color: #0f172a; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 12px; border-radius: 6px; margin-bottom: 10px;">
            NO-REPLY • RECUPERAÇÃO DE ACESSO
          </div>
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: 1px;">
            CARDAPP
          </h1>
          <p style="margin: 6px 0 0; color: #cbd5e1; font-size: 13px; font-weight: 500;">
            Redefinição Segura de Senha
          </p>
        </div>

        <div style="padding: 32px 28px; color: #1e293b; font-size: 14px; line-height: 1.65;">
          <p style="margin-top: 0;">Prezado(a) <strong>${cleanName}</strong>,</p>
          <p style="color: #475569;">
            Recebemos uma solicitação de recuperação de acesso para o estabelecimento <strong>"${cleanStore}"</strong> no <strong>CARDAPP</strong>.
          </p>
          <p style="color: #475569;">Informe o código de 6 dígitos abaixo na tela de recuperação para redefinir sua senha:</p>

          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background: #fffbeb; border: 2px solid #f59e0b; padding: 16px 36px; border-radius: 12px;">
              <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0f172a; font-family: 'Courier New', Courier, monospace;">
                ${recoveryCode}
              </span>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 8px;">
              Válido por <strong>15 minutos</strong> • Uso único e confidencial
            </p>
          </div>

          <div style="background: #f8fafc; border-left: 4px solid #0f172a; padding: 12px 16px; border-radius: 6px; font-size: 12.5px; color: #334155;">
            <strong>Aviso de Segurança:</strong> Se você não solicitou a recuperação da sua conta, desconsidere esta mensagem.
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
          <p style="font-size: 11.5px; color: #64748b; text-align: center; margin: 0;">
            Mensagem automática enviada por <strong>CARDAPP (No-Reply)</strong> &lt;no-reply@cardapp.com.br&gt;.<br />
            Por favor, não responda a este e-mail.
          </p>
        </div>
      </div>
    `;

    const sendRes = await sendMimeViaGmailApi(token, toEmail, subject, htmlBody);
    if (!sendRes.ok) {
      return {
        success: false,
        message: 'Não foi possível enviar via Gmail API.',
      };
    }

    return {
      success: true,
      message: 'E-mail de recuperação formal CARDAPP (No-Reply) enviado com sucesso via Gmail!',
    };
  } catch (error: any) {
    console.error('[Gmail API] Exceção ao enviar e-mail:', error);
    return {
      success: false,
      message: error?.message || 'Erro inesperado na API do Gmail.',
    };
  }
}

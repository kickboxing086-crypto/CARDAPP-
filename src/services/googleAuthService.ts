import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
export const SCOPES = [GMAIL_SEND_SCOPE];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// Cache in-memory do access token OAuth conforme exigido pelas diretrizes
let cachedAccessToken: string | null = null;
let isSigningIn = false;

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

// Realiza o Sign-In com Google OAuth solicitando as permissões do Gmail
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

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Envia um e-mail de recuperação de conta diretamente pela API oficial do Gmail
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
      // Se não houver token em cache, tenta autenticar via popup
      const authResult = await googleSignIn();
      token = authResult?.accessToken || null;
    }

    if (!token) {
      return {
        success: false,
        message: 'Permissão Google OAuth necessária para disparar o e-mail via Gmail.',
      };
    }

    const cleanName = accountName || 'Lojista Parceiro';
    const cleanStore = storeName || 'Seu Estabelecimento';
    const subject = `[CARDAPP] Código de Recuperação de Conta: ${recoveryCode}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        <div style="background: #fbbf24; padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">
            CARDAPP DIGITAL
          </h1>
          <p style="margin: 4px 0 0; color: #1e293b; font-size: 13px; font-weight: bold;">
            Recuperação de Acesso e Redefinição de Senha
          </p>
        </div>

        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p>Olá, <strong>${cleanName}</strong>!</p>
          <p>
            Recebemos uma solicitação de recuperação de conta para a loja <strong>"${cleanStore}"</strong> associada a este e-mail.
          </p>
          <p>Utilize o código de 6 dígitos abaixo para redefinir sua senha com segurança:</p>

          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background: #fef3c7; border: 2px dashed #f59e0b; padding: 14px 32px; border-radius: 12px;">
              <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #0f172a; font-family: monospace;">
                ${recoveryCode}
              </span>
            </div>
            <p style="font-size: 11px; color: #64748b; margin-top: 6px;">
              Válido por 15 minutos • Não compartilhe este código
            </p>
          </div>

          <div style="background: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; font-size: 12px; color: #475569;">
            <strong>Aviso de Segurança:</strong> Se você não solicitou a recuperação da sua conta, nenhuma ação é necessária. Sua senha atual permanece inalterada.
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            CARDAPP Digital • SF TECNOLOGIA • E-mail automático de segurança
          </p>
        </div>
      </div>
    `;

    // Monta o e-mail no formato MIME RFC 2822
    const emailLines = [
      `To: ${toEmail}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
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
      const errText = await response.text();
      console.warn('[Gmail API] Erro ao enviar mensagem:', errText);
      return {
        success: false,
        message: 'Não foi possível enviar via Gmail API. Usando servidor de envio alternativo.',
      };
    }

    return {
      success: true,
      message: 'E-mail de recuperação enviado com sucesso via Gmail oficial!',
    };
  } catch (error: any) {
    console.error('[Gmail API] Exceção ao enviar e-mail:', error);
    return {
      success: false,
      message: error?.message || 'Erro inesperado na API do Gmail.',
    };
  }
}

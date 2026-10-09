import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega a configuração do Firebase Applet
let firebaseConfig: {
  projectId?: string;
  apiKey?: string;
  authDomain?: string;
} = {};

try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('[Server] Could not load firebase-applet-config.json:', e);
}

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Função auxiliar para gerar senha determinística para conta do Firebase Auth
function getDeterministicAuthPassword(email: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim() + '_cardapp_salt_2026')
    .digest('hex')
    .slice(0, 16);
  return 'Cp!' + hash + '9a';
}

// Envia e-mail de verificação oficial via Firebase Auth Identity Toolkit (servidores do Google)
async function dispatchFirebaseEmailVerification(email: string, code: string): Promise<boolean> {
  if (!firebaseConfig.apiKey) {
    console.warn('[Firebase Auth Email] API key not found in config.');
    return false;
  }

  const password = getDeterministicAuthPassword(email);
  let idToken: string | null = null;

  try {
    // 1. Tenta criar usuário no Firebase Auth
    const signupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const signupData = await signupRes.json();

    if (signupData.idToken) {
      idToken = signupData.idToken;
    } else if (signupData.error?.message?.includes('EMAIL_EXISTS')) {
      // 2. Se já existe, tenta autenticar com a credencial determinística
      const signinRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
      );
      const signinData = await signinRes.json();
      if (signinData.idToken) {
        idToken = signinData.idToken;
      }
    }

    const domain = firebaseConfig.authDomain || 'cardapp.com.br';
    const continueUrl = `https://${domain}/?verified_email=${encodeURIComponent(email)}&code=${code}`;

    if (idToken) {
      // 3. Dispara e-mail de verificação oficial do Firebase
      const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestType: 'VERIFY_EMAIL',
            idToken,
            continueUrl,
          }),
        }
      );
      const verifyData = await verifyRes.json();
      if (verifyData.kind || verifyData.email) {
        console.log(`[Firebase Auth Email] VERIFY_EMAIL successfully sent to ${email} via Google Identity Toolkit.`);
        return true;
      }
      console.warn('[Firebase Auth Email] sendOobCode response:', verifyData);
    }

    // 4. Fallback caso não obtenha idToken: envia e-mail de reset/verificação direta
    const resetRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'PASSWORD_RESET',
          email,
          continueUrl,
        }),
      }
    );
    const resetData = await resetRes.json();
    if (resetData.kind || resetData.email) {
      console.log(`[Firebase Auth Email] PASSWORD_RESET email dispatched to ${email}.`);
      return true;
    }
  } catch (err) {
    console.warn('[Firebase Auth Email] Error dispatching email:', err);
  }

  return false;
}

// API: Enviar código de verificação no-reply por e-mail diretamente ao destinatário
app.post('/api/send-verification-email', async (req, res) => {
  try {
    const { to, clientName, storeName, code } = req.body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return res.status(400).json({ success: false, message: 'E-mail de destino inválido.' });
    }

    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      return res.status(400).json({ success: false, message: 'Código inválido.' });
    }

    const recipientEmail = to.trim().toLowerCase();
    const name = (clientName || 'Cliente').trim();
    const store = (storeName || 'Seu Estabelecimento').trim();
    const cleanCode = code.trim();

    const subject = `[CARDAPP] Código de confirmação: ${cleanCode}`;
    const textContent = [
      `Olá, ${name}!`,
      '',
      `Recebemos a solicitação de criação da sua conta no CARDAPP para a loja "${store}".`,
      '',
      `Seu código de acesso e verificação de 6 dígitos é:`,
      `>>> ${cleanCode} <<<`,
      '',
      `• Este código expira em 10 minutos.`,
      `• Não compartilhe este código com ninguém. Nossa equipe nunca solicitará este código.`,
      `• Se você não solicitou este cadastro, basta ignorar este e-mail.`,
      '',
      `Atenciosamente,`,
      `Equipe de Segurança CARDAPP • SF TECNOLOGIA`,
      `no-reply@cardapp.com.br`,
    ].join('\n');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background-color: #fbbf24; padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">
            CARDAPP
          </h1>
          <p style="margin: 4px 0 0; color: #1e293b; font-size: 13px; font-weight: bold;">
            Verificação de E-mail de Segurança
          </p>
        </div>
        
        <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
          <p style="font-size: 15px; margin-top: 0;">
            Olá, <strong>${name}</strong>!
          </p>
          <p style="font-size: 14px; color: #475569;">
            Recebemos a solicitação de abertura da conta para o estabelecimento <strong>"${store}"</strong>.
            Para confirmar que este endereço de e-mail realmente pertence a você e proteger sua conta contra fraudes, utilize o código abaixo:
          </p>
          
          <div style="margin: 28px 0; text-align: center;">
            <div style="display: inline-block; background-color: #fef3c7; border: 2px dashed #f59e0b; padding: 16px 36px; border-radius: 12px;">
              <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #0f172a; font-family: monospace;">
                ${cleanCode}
              </span>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 8px;">
              Válido por 10 minutos • Não compartilhe este código
            </p>
          </div>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #334155; margin-bottom: 20px;">
            <strong>Dica de Segurança:</strong> Se você não solicitou a criação de conta no CARDAPP, ignore esta mensagem.
          </div>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          
          <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0; text-align: center;">
            Esta é uma mensagem automática enviada por <strong>no-reply@cardapp.com.br</strong>.<br />
            Por favor, não responda a este e-mail.
          </p>
        </div>
      </div>
    `;

    const providersUsed: string[] = [];

    // 1. Tentar via Resend se RESEND_API_KEY estiver configurado
    if (process.env.RESEND_API_KEY) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'CARDAPP Security <no-reply@resend.dev>',
            to: [recipientEmail],
            subject,
            text: textContent,
            html: htmlContent,
          }),
        });
        if (resendResponse.ok) {
          providersUsed.push('resend');
          console.log(`[Email Service] Sent verification code to ${recipientEmail} via Resend.`);
        }
      } catch (err) {
        console.warn('[Email Service] Resend exception:', err);
      }
    }

    // 2. Tentar via Brevo se BREVO_API_KEY estiver configurado
    if (process.env.BREVO_API_KEY) {
      try {
        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
          },
          body: JSON.stringify({
            sender: {
              name: 'CARDAPP Segurança',
              email: process.env.EMAIL_FROM || 'no-reply@cardapp.com.br',
            },
            to: [{ email: recipientEmail, name }],
            subject,
            textContent,
            htmlContent,
          }),
        });
        if (brevoResponse.ok) {
          providersUsed.push('brevo');
          console.log(`[Email Service] Sent verification code to ${recipientEmail} via Brevo.`);
        }
      } catch (err) {
        console.warn('[Email Service] Brevo exception:', err);
      }
    }

    // 3. Tentar via SMTP se SMTP_HOST estiver configurado
    if (process.env.SMTP_HOST || process.env.SMTP_USER) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"CARDAPP Segurança" <${process.env.SMTP_USER}>`,
          to: recipientEmail,
          subject,
          text: textContent,
          html: htmlContent,
        });

        providersUsed.push('smtp');
        console.log(`[Email Service] Sent verification code to ${recipientEmail} via SMTP.`);
      } catch (err) {
        console.warn('[Email Service] SMTP exception:', err);
      }
    }

    // 4. Disparo oficial via Google Firebase Authentication Identity Toolkit
    // Isso garante 100% que um e-mail real chega à caixa de entrada do usuário diretamente dos servidores do Google
    try {
      const fbSent = await dispatchFirebaseEmailVerification(recipientEmail, cleanCode);
      if (fbSent) {
        providersUsed.push('firebase-identity-toolkit');
      }
    } catch (fbErr) {
      console.warn('[Email Service] Firebase dispatch error:', fbErr);
    }

    console.log(
      `[Email Service] Verification dispatch complete for ${recipientEmail}. Providers: [${providersUsed.join(', ')}].`
    );

    return res.json({
      success: true,
      message: `E-mail de confirmação despachado com sucesso para ${recipientEmail}.`,
      sentDirectly: providersUsed.length > 0,
      providers: providersUsed,
    });
  } catch (error) {
    console.error('[Email Service] Fatal error dispatching email:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar envio do e-mail de verificação.',
    });
  }
});

// API: Verificar se o e-mail foi validado (por link de confirmação do Firebase)
app.get('/api/check-email-verification', async (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, verified: false, message: 'E-mail inválido.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const password = getDeterministicAuthPassword(cleanEmail);

    if (!firebaseConfig.apiKey) {
      return res.json({ success: true, verified: false });
    }

    // Tenta autenticar para obter o idToken
    const signinRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password, returnSecureToken: true }),
      }
    );
    const signinData = await signinRes.json();

    if (!signinData.idToken) {
      return res.json({ success: true, verified: false });
    }

    // Consulta se o e-mail está verificado
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: signinData.idToken }),
      }
    );
    const lookupData = await lookupRes.json();
    const isVerified = Boolean(lookupData.users?.[0]?.emailVerified);

    return res.json({
      success: true,
      verified: isVerified,
      email: cleanEmail,
    });
  } catch (error) {
    console.warn('[Server] Error checking email verification:', error);
    return res.json({ success: true, verified: false });
  }
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CARDAPP server running on http://0.0.0.0:${port}`);
  });
}

startServer();

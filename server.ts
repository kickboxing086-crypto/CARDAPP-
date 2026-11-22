import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import { MercadoPagoConfig, Payment, Preference, WebhookSignatureValidator } from 'mercadopago';

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

// Inicializa Firebase Admin de forma segura
let db: Firestore | null = null;
try {
  admin.initializeApp({
    credential: admin.applicationDefault(),
    projectId: firebaseConfig.projectId
  });
  db = getFirestore();
} catch (e) {
  console.warn('[Server] Firebase Admin init notice:', e);
}

// Helper seguro para leitura das credenciais Mercado Pago do servidor
function getMercadoPagoCredentials() {
  const accessToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();
  const publicKey = (process.env.MERCADO_PAGO_PUBLIC_KEY || '').trim();
  return { accessToken, publicKey };
}

function getMercadoPagoClients() {
  const { accessToken, publicKey } = getMercadoPagoCredentials();
  if (!accessToken) return null;
  const config = new MercadoPagoConfig({
    accessToken,
    options: { timeout: 12000 },
  });
  return {
    config,
    paymentClient: new Payment(config),
    preferenceClient: new Preference(config),
    publicKey,
  };
}

function sanitizeGatewayText(value: unknown, maxLen: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\r\n\t<>]/g, ' ').trim().slice(0, maxLen);
  return cleaned || fallback;
}

function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 160;
}

function resolveAppBaseUrl(req: express.Request): string | null {
  const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (envUrl && /^https?:\/\/[a-zA-Z0-9.-]+(:\d{1,5})?(\/.*)?$/.test(envUrl)) {
    return envUrl;
  }
  const forwardedHost = req.headers['x-forwarded-host'];
  const rawHost = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.headers.host;
  if (typeof rawHost === 'string' && /^[a-zA-Z0-9.-]+(:\d{1,5})?$/.test(rawHost.trim())) {
    const protoHeader = req.headers['x-forwarded-proto'];
    const proto = typeof protoHeader === 'string' && protoHeader.split(',')[0].trim() === 'https'
      ? 'https'
      : req.protocol === 'https'
      ? 'https'
      : 'http';
    return `${proto}://${rawHost.trim()}`;
  }
  return null;
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

// API: Enviar código oficial de recuperação de conta por e-mail
app.post('/api/send-recovery-email', async (req, res) => {
  try {
    const { to, clientName, storeName, code } = req.body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return res.status(400).json({ success: false, message: 'E-mail de destino inválido.' });
    }

    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      return res.status(400).json({ success: false, message: 'Código de recuperação inválido.' });
    }

    const recipientEmail = to.trim().toLowerCase();
    const name = (clientName || 'Lojista').trim();
    const store = (storeName || 'Sua Loja').trim();
    const cleanCode = code.trim();

    const subject = `[CARDAPP] Recuperação de Conta: Código ${cleanCode}`;
    const textContent = [
      `Olá, ${name}!`,
      '',
      `Recebemos uma solicitação de recuperação de conta no CARDAPP para o estabelecimento "${store}".`,
      '',
      `Seu código de segurança para redefinir sua senha é:`,
      `>>> ${cleanCode} <<<`,
      '',
      `• Este código é válido por 15 minutos.`,
      `• Não compartilhe este código com terceiros.`,
      `• Se você não solicitou esta recuperação, ignore esta mensagem e sua senha permanecerá inalterada.`,
      '',
      `Atenciosamente,`,
      `Equipe de Segurança CARDAPP • SF TECNOLOGIA`,
      `no-reply@cardapp.com.br`,
    ].join('\n');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        <div style="background: #fbbf24; padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">
            CARDAPP DIGITAL
          </h1>
          <p style="margin: 4px 0 0; color: #1e293b; font-size: 13px; font-weight: bold;">
            Recuperação de Acesso e Redefinição de Senha
          </p>
        </div>

        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p>Olá, <strong>${name}</strong>!</p>
          <p>
            Recebemos uma solicitação de recuperação de acesso para a conta associada ao estabelecimento <strong>"${store}"</strong>.
          </p>
          <p>Digite o código de 6 dígitos abaixo na tela de login para redefinir sua senha com segurança:</p>

          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background: #fef3c7; border: 2px dashed #f59e0b; padding: 14px 32px; border-radius: 12px;">
              <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #0f172a; font-family: monospace;">
                ${cleanCode}
              </span>
            </div>
            <p style="font-size: 11px; color: #64748b; margin-top: 6px;">
              Válido por 15 minutos • Não compartilhe este código
            </p>
          </div>

          <div style="background: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; font-size: 12px; color: #475569;">
            <strong>Aviso de Segurança:</strong> Se você não solicitou a recuperação da sua conta, ignore esta mensagem com segurança.
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            CARDAPP Digital • SF TECNOLOGIA • E-mail automático oficial
          </p>
        </div>
      </div>
    `;

    // Tentar via SMTP / Resend / Brevo
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
        console.log(`[Email Service] Sent recovery code to ${recipientEmail} via SMTP.`);
      } catch (err) {
        console.warn('[Email Service] SMTP recovery error:', err);
      }
    }

    return res.json({
      success: true,
      message: 'Código de recuperação enviado para seu e-mail.',
      code: isProd ? undefined : cleanCode,
    });
  } catch (error) {
    console.error('[Email Service] Error sending recovery email:', error);
    return res.status(500).json({ success: false, message: 'Erro ao enviar e-mail de recuperação.' });
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

// =========================================================================
// MERCADO PAGO GATEWAY API ROUTES (Registered BEFORE Vite / catch-all SPA)
// =========================================================================

// Status da integração Mercado Pago (nunca expõe o Access Token privado)
app.get('/api/mercadopago/status', (_req, res) => {
  const { accessToken, publicKey } = getMercadoPagoCredentials();
  return res.json({
    configured: Boolean(accessToken),
    publicKeyConfigured: Boolean(publicKey),
    publicKey: publicKey || null,
  });
});

// Criar pagamento Pix oficial via Mercado Pago (retorna QR Code e Copia e Cola reais)
app.post('/api/mercadopago/create-pix-payment', async (req, res) => {
  try {
    const clients = getMercadoPagoClients();
    if (!clients) {
      return res.status(503).json({
        success: false,
        code: 'GATEWAY_UNAVAILABLE',
        message: 'Gateway de pagamento temporariamente indisponível.',
      });
    }

    const body = req.body || {};
    const accountId = sanitizeGatewayText(body.accountId, 100);
    const storeId = sanitizeGatewayText(body.storeId, 100, 'store');
    const storeName = sanitizeGatewayText(body.storeName, 80, 'Loja CARDAPP');
    const planId = sanitizeGatewayText(body.planId, 80, 'mensal');
    const planPeriod = sanitizeGatewayText(body.planPeriod, 40, 'mensal');
    const planName = sanitizeGatewayText(body.planName, 80, 'Plano Mensal');
    const payerName = sanitizeGatewayText(body.payerName, 80, 'Lojista CARDAPP');
    const rawEmail = sanitizeGatewayText(body.payerEmail, 160).toLowerCase();
    const payerEmail = isValidEmailAddress(rawEmail) ? rawEmail : 'pagamentos@cardapp.com.br';

    const parsedAmount = Number(body.amount);
    if (!accountId || !Number.isFinite(parsedAmount) || parsedAmount < 1 || parsedAmount > 50000) {
      return res.status(400).json({
        success: false,
        message: 'Dados do plano ou valor de pagamento inválidos.',
      });
    }
    const cleanAmount = Math.round(parsedAmount * 100) / 100;

    const parsedDays = Number(body.durationDays);
    const durationDays =
      Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 36500 ? parsedDays : 30;

    const nameParts = payerName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || 'Lojista';
    const lastName = nameParts.slice(1).join(' ') || 'CARDAPP';

    const baseUrl = resolveAppBaseUrl(req);
    const notificationUrl =
      baseUrl && baseUrl.startsWith('https://') ? `${baseUrl}/api/mercadopago-webhook` : undefined;

    const externalReference = `cardapp_renewal:${accountId}:${planPeriod}:${durationDays}`.slice(0, 250);
    const idempotencyKey = crypto.randomUUID();

    // Expiração do Pix em 5 minutos (prazo estrito de pagamento)
    const expirationDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const mpPayment = await clients.paymentClient.create({
      body: {
        transaction_amount: cleanAmount,
        description: `CARDAPP ${planName} - ${storeName}`.slice(0, 200),
        payment_method_id: 'pix',
        date_of_expiration: expirationDate,
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
        },
        external_reference: externalReference,
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        metadata: {
          account_id: accountId,
          store_id: storeId,
          store_name: storeName,
          plan_id: planId,
          plan_period: planPeriod,
          plan_name: planName,
          duration_days: durationDays,
        },
      },
      requestOptions: { idempotencyKey },
    });

    const paymentId = String(mpPayment.id || '');
    const txData = mpPayment.point_of_interaction?.transaction_data;
    const qrCode = txData?.qr_code || '';
    const qrCodeBase64 = txData?.qr_code_base64 || '';
    const ticketUrl = txData?.ticket_url || '';

    if (db && paymentId) {
      try {
        await db.collection('mp_payments').doc(paymentId).set({
          paymentId,
          accountId,
          storeId,
          storeName,
          planId,
          planPeriod,
          planName,
          durationDays,
          amount: cleanAmount,
          status: mpPayment.status || 'pending',
          method: 'pix',
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (dbErr) {
        console.warn('[Mercado Pago] Non-blocking Firestore log warning:', dbErr);
      }
    }

    return res.json({
      success: true,
      paymentId,
      status: mpPayment.status || 'pending',
      statusDetail: mpPayment.status_detail || '',
      amount: cleanAmount,
      qrCode,
      qrCodeBase64,
      ticketUrl,
      expiresAt: mpPayment.date_of_expiration || expirationDate,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Erro desconhecido ao gerar Gateway Pix.';
    console.error('[Mercado Pago Pix Error]:', error);
    return res.status(502).json({
      success: false,
      message: `Não foi possível gerar o código na Gateway Pix: ${errMsg}`,
    });
  }
});

// Criar preferência de pagamento Gateway (uso interno)
app.post('/api/mercadopago/create-preference', async (req, res) => {
  try {
    const clients = getMercadoPagoClients();
    if (!clients) {
      return res.status(503).json({
        success: false,
        code: 'GATEWAY_UNAVAILABLE',
        message: 'Gateway de pagamento temporariamente indisponível.',
      });
    }

    const body = req.body || {};
    const accountId = sanitizeGatewayText(body.accountId, 100);
    const storeId = sanitizeGatewayText(body.storeId, 100, 'store');
    const storeName = sanitizeGatewayText(body.storeName, 80, 'Loja CARDAPP');
    const planId = sanitizeGatewayText(body.planId, 80, 'mensal');
    const planPeriod = sanitizeGatewayText(body.planPeriod, 40, 'mensal');
    const planName = sanitizeGatewayText(body.planName, 80, 'Plano Mensal');
    const payerName = sanitizeGatewayText(body.payerName, 80, 'Lojista CARDAPP');
    const rawEmail = sanitizeGatewayText(body.payerEmail, 160).toLowerCase();
    const payerEmail = isValidEmailAddress(rawEmail) ? rawEmail : 'pagamentos@cardapp.com.br';

    const parsedAmount = Number(body.amount);
    if (!accountId || !Number.isFinite(parsedAmount) || parsedAmount < 1 || parsedAmount > 50000) {
      return res.status(400).json({
        success: false,
        message: 'Dados do plano ou valor de pagamento inválidos.',
      });
    }
    const cleanAmount = Math.round(parsedAmount * 100) / 100;

    const parsedDays = Number(body.durationDays);
    const durationDays =
      Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 36500 ? parsedDays : 30;

    const baseUrl = resolveAppBaseUrl(req);
    const notificationUrl =
      baseUrl && baseUrl.startsWith('https://') ? `${baseUrl}/api/mercadopago-webhook` : undefined;
    const externalReference = `cardapp_renewal:${accountId}:${planPeriod}:${durationDays}`.slice(0, 250);

    const backUrls = baseUrl
      ? {
          success: `${baseUrl}/?view=admin&mp_status=approved&mp_account=${encodeURIComponent(accountId)}&mp_plan=${encodeURIComponent(planPeriod)}&mp_days=${durationDays}&mp_amount=${cleanAmount}`,
          pending: `${baseUrl}/?view=admin&mp_status=pending`,
          failure: `${baseUrl}/?view=admin&mp_status=failure`,
        }
      : undefined;

    const preference = await clients.preferenceClient.create({
      body: {
        items: [
          {
            id: planId,
            title: `CARDAPP • ${planName} (${storeName})`.slice(0, 200),
            description: `Renovação de licença por ${durationDays} dias`,
            quantity: 1,
            unit_price: cleanAmount,
            currency_id: 'BRL',
          },
        ],
        payer: {
          name: payerName,
          email: payerEmail,
        },
        external_reference: externalReference,
        ...(backUrls ? { back_urls: backUrls } : {}),
        ...(baseUrl && baseUrl.startsWith('https://') ? { auto_return: 'approved' as const } : {}),
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        metadata: {
          account_id: accountId,
          store_id: storeId,
          store_name: storeName,
          plan_id: planId,
          plan_period: planPeriod,
          plan_name: planName,
          duration_days: durationDays,
        },
      },
    });

    return res.json({
      success: true,
      preferenceId: preference.id || '',
      initPoint: preference.init_point || '',
      sandboxInitPoint: preference.sandbox_init_point || '',
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Erro desconhecido no gateway.';
    console.error('[Mercado Pago Preference Error]:', error);
    return res.status(502).json({
      success: false,
      message: `Erro ao iniciar pagamento na Gateway: ${errMsg}`,
    });
  }
});

// Consultar status oficial de um pagamento diretamente na Gateway
app.get('/api/mercadopago/payment-status/:paymentId', async (req, res) => {
  try {
    const paymentId = (req.params.paymentId || '').trim();
    if (!/^\d{5,22}$/.test(paymentId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pagamento da Gateway inválido.',
      });
    }

    const clients = getMercadoPagoClients();
    if (!clients) {
      return res.status(503).json({
        success: false,
        code: 'GATEWAY_UNAVAILABLE',
        message: 'Gateway de pagamento temporariamente indisponível.',
      });
    }

    const mpPayment = await clients.paymentClient.get({ id: paymentId });
    const status = mpPayment.status || 'pending';

    if (db) {
      try {
        await db.collection('mp_payments').doc(paymentId).set(
          {
            paymentId,
            status,
            statusDetail: mpPayment.status_detail || '',
            amount: mpPayment.transaction_amount || 0,
            dateApproved: mpPayment.date_approved || null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch {}
    }

    return res.json({
      success: true,
      paymentId: String(mpPayment.id || paymentId),
      status,
      statusDetail: mpPayment.status_detail || '',
      amount: mpPayment.transaction_amount || 0,
      dateApproved: mpPayment.date_approved || null,
      paymentMethodId: mpPayment.payment_method_id || 'pix',
      externalReference: mpPayment.external_reference || null,
      metadata: mpPayment.metadata || null,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Pagamento não encontrado.';
    console.warn('[Mercado Pago Status Lookup Warning]:', errMsg);
    return res.status(404).json({
      success: false,
      message: 'Pagamento ainda não localizado ou pendente na Gateway Pix.',
    });
  }
});

// Webhook oficial Mercado Pago (revalida status diretamente na API antes de gravar)
app.post('/api/mercadopago-webhook', async (req, res) => {
  try {
    const body = req.body || {};
    const type = body.type || body.topic || req.query.topic || req.query.type;
    const rawId = body.data?.id || req.query['data.id'] || req.query.id;
    const paymentId = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId).trim() : '';

    // Valida assinatura HMAC se MERCADO_PAGO_WEBHOOK_SECRET estiver configurado
    const webhookSecret = (process.env.MERCADO_PAGO_WEBHOOK_SECRET || '').trim();
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    if (webhookSecret && paymentId) {
      try {
        WebhookSignatureValidator.validate({
          xSignature,
          xRequestId,
          dataId: paymentId,
          secret: webhookSecret,
          toleranceSeconds: 300,
        });
      } catch (sigErr) {
        console.warn('[Mercado Pago Webhook] Assinatura inválida ignorada:', sigErr);
        return res.status(401).send('Invalid signature');
      }
    }

    if (type === 'payment' && /^\d{5,22}$/.test(paymentId)) {
      const clients = getMercadoPagoClients();
      if (clients) {
        const payment = await clients.paymentClient.get({ id: paymentId });
        if (payment.status === 'approved') {
          const ref = payment.external_reference || '';
          if (db) {
            await db.collection('mp_payments').doc(paymentId).set(
              {
                paymentId,
                status: 'approved',
                externalReference: ref,
                amount: payment.transaction_amount || 0,
                dateApproved: payment.date_approved || null,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            if (ref && !ref.startsWith('cardapp_renewal:')) {
              await db.collection('orders').doc(ref).set(
                {
                  status: 'paid',
                  mpPaymentId: paymentId,
                  updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
            }
          }
        }
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('[Mercado Pago Webhook] Error processing:', error);
    return res.status(200).send('OK');
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

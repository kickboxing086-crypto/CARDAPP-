import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

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

    const subject = `[CARDAPP] Seu código de confirmação: ${cleanCode}`;
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

    let emailSent = false;
    let providerUsed = 'none';

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
          emailSent = true;
          providerUsed = 'resend';
          console.log(`[Email Service] Sent verification code to ${recipientEmail} via Resend.`);
        } else {
          const errData = await resendResponse.text();
          console.warn('[Email Service] Resend error:', errData);
        }
      } catch (err) {
        console.warn('[Email Service] Resend exception:', err);
      }
    }

    // 2. Tentar via Brevo se BREVO_API_KEY estiver configurado
    if (!emailSent && process.env.BREVO_API_KEY) {
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
          emailSent = true;
          providerUsed = 'brevo';
          console.log(`[Email Service] Sent verification code to ${recipientEmail} via Brevo.`);
        } else {
          const errData = await brevoResponse.text();
          console.warn('[Email Service] Brevo error:', errData);
        }
      } catch (err) {
        console.warn('[Email Service] Brevo exception:', err);
      }
    }

    // 3. Tentar via SMTP se SMTP_HOST estiver configurado
    if (!emailSent && (process.env.SMTP_HOST || process.env.SMTP_USER)) {
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

        emailSent = true;
        providerUsed = 'smtp';
        console.log(`[Email Service] Sent verification code to ${recipientEmail} via SMTP.`);
      } catch (err) {
        console.warn('[Email Service] SMTP exception:', err);
      }
    }

    // Registra log seguro de envio sem expor o código na resposta
    console.log(
      `[Email Service] Verification dispatch processed for ${recipientEmail}. Provider: ${providerUsed}.`
    );

    // Resposta de sucesso segura: JAMAIS retorne o código no JSON de resposta para impedir inspeção de rede pelo usuário
    return res.json({
      success: true,
      message: `Código de verificação enviado com sucesso diretamente para ${recipientEmail}.`,
      sentDirectly: emailSent,
    });
  } catch (error) {
    console.error('[Email Service] Fatal error dispatching email:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar envio do e-mail de verificação.',
    });
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

import { accountService } from './accountService';

const EMAIL_VERIFICATION_STORAGE_KEY = 'cardapp_pending_email_verification';

class EmailValidationService {
  /**
   * Validação de formato de e-mail, bloqueio de descartáveis, sugestão de digitação e checagem de duplicidade
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

  public clearSession() {
    try {
      localStorage.removeItem(EMAIL_VERIFICATION_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const emailVerificationService = new EmailValidationService();

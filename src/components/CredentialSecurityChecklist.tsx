import React, { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import {
  validateUsernameSecurity,
  validatePasswordSecurity,
  MAX_CREDENTIAL_LENGTH,
} from '../utils/security';

interface CredentialSecurityChecklistProps {
  value: string;
  fieldType: 'username' | 'password';
  compact?: boolean;
  onQuickInsertChar?: (char: string) => void;
}

const QUICK_SPECIAL_CHARS = ['@', '#', '$', '%', '&', '*', '!', '_', '-'];

export const CredentialSecurityChecklist: React.FC<CredentialSecurityChecklistProps> = ({
  value,
  fieldType,
  compact = false,
  onQuickInsertChar,
}) => {
  const checks = useMemo(() => {
    return fieldType === 'username'
      ? validateUsernameSecurity(value)
      : validatePasswordSecurity(value);
  }, [value, fieldType]);

  const exceedsMax = value.length > MAX_CREDENTIAL_LENGTH;
  const lengthOk = checks.hasMinLength && checks.hasMaxLength;

  const items = [
    {
      key: 'len',
      label: `Até ${MAX_CREDENTIAL_LENGTH} caract. (${value.length}/${MAX_CREDENTIAL_LENGTH})`,
      ok: lengthOk,
      dangerOnFail: exceedsMax,
    },
    { key: 'upper', label: 'Letra maiúscula (A-Z)', ok: checks.hasUppercase },
    { key: 'lower', label: 'Letra minúscula (a-z)', ok: checks.hasLowercase },
    { key: 'num', label: 'Número (0-9)', ok: checks.hasNumber },
    { key: 'spec', label: 'Caractere especial (@, #, $...)', ok: checks.hasSpecialChar },
    { key: 'accent', label: 'Sem acentos/cedilha', ok: checks.hasNoAccents, dangerOnFail: true },
    { key: 'space', label: 'Sem espaços', ok: checks.hasNoSpaces },
  ];

  if (compact) {
    return (
      <div className="space-y-1.5 pt-1">
        <div className="flex flex-wrap gap-1">
          {items.slice(0, 5).map((item) => {
            const isDanger = item.dangerOnFail && !item.ok;
            return (
              <span
                key={item.key}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                  item.ok
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : isDanger
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                {item.ok ? (
                  <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                ) : isDanger ? (
                  <X className="w-2.5 h-2.5 text-red-600 stroke-[3]" />
                ) : (
                  <span className="w-2 h-2 rounded-full border border-slate-300 inline-block" />
                )}
                <span>{item.label}</span>
              </span>
            );
          })}
        </div>
        {!checks.hasNoAccents && (
          <div className="text-[10px] font-bold text-red-600 flex items-center gap-1">
            <X className="w-3 h-3 stroke-[3]" />
            <span>Não é permitido acentos ou cedilhas</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-1">
      {onQuickInsertChar && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Toque para inserir caractere especial (máx. {MAX_CREDENTIAL_LENGTH} caract.):
          </span>
          <div className="flex flex-wrap gap-1">
            {QUICK_SPECIAL_CHARS.map((char) => (
              <button
                key={char}
                type="button"
                disabled={value.length >= MAX_CREDENTIAL_LENGTH}
                onClick={() => onQuickInsertChar(char)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-amber-100 border border-slate-300 hover:border-amber-400 rounded-lg text-xs font-mono font-black text-slate-800 hover:text-amber-950 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {char}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] space-y-1.5">
        <span className="text-[10px] uppercase font-black text-slate-600 block tracking-wider">
          {fieldType === 'username'
            ? `Check do Usuário (Máximo ${MAX_CREDENTIAL_LENGTH} caracteres):`
            : `Check da Senha (Máximo ${MAX_CREDENTIAL_LENGTH} caracteres):`}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {items.map((item) => {
            const isDanger = item.dangerOnFail && !item.ok;
            return (
              <div
                key={item.key}
                className={`flex items-center gap-1.5 transition-colors ${
                  item.ok
                    ? 'text-emerald-700 font-bold'
                    : isDanger
                    ? 'text-red-600 font-bold'
                    : 'text-slate-500'
                }`}
              >
                {item.ok ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3] shrink-0" />
                ) : isDanger ? (
                  <X className="w-3.5 h-3.5 text-red-600 stroke-[3] shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className="truncate">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

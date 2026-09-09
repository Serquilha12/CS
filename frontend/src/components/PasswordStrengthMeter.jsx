import React from 'react';
import { Check, X, ShieldAlert, ShieldCheck } from 'lucide-react';

export function checkPasswordStrength(password = '') {
  const rules = [
    {
      id: 'length',
      label: 'Mínimo de 8 caracteres',
      met: password.length >= 8
    },
    {
      id: 'upper',
      label: 'Uma letra maiúscula (A-Z)',
      met: /[A-Z]/.test(password)
    },
    {
      id: 'lower',
      label: 'Uma letra minúscula (a-z)',
      met: /[a-z]/.test(password)
    },
    {
      id: 'number',
      label: 'Pelo menos um número (0-9)',
      met: /[0-9]/.test(password)
    },
    {
      id: 'special',
      label: 'Um caractere especial (!@#$%...)',
      met: /[^a-zA-Z0-9\s]/.test(password)
    }
  ];

  const metCount = rules.filter((r) => r.met).length;
  const isStrong = metCount === 5;

  let strengthLabel = 'Muito Fraca';
  let strengthColor = 'bg-rose-500';
  let textColor = 'text-rose-600';

  if (metCount >= 5) {
    strengthLabel = 'Forte e Segura';
    strengthColor = 'bg-emerald-500';
    textColor = 'text-emerald-700';
  } else if (metCount >= 4) {
    strengthLabel = 'Boa';
    strengthColor = 'bg-teal-500';
    textColor = 'text-teal-700';
  } else if (metCount >= 3) {
    strengthLabel = 'Razoável';
    strengthColor = 'bg-amber-500';
    textColor = 'text-amber-700';
  } else if (metCount >= 2) {
    strengthLabel = 'Fraca';
    strengthColor = 'bg-orange-500';
    textColor = 'text-orange-700';
  }

  return {
    rules,
    metCount,
    isStrong,
    strengthLabel,
    strengthColor,
    textColor
  };
}

export function PasswordStrengthMeter({ password = '' }) {
  if (!password) {
    return (
      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>Use letras maiúsculas, minúsculas, números e símbolos.</span>
      </div>
    );
  }

  const { rules, metCount, isStrong, strengthLabel, strengthColor, textColor } = checkPasswordStrength(password);

  return (
    <div className="mt-2 space-y-2 animate-in fade-in duration-200">
      {/* Medidor visual com 4 barras segmentadas */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-500 flex items-center">
            {isStrong ? (
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600 inline" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-500 inline" />
            )}
            Segurança da palavra-passe:
          </span>
          <span className={`font-bold ${textColor}`}>{strengthLabel}</span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`h-full rounded-full transition-all duration-300 ${
                metCount >= level ? strengthColor : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Lista de Requisitos Dinâmicos em formato de grelha compacta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`flex items-center space-x-1.5 text-[11px] transition-colors ${
              rule.met ? 'text-emerald-700 font-semibold' : 'text-slate-400'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                rule.met ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {rule.met ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <X className="w-2.5 h-2.5 stroke-[2]" />}
            </div>
            <span className="truncate">{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

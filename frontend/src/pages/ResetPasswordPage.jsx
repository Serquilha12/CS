import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, CheckCircle2, ShieldCheck, Loader2, Lock } from 'lucide-react';
import { fetchApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLengthValid = password.length >= 6;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = isLengthValid && doPasswordsMatch;

  async function handleSubmit(e) {
    e.preventDefault();

    if (!isLengthValid) {
      showToast('A palavra-passe deve ter pelo menos 6 caracteres.', 'warning');
      return;
    }

    if (!doPasswordsMatch) {
      showToast('As palavras-passe introduzidas não coincidem.', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: { password }
      });

      if (res.success) {
        showToast('Palavra-passe redefinida com sucesso! Pode iniciar sessão com a nova credencial.', 'success');
        navigate('/', { replace: true });
      }
    } catch (err) {
      showToast(err.message || 'Erro ao redefinir palavra-passe. O link pode ter expirado.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100 relative">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
          <KeyRound className="w-7 h-7 text-ucm-emerald" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 text-center tracking-tight">
          Redefinir Palavra-passe
        </h1>
        <p className="text-xs text-slate-500 text-center mt-1 mb-6">
          Defina uma nova palavra-passe segura para aceder à sua conta UCM.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nova Palavra-passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full p-3.5 pr-11 border rounded-xl text-sm focus:outline-none min-h-[46px] ${
                  password.length > 0
                    ? isLengthValid
                      ? 'border-emerald-500 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                      : 'border-amber-400 focus:ring-2 focus:ring-amber-400'
                    : 'border-slate-300 focus:ring-2 focus:ring-ucm-emerald'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 && !isLengthValid && (
              <p className="mt-1 text-[11px] font-bold text-amber-600">
                Mínimo de 6 caracteres necessário.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Confirmar Nova Palavra-passe
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full p-3.5 pr-11 border rounded-xl text-sm focus:outline-none min-h-[46px] ${
                  confirmPassword.length > 0
                    ? doPasswordsMatch
                      ? 'border-emerald-500 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                      : 'border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400'
                    : 'border-slate-300 focus:ring-2 focus:ring-ucm-emerald'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !doPasswordsMatch && (
              <p className="mt-1 text-[11px] font-bold text-rose-600">
                As palavras-passe não coincidem.
              </p>
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Após atualizar a palavra-passe, poderá aceder imediatamente à plataforma com o seu e-mail UCM.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className={`w-full py-3.5 px-4 font-bold rounded-xl text-sm min-h-[48px] shadow-md transition-all flex items-center justify-center cursor-pointer ${
              isSubmitting || !isFormValid
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-ucm-emerald hover:bg-ucm-darkEmerald text-white'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                A atualizar palavra-passe...
              </>
            ) : (
              'Guardar Nova Palavra-passe'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

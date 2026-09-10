import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, Loader2, Lock, ArrowLeft } from 'lucide-react';
import { fetchApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { PasswordStrengthMeter, checkPasswordStrength } from '../components/PasswordStrengthMeter';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState(null);
  const [tokenError, setTokenError] = useState(null);

  // Extração imediata do token de recuperação a partir do hash ou parâmetros da URL
  useEffect(() => {
    let extractedToken = null;

    // 1. Tentar extrair do hash da URL (#access_token=... gerado pelo redirecionamento do Supabase)
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      extractedToken = hashParams.get('access_token');
    }

    // 2. Se não estiver no hash, verificar nos search params (?token=... ou ?code=...)
    if (!extractedToken && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      extractedToken = searchParams.get('token') || searchParams.get('access_token') || searchParams.get('code');
    }

    // 3. Verificar se já existe uma chave de token no localStorage
    if (!extractedToken) {
      extractedToken = localStorage.getItem('cs_token');
    }

    if (extractedToken) {
      setRecoveryToken(extractedToken);
      localStorage.setItem('cs_token', extractedToken);
    } else {
      setTokenError('Link de recuperação inválido ou incompleto. Por favor, solicite um novo link de redefinição.');
    }
  }, []);

  const { isStrong: isPasswordStrong } = checkPasswordStrength(password);
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = isPasswordStrong && doPasswordsMatch && !tokenError;

  async function handleSubmit(e) {
    e.preventDefault();

    if (tokenError) {
      showToast('O link de recuperação é inválido ou expirou. Solicite um novo link.', 'error');
      return;
    }

    if (!isPasswordStrong) {
      showToast('A palavra-passe deve cumprir todos os 5 critérios de segurança.', 'warning');
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
        headers: recoveryToken ? { 'Authorization': `Bearer ${recoveryToken}` } : {},
        body: { password, token: recoveryToken }
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
          Defina uma nova palavra-passe forte e segura para a sua conta institucional UCM.
        </p>

        {tokenError && (
          <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">{tokenError}</p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center text-xs font-bold text-ucm-emerald hover:underline pt-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Voltar à página inicial para solicitar novo link
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nova Palavra-passe Forte
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres (A-Z, a-z, 0-9, !@#$)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full p-3.5 pr-11 border rounded-xl text-sm focus:outline-none min-h-[46px] ${
                  password.length > 0
                    ? isPasswordStrong
                      ? 'border-emerald-500 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                      : 'border-amber-400 focus:ring-2 focus:ring-amber-400'
                    : 'border-slate-300 focus:ring-2 focus:ring-ucm-emerald'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Medidor e Checklist Dinâmica de Segurança */}
            <PasswordStrengthMeter password={password} />
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
                placeholder="Repita a nova palavra-passe"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                aria-label={showConfirmPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="min-h-[20px] mt-1 flex items-center">
              {confirmPassword.length > 0 ? (
                doPasswordsMatch ? (
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center animate-in fade-in duration-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                    As palavras-passe coincidem
                  </p>
                ) : (
                  <p className="text-[11px] font-bold text-rose-600 flex items-center animate-in fade-in duration-200">
                    <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                    As palavras-passe não coincidem
                  </p>
                )
              ) : (
                <span className="text-[10px] text-slate-400">Confirmação obrigatória para prosseguir</span>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Após atualizar a palavra-passe, poderá aceder imediatamente à plataforma com o seu e-mail institucional UCM.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className={`w-full py-3.5 px-4 font-bold rounded-2xl text-sm min-h-[48px] shadow-md transition-all flex items-center justify-center cursor-pointer ${
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

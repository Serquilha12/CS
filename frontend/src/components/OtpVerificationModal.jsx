import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function OtpVerificationModal({
  isOpen,
  email,
  onClose,
  onSuccess,
  onChangeEmail,
  verifyOtpFn,
  resendOtpFn
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [errorMessage, setErrorMessage] = useState('');
  const { showToast } = useToast();

  const inputRefs = useRef([]);

  // Inicializar o foco na primeira caixa quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      setErrorMessage('');
      setCountdown(60);
      const timer = setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Contagem regressiva para reenvio
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  const otpCode = otp.join('');
  const isComplete = otpCode.length === 6 && /^\d{6}$/.test(otpCode);

  function handleChange(index, value) {
    // Apenas algarismos numéricos são permitidos
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setErrorMessage('');

    // Avançar o foco automaticamente para a próxima caixa se foi preenchido
    if (digit && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        // Se a caixa atual já estiver vazia, volta para a anterior e foca nela
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = ['', '', '', '', '', ''];
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    setErrorMessage('');

    // Focar na última caixa preenchida ou na seguinte
    const focusIndex = Math.min(pastedData.length, 5);
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex].focus();
    }
  }

  async function handleVerify(e) {
    if (e) e.preventDefault();
    if (!isComplete || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const profile = await verifyOtpFn(email, otpCode, 'signup');
      showToast('Conta universitária ativada com sucesso! Bem-vindo.', 'success');
      onSuccess(profile);
    } catch (err) {
      const msg = err?.message || 'Código de verificação incorreto ou expirado.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (countdown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage('');

    try {
      await resendOtpFn(email, 'signup');
      showToast('Novo código de 6 algarismos enviado para o seu correio institucional!', 'info', 6000);
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } catch (err) {
      const msg = err?.message || 'Erro ao reenviar o código. Aguarde alguns instantes.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-t-[28px] sm:rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/50 relative max-h-[85vh] overflow-y-auto overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-7 animate-in slide-in-from-bottom duration-300 sm:zoom-in-95">

        {/* Drag Handle Mobile */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <div className="w-13 h-13 sm:w-14 sm:h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3 mx-auto text-ucm-emerald border border-emerald-100/80 shadow-xs">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            Verificar Código UCM
          </h2>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed px-2">
            Introduza o código de <strong className="text-slate-900 font-semibold">6 algarismos</strong> enviado para o seu e-mail institucional:
          </p>
          <div className="inline-flex items-center space-x-1.5 mt-2 px-3 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-800 border border-slate-200">
            <Mail className="w-3.5 h-3.5 text-ucm-emerald" />
            <span className="truncate max-w-[240px]">{email}</span>
          </div>
        </div>

        {/* Formulário de OTP com 6 caixas individuais */}
        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-xl border transition-all duration-150 focus:outline-none select-none ${
                    digit
                      ? 'border-ucm-emerald bg-emerald-50/20 text-slate-900 focus:ring-2 focus:ring-ucm-emerald'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-ucm-emerald focus:ring-2 focus:ring-ucm-emerald/40'
                  } ${errorMessage ? 'border-rose-400 bg-rose-50/30' : ''}`}
                />
              ))}
            </div>

            {/* Espaço reservado para mensagem de erro sem salto de layout (Zero CLS) */}
            <div className="min-h-[24px] mt-3 flex items-center justify-center text-center px-2">
              {errorMessage ? (
                <p className="text-[11px] font-bold text-rose-600 flex items-center animate-in fade-in duration-200">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                  <span>{errorMessage}</span>
                </p>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Pode digitar ou colar o código recebido no e-mail
                </span>
              )}
            </div>
          </div>

          {/* Botão de Verificação */}
          <button
            type="submit"
            disabled={!isComplete || isSubmitting}
            className={`w-full py-3.5 px-4 font-bold rounded-2xl text-sm min-h-[48px] shadow-md transition-all duration-200 active:scale-[0.97] flex items-center justify-center relative cursor-pointer ${
              !isComplete || isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed active:scale-100'
                : 'bg-ucm-emerald hover:bg-ucm-darkEmerald text-white shadow-ucm-emerald/20 hover:shadow-lg'
            }`}
          >
            <span className={`flex items-center justify-center transition-opacity duration-200 ${isSubmitting ? 'opacity-0' : 'opacity-100'}`}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Ativar e Entrar na Conta
            </span>
            {isSubmitting && (
              <span className="absolute inset-0 flex items-center justify-center space-x-2 text-white animate-in fade-in duration-200">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>A validar código...</span>
              </span>
            )}
          </button>

          {/* Temporizador de Reenvio e Ação de Correção de E-mail */}
          <div className="pt-3 border-t border-slate-100 space-y-3 text-center">
            <div>
              {countdown > 0 ? (
                <p className="text-xs text-slate-500">
                  Reenviar código em <span className="font-bold text-ucm-emerald">{countdown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="inline-flex items-center text-xs font-bold text-ucm-emerald hover:text-ucm-darkEmerald hover:underline transition-colors py-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isResending ? 'animate-spin' : ''}`} />
                  <span>{isResending ? 'A reenviar...' : 'Não recebeu? Reenviar novo código'}</span>
                </button>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={onChangeEmail}
                className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900 transition-colors py-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>E-mail incorreto? Alterar dados</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

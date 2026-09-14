import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Loader2, X, RotateCcw } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const OTP_LENGTH = 6; // Código de verificação OTP de 6 dígitos

export function OtpVerificationModal({
  isOpen,
  email,
  onClose,
  onSuccess,
  onChangeEmail,
  verifyOtpFn,
  resendOtpFn
}) {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [errorMessage, setErrorMessage] = useState('');
  const { showToast } = useToast();

  const inputRefs = useRef([]);

  // Inicializar o foco na primeira caixa quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setOtp(Array(OTP_LENGTH).fill(''));
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
  // Aceita código de 6 dígitos
  const isValidLength = otpCode.length === OTP_LENGTH;

  function handleDigitChange(index, value) {
    if (!value) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      setErrorMessage('');
      return;
    }

    const clean = value.replace(/\D/g, '');
    if (!clean) return;

    if (clean.length > 1) {
      fillPastedDigits(clean, index);
      return;
    }

    const digit = clean.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setErrorMessage('');

    // Avançar foco automaticamente
    if (digit && index < OTP_LENGTH - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];
      if (otp[index]) {
        // Se a caixa atual tem valor, apaga-o
        newOtp[index] = '';
        setOtp(newOtp);
        setErrorMessage('');
      } else if (index > 0) {
        // Se já está vazia, apaga a anterior e foca nela
        newOtp[index - 1] = '';
        setOtp(newOtp);
        setErrorMessage('');
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'Delete') {
      e.preventDefault();
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      setErrorMessage('');
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function fillPastedDigits(cleanDigits, startIndex = 0) {
    const chars = cleanDigits.slice(0, OTP_LENGTH).split('');
    const newOtp = [...otp];

    chars.forEach((c, idx) => {
      const target = startIndex + idx;
      if (target < OTP_LENGTH) {
        newOtp[target] = c;
      }
    });

    setOtp(newOtp);
    setErrorMessage('');

    const nextIndex = Math.min(startIndex + chars.length, OTP_LENGTH - 1);
    if (inputRefs.current[nextIndex]) {
      inputRefs.current[nextIndex].focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pastedText = e.clipboardData?.getData('text') || '';
    const cleanDigits = pastedText.replace(/\D/g, '');
    if (!cleanDigits) return;

    fillPastedDigits(cleanDigits, 0);
  }

  function handleClearAll() {
    setOtp(Array(OTP_LENGTH).fill(''));
    setErrorMessage('');
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }

  async function handleVerify(e) {
    if (e) e.preventDefault();
    if (!isValidLength || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const profile = await verifyOtpFn(email, otpCode, 'signup');
      showToast('Conta universitária ativada com sucesso! Bem-vindo à CampusStore.', 'success');
      onSuccess(profile);
    } catch (err) {
      const msg = err?.message || 'Código de verificação incorreto ou expirado. Verifique os algarismos no e-mail.';
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
      showToast('Novo código de verificação enviado para o seu correio institucional!', 'info', 6000);
      setCountdown(60);
      setOtp(Array(OTP_LENGTH).fill(''));
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
      <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-t-[28px] sm:rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/50 relative max-h-[85vh] overflow-y-auto overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-7 animate-in slide-in-from-bottom duration-300 sm:zoom-in-95">

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
        <div className="text-center mb-5 sm:mb-6">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-2.5 mx-auto text-ucm-emerald border border-emerald-100/80 shadow-xs">
            <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            Verificar Código Institucional
          </h2>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed px-2">
            Introduza o código de 6 dígitos recebido no seu e-mail institucional:
          </p>
          <div className="inline-flex items-center space-x-1.5 mt-2 px-3 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-800 border border-slate-200">
            <Mail className="w-3.5 h-3.5 text-ucm-emerald" />
            <span className="truncate max-w-[260px]">{email}</span>
          </div>
        </div>

        {/* Formulário de OTP com 6 dígitos */}
        <form onSubmit={handleVerify} className="space-y-4 sm:space-y-5">
          <div>
            <div
              className="flex items-center justify-center gap-1.5 sm:gap-2.5"
              onPaste={handlePaste}
            >
              {otp.map((digit, index) => (
                <React.Fragment key={index}>
                  {index === 3 && (
                    <span className="text-slate-300 font-bold select-none px-0.5 sm:px-1 text-base sm:text-lg">-</span>
                  )}
                  <input
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-11 sm:w-13 h-14 sm:h-16 text-center text-xl sm:text-2xl font-black rounded-xl sm:rounded-2xl border transition-all duration-150 focus:outline-none select-none shadow-xs ${
                      digit
                        ? 'border-ucm-emerald bg-emerald-50/25 text-slate-900 focus:ring-2 focus:ring-ucm-emerald'
                        : 'border-slate-300 bg-white text-slate-900 focus:border-ucm-emerald focus:ring-2 focus:ring-ucm-emerald/40'
                    } ${errorMessage ? 'border-rose-400 bg-rose-50/30' : ''}`}
                    aria-label={`Dígito ${index + 1}`}
                  />
                </React.Fragment>
              ))}
            </div>

            {/* Ações Rápidas: Limpar Código + Mensagem de Erro/Dica Sem CLS */}
            <div className="flex items-center justify-between mt-3 px-2">
              <span className="text-[11px] text-slate-400">
                {otpCode.length > 0 ? `${otpCode.length}/${OTP_LENGTH} algarismos` : 'Pode digitar ou colar o código de 6 dígitos'}
              </span>
              {otpCode.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 flex items-center transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            {/* Feedback de erro */}
            <div className="min-h-[22px] mt-1 flex items-center justify-center text-center px-2">
              {errorMessage ? (
                <p className="text-[11px] font-bold text-rose-600 flex items-center animate-in fade-in duration-200">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                  <span>{errorMessage}</span>
                </p>
              ) : null}
            </div>
          </div>

          {/* Botão de Verificação */}
          <button
            type="submit"
            disabled={!isValidLength || isSubmitting}
            className={`w-full py-3.5 px-4 font-bold rounded-2xl text-sm min-h-[48px] shadow-md transition-all duration-200 active:scale-[0.97] flex items-center justify-center relative cursor-pointer ${
              !isValidLength || isSubmitting
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
          <div className="pt-3 border-t border-slate-100 space-y-2.5 text-center">
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

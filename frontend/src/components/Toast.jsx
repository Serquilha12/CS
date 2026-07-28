import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;

  const styles = {
    success: {
      bg: 'bg-slate-900 border-emerald-500/50 text-white',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
    },
    error: {
      bg: 'bg-slate-900 border-rose-500/50 text-white',
      icon: <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
    },
    warning: {
      bg: 'bg-slate-900 border-amber-500/50 text-white',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
    },
    info: {
      bg: 'bg-slate-900 border-blue-500/50 text-white',
      icon: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
    }
  };

  const currentStyle = styles[type] || styles.info;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center p-4 rounded-2xl shadow-2xl toast-enter space-x-3 border max-w-md w-11/12 backdrop-blur-md bg-slate-900/95 text-white">
      {currentStyle.icon}
      <span className="text-sm font-medium flex-1 leading-snug">{message}</span>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

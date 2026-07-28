import React from 'react';
import { PackageOpen, PlusCircle } from 'lucide-react';

export function EmptyState({ message, actionText, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm my-6 max-w-md mx-auto">
      <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-ucm-emerald mb-4">
        <PackageOpen className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum material encontrado</h3>
      <p className="text-sm text-slate-500 mb-6">{message || "Ainda não há materiais listados nesta categoria."}</p>
      {actionText && (
        <button
          onClick={onAction}
          className="flex items-center px-5 py-3 bg-ucm-emerald hover:bg-ucm-darkEmerald text-white font-semibold text-sm rounded-xl transition-all shadow-md"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          {actionText}
        </button>
      )}
    </div>
  );
}

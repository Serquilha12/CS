import React, { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ShoppingBag, PlusCircle, MessageSquare, ShieldCheck, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export function BottomNavigation() {
  const { user, isAdmin } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return null;

  // Ocultar a barra inferior quando o utilizador está no fluxo de criação de anúncio (/anunciar)
  if (location.pathname === '/anunciar') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-4 py-2 flex justify-around items-center shadow-lg">
      <NavLink
        to="/marketplace"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center p-3 text-xs font-semibold transition-colors min-h-[44px] min-w-[44px] ${
            isActive ? 'text-persian font-bold' : 'text-slate-500 hover:text-slate-800'
          }`
        }
      >
        <ShoppingBag className="w-6 h-6 mb-1" />
        <span>Mercado</span>
      </NavLink>

      <NavLink
        to="/anunciar"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center p-3 text-xs font-semibold transition-colors min-h-[44px] min-w-[44px] ${
            isActive ? 'text-persian font-bold' : 'text-slate-500 hover:text-slate-800'
          }`
        }
      >
        <PlusCircle className="w-6 h-6 mb-1 text-carrot" />
        <span>Anunciar</span>
      </NavLink>

      <NavLink
        to="/chat"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center p-3 text-xs font-semibold transition-colors min-h-[44px] min-w-[44px] ${
            isActive ? 'text-persian font-bold' : 'text-slate-500 hover:text-slate-800'
          }`
        }
      >
        <MessageSquare className="w-6 h-6 mb-1" />
        <span>Chat</span>
      </NavLink>

      <NavLink
        to="/perfil"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center p-3 text-xs font-semibold transition-colors min-h-[44px] min-w-[44px] ${
            isActive ? 'text-persian font-bold' : 'text-slate-500 hover:text-slate-800'
          }`
        }
      >
        <User className="w-6 h-6 mb-1" />
        <span>Perfil</span>
      </NavLink>

      {isAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-3 text-xs font-semibold transition-colors min-h-[44px] min-w-[44px] ${
              isActive ? 'text-persian font-bold' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <ShieldCheck className="w-6 h-6 mb-1 text-carrot" />
          <span>Painel</span>
        </NavLink>
      )}
    </nav>
  );
}

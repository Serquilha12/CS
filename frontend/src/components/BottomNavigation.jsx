import React, { useContext } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, MessageSquare, ShieldCheck, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useScrollDirection } from '../hooks/useScrollDirection';

export function BottomNavigation() {
  const { user, isAdmin } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const isNavVisible = useScrollDirection({ threshold: 12, topOffset: 40 });

  if (!user) return null;

  // Ocultar a barra inferior na Landing Page e reset de palavra-passe
  if (location.pathname === '/' || location.pathname === '/reset-password') return null;

  return (
    <nav
      aria-label="Navegação Principal"
      className={`fixed bottom-4 left-4 right-4 mx-auto max-w-sm bg-white/95 backdrop-blur-md shadow-2xl shadow-slate-300/40 rounded-full border border-slate-100 px-4 sm:px-6 py-2 z-50 flex items-center justify-around transition-all duration-300 ease-out select-none ${
        isNavVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      {/* 1. Mercado */}
      <NavLink
        to="/marketplace"
        title="Mercado Académico"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] rounded-full transition-transform active:scale-90 duration-150 relative ${
            isActive ? 'text-blue-900' : 'text-slate-400 hover:text-slate-600'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <ShoppingBag className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            {isActive ? (
              <span className="w-1.5 h-1.5 bg-blue-900 rounded-full mt-1 animate-in zoom-in duration-200" />
            ) : (
              <span className="text-[10px] font-bold mt-0.5 tracking-tight">Mercado</span>
            )}
          </>
        )}
      </NavLink>

      {/* 2. Chat */}
      <NavLink
        to="/chat"
        title="Mensagens do Chat"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] rounded-full transition-transform active:scale-90 duration-150 relative ${
            isActive ? 'text-blue-900' : 'text-slate-400 hover:text-slate-600'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <MessageSquare className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            {isActive ? (
              <span className="w-1.5 h-1.5 bg-blue-900 rounded-full mt-1 animate-in zoom-in duration-200" />
            ) : (
              <span className="text-[10px] font-bold mt-0.5 tracking-tight">Chat</span>
            )}
          </>
        )}
      </NavLink>

      {/* 3. BOTÃO CENTRAL DE ALTO IMPACTO: ANUNCIAR (FLOATING CTA) */}
      <div className="relative flex items-center justify-center px-1">
        <NavLink
          to="/anunciar"
          title="Publicar Novo Material"
          className="w-12 h-12 rounded-full bg-blue-900 hover:bg-blue-800 active:scale-90 text-white flex items-center justify-center -translate-y-2 shadow-lg shadow-blue-900/35 border-2 border-white transition-all duration-150 group cursor-pointer"
        >
          <Plus className="w-6 h-6 stroke-[3] text-ucm-gold group-hover:rotate-90 transition-transform duration-200" />
        </NavLink>
      </div>

      {/* 4. Painel Admin (se administrador) */}
      {isAdmin && (
        <NavLink
          to="/admin"
          title="Painel de Administração"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] rounded-full transition-transform active:scale-90 duration-150 relative ${
              isActive ? 'text-blue-900' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <ShieldCheck className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5] scale-105 text-amber-600' : 'stroke-[1.8]'}`} />
              {isActive ? (
                <span className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-1 animate-in zoom-in duration-200" />
              ) : (
                <span className="text-[10px] font-bold mt-0.5 tracking-tight">Admin</span>
              )}
            </>
          )}
        </NavLink>
      )}

      {/* 5. Perfil */}
      <NavLink
        to="/perfil"
        title="Meu Perfil"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] rounded-full transition-transform active:scale-90 duration-150 relative ${
            isActive ? 'text-blue-900' : 'text-slate-400 hover:text-slate-600'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <User className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            {isActive ? (
              <span className="w-1.5 h-1.5 bg-blue-900 rounded-full mt-1 animate-in zoom-in duration-200" />
            ) : (
              <span className="text-[10px] font-bold mt-0.5 tracking-tight">Perfil</span>
            )}
          </>
        )}
      </NavLink>
    </nav>
  );
}

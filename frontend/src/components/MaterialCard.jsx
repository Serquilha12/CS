import React, { useState } from 'react';
import { Heart, BookOpen, ArrowRight } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

export function MaterialCard({ item, onClick, onActionClick, onFavoriteToggle, isFavorite = false, actionText = 'Solicitar Reserva / Negociar' }) {
  const [favorite, setFavorite] = useState(isFavorite);
  const [imageError, setImageError] = useState(false);

  function handleHeartClick(e) {
    e.stopPropagation();
    const nextState = !favorite;
    setFavorite(nextState);
    if (onFavoriteToggle) {
      onFavoriteToggle(item, nextState);
    }
  }

  function handleButtonClick(e) {
    e.stopPropagation();
    if (onActionClick) {
      onActionClick(item);
    } else if (onClick) {
      onClick(item);
    }
  }

  const isFree = item.transaction_type === 'doacao' || item.transaction_type === 'emprestimo' || item.price_mzn === 0;

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-[28px] border border-slate-200/70 shadow-md hover:shadow-2xl hover:border-persian/40 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden transform hover:-translate-y-1"
    >
      {/* Área da Imagem do Material com Gradiente Persian Blue / Slate */}
      <div className="relative w-full h-56 bg-slate-900 overflow-hidden">
        {item.images?.[0] && !imageError ? (
          <img
            src={getOptimizedImageUrl(item.images[0], 400, 300)}
            alt={item.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-persian-dark via-persian to-slate-900 flex flex-col items-center justify-center p-4 text-center">
            <BookOpen className="w-12 h-12 text-white/50 mb-2" />
            <span className="text-xs font-semibold text-white/70">Sem imagem prévia</span>
          </div>
        )}

        {/* Gradiente sutil inferior na imagem para legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-black/20 pointer-events-none" />

        {/* Badge do Tipo de Transação (Canto Superior Esquerdo) com Destaque Carrot ou Persian */}
        <div className="absolute top-3 left-3 flex flex-col space-y-1.5 z-10">
          <span className="px-3 py-1 bg-persian/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/20 shadow-sm">
            {item.transaction_type}
          </span>
          {item.status === 'negotiating' && (
            <span className="px-2.5 py-0.5 bg-carrot text-white text-[10px] font-bold rounded-md shadow-xs">
              Em Negociação
            </span>
          )}
        </div>

        {/* Botão Favorito / Heart (Canto Superior Direito) */}
        <button
          type="button"
          onClick={handleHeartClick}
          className="absolute top-3 right-3 p-2.5 rounded-full bg-slate-900/40 backdrop-blur-md hover:bg-slate-900/70 text-white border border-white/20 shadow-md transition-all active:scale-90 flex items-center justify-center min-w-[40px] min-h-[40px] z-10"
          title={favorite ? 'Remover dos Favoritos' : 'Guardar nos Favoritos'}
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              favorite ? 'text-rose-500 fill-rose-500' : 'text-white hover:text-carrot'
            }`}
          />
        </button>
      </div>

      {/* Conteúdo Principal do Card (Corpo Branco Estilo Card) */}
      <div className="p-5 flex flex-col flex-1 justify-between space-y-3 bg-white">
        <div>
          {/* Título do Material */}
          <h3 className="font-extrabold text-slate-900 text-lg tracking-tight line-clamp-1 mb-2 group-hover:text-persian transition-colors">
            {item.title}
          </h3>

          {/* Tags / Pills de Informação do Material em tom Platinum (#EEEEEE) */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {item.category && (
              <span className="px-2.5 py-1 bg-platinum text-slate-800 text-[10px] font-black uppercase tracking-wider rounded-md border border-slate-300/80">
                {item.category}
              </span>
            )}
            {item.condition && (
              <span className="px-2.5 py-1 bg-platinum text-slate-800 text-[10px] font-black uppercase tracking-wider rounded-md border border-slate-300/80">
                {item.condition}
              </span>
            )}
            {item.course && (
              <span className="px-2.5 py-1 bg-persian-light text-persian text-[10px] font-extrabold rounded-md border border-persian/20 line-clamp-1">
                {item.course}
              </span>
            )}
          </div>

          {/* Descrição Curta do Material */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
            {item.description || 'Sem descrição detalhada disponível.'}
          </p>
        </div>

        {/* Rodapé do Card: Preço e Botão de Ação */}
        <div className="pt-3 border-t border-slate-100 flex items-end justify-between mt-auto">
          {/* Lado Esquerdo: Rótulo "PREÇO" e Valor */}
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">
              PREÇO
            </span>
            <span className="text-lg font-black tracking-tight text-slate-900">
              {isFree ? (
                <span className="text-carrot font-extrabold">Grátis</span>
              ) : (
                `${item.price_mzn} MZN`
              )}
            </span>
          </div>

          {/* Lado Direito: Botão no tom Persian Blue (#0038BC) com hover ativo */}
          <button
            type="button"
            onClick={handleButtonClick}
            className="px-4 py-2.5 bg-persian hover:bg-persian-hover text-white font-extrabold text-xs rounded-xl shadow-md shadow-persian/20 hover:shadow-persian/40 transition-all flex items-center space-x-1.5 active:scale-95 min-h-[40px]"
          >
            <span>{actionText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

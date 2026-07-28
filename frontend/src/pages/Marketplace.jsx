import React, { useState, useEffect } from 'react';
import { Search, MapPin, Tag, Filter, Bell } from 'lucide-react';
import { useListings } from '../hooks/useListings';
import { useToast } from '../context/ToastContext';
import { MarketplaceSkeletonGrid } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import { CreateListingWizard } from '../components/CreateListingWizard';
import { CATEGORIES, TRANSACTION_TYPES } from '../constants';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import { useNavigate } from 'react-router-dom';

export function Marketplace() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { listings, loading, createListing, refresh } = useListings({
    category: selectedCategory,
    search: searchTerm
  });

  // Filtragem no cliente por Tipo de Ação
  const filteredListings = listings.filter((item) => {
    if (!selectedActionType) return true;
    return item.transaction_type === selectedActionType;
  });

  async function handleWizardSubmit(data) {
    try {
      await createListing(data);
      showToast('Anúncio publicado com sucesso no mercado UCM!', 'success');
      setIsWizardOpen(false);
      refresh();
    } catch (e) {
      showToast(e.message || 'Erro ao publicar anúncio. Verifique os dados.', 'error');
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Header do Marketplace */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mercado Académico UCM</h1>
          <p className="text-xs text-slate-500">Comunidade Pemba • Compra, Troca, Doação e Empréstimo</p>
        </div>

        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-4 py-2.5 bg-ucm-emerald hover:bg-ucm-darkEmerald text-white font-bold rounded-2xl shadow-md text-xs transition-all flex items-center"
        >
          + Anunciar Material
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar manuais, calculadoras, batas de laboratório..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none text-sm"
        />
      </div>

      {/* Filtro por Tipo de Ação (Venda, Troca, Doação, Empréstimo) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center pr-1">
          <Filter className="w-3 h-3 mr-1" /> Ação:
        </span>
        <button
          onClick={() => setSelectedActionType('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedActionType === ''
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Todas as Ações
        </button>
        {TRANSACTION_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedActionType(type.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all capitalize ${
              selectedActionType === type.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Pill Filters (Categorias) */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === ''
              ? 'bg-ucm-emerald text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Todas as Categorias
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-ucm-emerald text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Modal Wizard de Criar Anúncio */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <CreateListingWizard
            onSubmit={handleWizardSubmit}
            onCancel={() => setIsWizardOpen(false)}
          />
        </div>
      )}

      {/* Lista de Anúncios */}
      {loading ? (
        <MarketplaceSkeletonGrid />
      ) : filteredListings.length === 0 ? (
        <EmptyState
          message="Nenhum material listado com estes filtros."
          actionText="Ser o primeiro a Anunciar"
          onAction={() => setIsWizardOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="relative">
                  <img
                    src={getOptimizedImageUrl(item.images?.[0], 400, 300)}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-40 object-cover rounded-xl mb-3 bg-slate-100"
                  />
                  <span className="absolute top-2 left-2 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold rounded-lg uppercase">
                    {item.transaction_type}
                  </span>
                  {item.status === 'negotiating' && (
                    <span className="absolute top-2 right-2 px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-lg shadow-sm">
                      Negociação em Curso
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="flex items-center font-medium">
                    <Tag className="w-3.5 h-3.5 mr-1 text-ucm-emerald" /> {item.category}
                  </span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600">
                    {item.condition}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-base line-clamp-1 mb-1">{item.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{item.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-lg font-extrabold text-ucm-emerald">
                  {item.transaction_type === 'doacao' || item.transaction_type === 'emprestimo'
                    ? 'Grátis'
                    : `${item.price_mzn} MZN`}
                </span>
                <span className="text-xs text-slate-400 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" /> {item.campus_location || 'Campus Pemba'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

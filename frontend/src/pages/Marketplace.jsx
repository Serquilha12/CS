import React, { useState, useEffect, useContext } from 'react';
import { Search, MapPin, Tag, Filter, SlidersHorizontal, Bell, Plus, X } from 'lucide-react';
import { useListings } from '../hooks/useListings';
import { useToast } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';
import { fetchApi } from '../services/api';
import { MarketplaceSkeletonGrid } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import { CreateListingWizard } from '../components/CreateListingWizard';
import { MaterialCard } from '../components/MaterialCard';
import { CATEGORIES, TRANSACTION_TYPES } from '../constants';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import { useNavigate, useLocation } from 'react-router-dom';

export function Marketplace() {
  const { user } = useContext(AuthContext);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [isWizardOpen, setIsWizardOpen] = useState(location.pathname === '/anunciar');

  useEffect(() => {
    if (location.pathname === '/anunciar') {
      setIsWizardOpen(true);
    }
  }, [location.pathname]);

  const { listings, loading, createListing, refresh } = useListings({
    category: selectedCategory,
    search: searchTerm
  });

  // Filtragem no cliente por Tipo de Ação e Pesquisa Multi-campo
  const filteredListings = listings.filter((item) => {
    if (item.status === 'reserved' || item.status === 'sold' || item.status === 'removed' || item.status === 'suspended') return false;

    if (selectedActionType && item.transaction_type !== selectedActionType) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const titleMatch = item.title?.toLowerCase().includes(term);
      const descMatch = item.description?.toLowerCase().includes(term);
      const catMatch = item.category?.toLowerCase().includes(term);
      const courseMatch = item.course?.toLowerCase().includes(term);
      const condMatch = item.condition?.toLowerCase().includes(term);
      const locMatch = item.campus_location?.toLowerCase().includes(term);

      if (!titleMatch && !descMatch && !catMatch && !courseMatch && !condMatch && !locMatch) {
        return false;
      }
    }

    return true;
  });

  async function handleActionClick(item) {
    if (!user) {
      showToast('Inicie sessão para solicitar reserva e negociar materiais.', 'warning');
      navigate('/login');
      return;
    }

    if (item.owner_id === user.id) {
      showToast('Este é o seu próprio anúncio.', 'info');
      navigate(`/item/${item.id}`);
      return;
    }

    try {
      showToast('A iniciar negociação e solicitar reserva...', 'info');
      const res = await fetchApi('/reservations', {
        method: 'POST',
        body: {
          listing_id: item.id,
          seller_id: item.owner_id,
          agreed_price_mzn: item.price_mzn,
          meeting_point: item.campus_location || 'Biblioteca Central'
        }
      });

      if (res.success) {
        showToast('Reserva solicitada! A abrir a conversa em tempo real no Chat...', 'success');
        navigate('/chat', { state: { listing: { ...item, status: 'negotiating' } } });
      }
    } catch (err) {
      showToast(err.message || 'Erro ao iniciar negociação.', 'error');
    }
  }

  function handleCloseWizard() {
    setIsWizardOpen(false);
    if (location.pathname === '/anunciar') {
      navigate('/marketplace');
    }
  }

  async function handleWizardSubmit(data) {
    try {
      await createListing(data);
      showToast('Anúncio publicado com sucesso no mercado UCM!', 'success');
      handleCloseWizard();
      refresh();
    } catch (e) {
      showToast(e.message || 'Erro ao publicar anúncio. Verifique os dados.', 'error');
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 pb-28 relative">
      {/* Header do Marketplace com Alertas Bell */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mercado Académico UCM</h1>
          <p className="text-xs text-slate-500">Comunidade Pemba • Compra, Troca, Doação e Empréstimo</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Botão de Notificação de Alertas da Turma */}
          <button
            onClick={() => showToast('Sem novas notificações no seu curso.', 'info')}
            className="p-3 bg-white border border-slate-200 text-slate-600 hover:text-persian rounded-2xl shadow-xs transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Notificações do Curso"
          >
            <Bell className="w-5 h-5 text-slate-600" />
          </button>

          {/* Botão Anunciar no Desktop (Persian Blue #0038BC com destaque Carrot) */}
          <button
            onClick={() => setIsWizardOpen(true)}
            className="hidden sm:flex px-4 py-2.5 bg-persian hover:bg-persian-hover text-white font-bold rounded-2xl shadow-md text-xs transition-all items-center min-h-[44px]"
          >
            <Plus className="w-4 h-4 mr-1.5 text-carrot" /> Anunciar Material
          </button>
        </div>
      </div>

      {/* Barra de Pesquisa 100% Funcional com Ícone Lupa e Botão Limpar (X) */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar manuais, calculadoras, batas, curso..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-persian focus:border-persian focus:outline-none text-base sm:text-sm min-h-[48px] transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors min-h-[30px] min-w-[30px] flex items-center justify-center"
            title="Limpar pesquisa"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Indicador de Filtro de Pesquisa Ativa */}
      {searchTerm.trim() && (
        <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-medium">
          <span>Resultados para "<strong className="text-slate-900">{searchTerm}</strong>"</span>
          <span className="font-extrabold text-persian">{filteredListings.length} material(ais) encontrado(s)</span>
        </div>
      )}

      {/* Filtro por Tipo de Ação com Ícone SlidersHorizontal / Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center pr-1 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-slate-500" /> Ação:
        </span>
        <button
          onClick={() => setSelectedActionType('')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] flex items-center ${
            selectedActionType === ''
              ? 'bg-persian text-white shadow-sm'
              : 'bg-platinum text-slate-700 border border-slate-300/70 hover:bg-slate-200'
          }`}
        >
          Todas as Ações
        </button>
        {TRANSACTION_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedActionType(type.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all capitalize min-h-[44px] flex items-center ${
              selectedActionType === type.id
                ? 'bg-persian text-white shadow-sm'
                : 'bg-platinum text-slate-700 border border-slate-300/70 hover:bg-slate-200'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Pill Filters (Chips Ovais de Categorias com Touch Target > 44px) */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] flex items-center ${
            selectedCategory === ''
              ? 'bg-persian text-white shadow-md'
              : 'bg-platinum text-slate-700 border border-slate-300/70 hover:bg-slate-200'
          }`}
        >
          Todas as Categorias
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] flex items-center ${
              selectedCategory === cat
                ? 'bg-persian text-white shadow-md'
                : 'bg-platinum text-slate-700 border border-slate-300/70 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Modal Wizard de Criar Anúncio (100% Responsivo: Fullscreen no mobile com z-[60], modal elegante no desktop) */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="w-full h-full sm:h-auto sm:max-w-lg flex items-center justify-center">
            <CreateListingWizard
              onSubmit={handleWizardSubmit}
              onCancel={handleCloseWizard}
            />
          </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((item) => (
            <MaterialCard
              key={item.id}
              item={item}
              onClick={() => navigate(`/item/${item.id}`)}
              onActionClick={handleActionClick}
              actionText="Solicitar Reserva / Negociar"
            />
          ))}
        </div>
      )}

      {/* FLOATING ACTION BUTTON (FAB) FIXO ERGONÓMICO NO CANTO INFERIOR DIREITO PARA TELEMÓVEL */}
      <button
        onClick={() => setIsWizardOpen(true)}
        className="fixed bottom-24 right-4 sm:hidden z-40 bg-persian hover:bg-persian-hover active:scale-95 text-white font-extrabold px-5 py-3.5 rounded-full shadow-2xl shadow-persian/50 flex items-center justify-center space-x-2 border-2 border-white min-h-[52px] min-w-[52px]"
      >
        <Plus className="w-6 h-6 text-carrot stroke-[3]" />
        <span className="text-xs font-black uppercase tracking-wider">Anunciar</span>
      </button>
    </div>
  );
}

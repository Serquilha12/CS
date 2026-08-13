import React, { useState, useEffect, useContext, useRef } from 'react';
import { Search, SlidersHorizontal, Bell, Plus, X, ChevronDown, Check, Tag, Zap } from 'lucide-react';
import { useListings } from '../hooks/useListings';
import { useToast } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';
import { fetchApi } from '../services/api';
import { MarketplaceSkeletonGrid } from '../components/SkeletonLoaders';
import { EmptyState } from '../components/EmptyState';
import { CreateListingWizard } from '../components/CreateListingWizard';
import { MaterialCard } from '../components/MaterialCard';
import { CATEGORIES, TRANSACTION_TYPES } from '../constants';
import { useNavigate, useLocation } from 'react-router-dom';

// Ícones de categoria para chips visuais
const CATEGORY_ICONS = {
  'Manuais e Livros': '📚',
  'Calculadoras': '🔢',
  'Informática & Gadgets': '💻',
  'Material de Desenho': '✏️',
  'Laboratório': '🧪',
  'Outros': '📦',
};

const TRANSACTION_ICONS = {
  'venda': '🛒',
  'troca': '🔄',
  'doacao': '🎁',
  'emprestimo': '🤝',
};

const PRICE_RANGES = [
  { id: 'low', label: 'Até 500 MZN', max: 500, min: 0 },
  { id: 'mid', label: '500 – 1500 MZN', max: 1500, min: 500 },
  { id: 'high', label: 'Mais de 1500 MZN', max: Infinity, min: 1500 },
];

export function Marketplace() {
  const { user } = useContext(AuthContext);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('');
  const [selectedPriceRange, setSelectedPriceRange] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Estado temporário dentro do sheet para preview do contador antes de aplicar
  const [draftActionType, setDraftActionType] = useState('');
  const [draftPriceRange, setDraftPriceRange] = useState('');

  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const sheetRef = useRef(null);

  const [isWizardOpen, setIsWizardOpen] = useState(location.pathname === '/anunciar');

  useEffect(() => {
    if (location.pathname === '/anunciar') {
      setIsWizardOpen(true);
    }
  }, [location.pathname]);

  // Abrir/fechar a gaveta (bottom sheet) com animação
  function openSheet() {
    setDraftActionType(selectedActionType);
    setDraftPriceRange(selectedPriceRange);
    setIsSheetOpen(true);
    requestAnimationFrame(() => setSheetVisible(true));
  }

  function closeSheet() {
    setSheetVisible(false);
    setTimeout(() => setIsSheetOpen(false), 300);
  }

  function applyAdvancedFilters() {
    setSelectedActionType(draftActionType);
    setSelectedPriceRange(draftPriceRange);
    closeSheet();
  }

  function clearAllFilters() {
    setSelectedCategory('');
    setSelectedActionType('');
    setSelectedPriceRange('');
    setDraftActionType('');
    setDraftPriceRange('');
    closeSheet();
  }

  const { listings, loading, createListing, refresh } = useListings({
    category: selectedCategory,
    search: searchTerm
  });

  // Filtragem no cliente — rápida e sem loading
  const filteredListings = listings.filter((item) => {
    if (['reserved', 'sold', 'removed', 'suspended'].includes(item.status)) return false;
    if (selectedActionType && item.transaction_type !== selectedActionType) return false;

    if (selectedPriceRange) {
      const range = PRICE_RANGES.find(r => r.id === selectedPriceRange);
      if (range) {
        const price = Number(item.price_mzn) || 0;
        // Doação e Empréstimo são sempre grátis — ignorar filtro de preço para eles
        const isFree = item.transaction_type === 'doacao' || item.transaction_type === 'emprestimo';
        if (!isFree && (price < range.min || price > range.max)) return false;
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const fields = [item.title, item.description, item.category, item.course, item.condition, item.campus_location];
      if (!fields.some(f => f?.toLowerCase().includes(term))) return false;
    }

    return true;
  });

  // Filtragem identica para o draft (para o contador "Ver X Resultados")
  const draftFilteredCount = listings.filter((item) => {
    if (['reserved', 'sold', 'removed', 'suspended'].includes(item.status)) return false;
    if (draftActionType && item.transaction_type !== draftActionType) return false;

    if (draftPriceRange) {
      const range = PRICE_RANGES.find(r => r.id === draftPriceRange);
      if (range) {
        const price = Number(item.price_mzn) || 0;
        const isFree = item.transaction_type === 'doacao' || item.transaction_type === 'emprestimo';
        if (!isFree && (price < range.min || price > range.max)) return false;
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const fields = [item.title, item.description, item.category, item.course, item.condition, item.campus_location];
      if (!fields.some(f => f?.toLowerCase().includes(term))) return false;
    }

    return true;
  }).length;

  // Contagem de filtros avançados ativos
  const activeAdvancedFiltersCount = [selectedActionType, selectedPriceRange].filter(Boolean).length;
  const hasAnyFilter = selectedCategory || selectedActionType || selectedPriceRange || searchTerm.trim();

  async function handleActionClick(item) {
    if (!user) {
      showToast('Inicie sessão para solicitar reserva e negociar materiais.', 'warning');
      navigate('/login');
      return;
    }

    if (item.owner_id === user?.id) {
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
          agreed_price_mzn: item.price_mzn !== undefined && item.price_mzn !== null ? Number(item.price_mzn) : 0,
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
    if (location.pathname === '/anunciar') navigate('/marketplace');
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
    <div className="max-w-7xl mx-auto pb-28 relative">

      {/* ─── LAYOUT DESKTOP: SIDEBAR + CONTEÚDO ─── */}
      <div className="flex">

        {/* SIDEBAR DE FILTROS (visível apenas a partir de lg) */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-4 self-start pr-6 space-y-6 pt-6 pl-4">
          <div>
            <h2 className="text-base font-black text-slate-900 mb-1">Mercado UCM</h2>
            <p className="text-xs text-slate-400">Filtros de pesquisa</p>
          </div>

          {/* Sidebar: Categorias */}
          <div>
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">Categorias</p>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                  selectedCategory === ''
                    ? 'bg-persian text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>🌐</span>
                <span>Todas</span>
                {selectedCategory === '' && <Check className="w-3.5 h-3.5 ml-auto" />}
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                    selectedCategory === cat
                      ? 'bg-persian text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat] || '📦'}</span>
                  <span className="truncate">{cat}</span>
                  {selectedCategory === cat && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar: Tipo de Transação */}
          <div>
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">Tipo de Negócio</p>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedActionType('')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                  selectedActionType === ''
                    ? 'bg-persian text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>🔍</span><span>Todos</span>
                {selectedActionType === '' && <Check className="w-3.5 h-3.5 ml-auto" />}
              </button>
              {TRANSACTION_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedActionType(type.id === selectedActionType ? '' : type.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                    selectedActionType === type.id
                      ? 'bg-persian text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{TRANSACTION_ICONS[type.id]}</span>
                  <span>{type.label}</span>
                  {selectedActionType === type.id && <Check className="w-3.5 h-3.5 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar: Faixas de Preço */}
          <div>
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">Faixa de Preço</p>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedPriceRange('')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                  selectedPriceRange === ''
                    ? 'bg-persian text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>💰</span><span>Qualquer preço</span>
                {selectedPriceRange === '' && <Check className="w-3.5 h-3.5 ml-auto" />}
              </button>
              {PRICE_RANGES.map((range) => (
                <button
                  key={range.id}
                  onClick={() => setSelectedPriceRange(range.id === selectedPriceRange ? '' : range.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                    selectedPriceRange === range.id
                      ? 'bg-persian text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{range.label}</span>
                  {selectedPriceRange === range.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar: Limpar Filtros */}
          {hasAnyFilter && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-rose-600 underline font-bold text-left hover:text-rose-800 transition-colors"
            >
              Limpar todos os filtros
            </button>
          )}

          {/* Sidebar: Botão Anunciar */}
          <button
            onClick={() => setIsWizardOpen(true)}
            className="w-full py-3 bg-persian hover:bg-persian-hover text-white font-bold rounded-2xl shadow-md text-xs transition-all flex items-center justify-center"
          >
            <Plus className="w-4 h-4 mr-1.5 text-carrot" /> Anunciar Material
          </button>
        </aside>

        {/* ─── COLUNA PRINCIPAL ─── */}
        <div className="flex-1 min-w-0 p-4 space-y-3">

          {/* Header Mobile/Tablet */}
          <div className="flex items-center justify-between pt-1 lg:hidden">
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">Mercado UCM</h1>
              <p className="text-[11px] text-slate-400 font-medium">Pemba · Compra, Troca, Doação, Empréstimo</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => showToast('Sem novas notificações no seu curso.', 'info')}
                className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-persian rounded-2xl shadow-xs transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Notificações"
              >
                <Bell className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsWizardOpen(true)}
                className="hidden sm:flex px-4 py-2.5 bg-persian hover:bg-persian-hover text-white font-bold rounded-2xl shadow-md text-xs items-center min-h-[44px]"
              >
                <Plus className="w-4 h-4 mr-1.5 text-carrot" /> Anunciar
              </button>
            </div>
          </div>

          {/* Header Desktop (dentro da coluna, sem sidebar duplicada) */}
          <div className="hidden lg:flex items-center justify-between pt-2">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Mercado Académico UCM</h1>
              <p className="text-xs text-slate-400">Comunidade Pemba · Compra, Troca, Doação e Empréstimo</p>
            </div>
            <button
              onClick={() => showToast('Sem novas notificações no seu curso.', 'info')}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-persian rounded-2xl shadow-xs transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>

          {/* ─── BARRA DE PESQUISA + BOTÃO FILTRAR ─── */}
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Pesquisar manuais, calculadoras, batas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-persian focus:border-persian focus:outline-none text-sm min-h-[46px] transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Botão Filtrar — só aparece no mobile/tablet */}
            <button
              onClick={openSheet}
              className={`lg:hidden relative flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all min-h-[46px] shadow-xs ${
                activeAdvancedFiltersCount > 0
                  ? 'bg-persian text-white border-persian shadow-persian/30 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Filtros avançados"
            >
              <SlidersHorizontal className={`w-4 h-4 ${activeAdvancedFiltersCount > 0 ? 'text-carrot' : 'text-slate-500'}`} />
              <span className="hidden xs:inline">Filtrar</span>
              {activeAdvancedFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-carrot text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                  {activeAdvancedFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* ─── CHIPS DE CATEGORIAS (carrossel horizontal) ─── */}
          <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
            <button
              onClick={() => setSelectedCategory('')}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all min-h-[36px] flex items-center space-x-1.5 border ${
                selectedCategory === ''
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <span>🌐</span>
              <span>Todos</span>
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all min-h-[36px] flex items-center space-x-1.5 border ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <span>{CATEGORY_ICONS[cat] || '📦'}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>

          {/* ─── LINHA DE ESTADO DOS FILTROS / LIMPAR ─── */}
          {(hasAnyFilter || filteredListings.length !== listings.filter(i => !['reserved','sold','removed','suspended'].includes(i.status)).length) && (
            <div className="flex items-center justify-between px-0.5">
              <p className="text-xs text-slate-500 font-medium">
                {loading ? (
                  <span className="text-slate-400">A carregar...</span>
                ) : (
                  <>
                    <span className="font-extrabold text-slate-800">{filteredListings.length}</span> resultado{filteredListings.length !== 1 ? 's' : ''}
                    {searchTerm && <> para "<span className="font-bold text-persian">{searchTerm}</span>"</>}
                  </>
                )}
              </p>
              {hasAnyFilter && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-rose-600 underline font-bold hover:text-rose-800 transition-colors"
                >
                  Limpar tudo
                </button>
              )}
            </div>
          )}

          {/* ─── GRELHA DE ANÚNCIOS ─── */}
          {loading ? (
            <MarketplaceSkeletonGrid />
          ) : filteredListings.length === 0 ? (
            <EmptyState
              message="Nenhum material encontrado com estes filtros."
              actionText="Ser o primeiro a Anunciar"
              onAction={() => setIsWizardOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
              {filteredListings.map((item) => (
                <MaterialCard
                  key={item.id}
                  item={item}
                  onClick={() => navigate(`/item/${item.id}`)}
                  onActionClick={handleActionClick}
                  actionText="Solicitar / Negociar"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL WIZARD DE CRIAR ANÚNCIO ─── */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="w-full h-full sm:h-auto sm:max-w-lg flex items-center justify-center">
            <CreateListingWizard onSubmit={handleWizardSubmit} onCancel={handleCloseWizard} />
          </div>
        </div>
      )}

      {/* ─── FAB MOBILE ─── */}
      <button
        onClick={() => setIsWizardOpen(true)}
        className="fixed bottom-24 right-4 sm:hidden z-40 bg-persian hover:bg-persian-hover active:scale-95 text-white font-extrabold px-5 py-3.5 rounded-full shadow-2xl shadow-persian/50 flex items-center space-x-2 border-2 border-white min-h-[52px]"
      >
        <Plus className="w-5 h-5 text-carrot stroke-[3]" />
        <span className="text-xs font-black uppercase tracking-wider">Anunciar</span>
      </button>

      {/* ─── BOTTOM SHEET DE FILTROS AVANÇADOS (mobile/tablet) ─── */}
      {isSheetOpen && (
        <>
          {/* Overlay */}
          <div
            className={`fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${sheetVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeSheet}
          />

          {/* Gaveta */}
          <div
            ref={sheetRef}
            className={`fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out max-h-[90vh] overflow-hidden ${sheetVisible ? 'translate-y-0' : 'translate-y-full'}`}
          >
            {/* Handle de arrastar */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-5 pb-4 shrink-0 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900 flex items-center">
                <SlidersHorizontal className="w-4 h-4 mr-2 text-persian" />
                Filtros Avançados
              </h2>
              <button
                onClick={closeSheet}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo da Gaveta — scrollável */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

              {/* Secção: Tipo de Negócio */}
              <div>
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-3">
                  Tipo de Negócio
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[{ id: '', label: '🔍 Todos' }, ...TRANSACTION_TYPES.map(t => ({ id: t.id, label: `${TRANSACTION_ICONS[t.id]} ${t.label}` }))].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setDraftActionType(type.id)}
                      className={`py-3 px-4 rounded-2xl text-xs font-bold border-2 transition-all min-h-[48px] flex items-center justify-center text-center ${
                        draftActionType === type.id
                          ? 'bg-persian text-white border-persian shadow-md shadow-persian/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-persian/50 hover:bg-persian-light/30'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secção: Faixa de Preço */}
              <div>
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-3">
                  Faixa de Preço
                </p>
                <div className="space-y-2">
                  {[{ id: '', label: '💰 Qualquer preço' }, ...PRICE_RANGES].map((range) => (
                    <button
                      key={range.id}
                      onClick={() => setDraftPriceRange(range.id)}
                      className={`w-full py-3 px-4 rounded-2xl text-xs font-bold border-2 transition-all min-h-[48px] flex items-center justify-between ${
                        draftPriceRange === range.id
                          ? 'bg-persian text-white border-persian shadow-md shadow-persian/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-persian/50 hover:bg-persian-light/30'
                      }`}
                    >
                      <span>{range.label}</span>
                      {draftPriceRange === range.id && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Rodapé com botões de ação */}
            <div className="px-5 pt-3 pb-6 space-y-2.5 border-t border-slate-100 shrink-0 bg-white">
              <button
                onClick={applyAdvancedFilters}
                className="w-full py-4 bg-persian hover:bg-persian-hover text-white font-extrabold rounded-2xl text-sm shadow-lg shadow-persian/30 transition-all active:scale-[.98] min-h-[52px] flex items-center justify-center"
              >
                <Zap className="w-4 h-4 mr-2 text-carrot" />
                {isSheetOpen ? `Ver ${draftFilteredCount} Resultado${draftFilteredCount !== 1 ? 's' : ''}` : 'Aplicar Filtros'}
              </button>

              {(draftActionType || draftPriceRange) && (
                <button
                  onClick={() => { setDraftActionType(''); setDraftPriceRange(''); }}
                  className="w-full py-3 text-rose-600 font-bold text-xs underline hover:text-rose-800 transition-colors"
                >
                  Limpar filtros avançados
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

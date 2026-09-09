import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Tag, MapPin, Calendar, MessageSquare, ShoppingCart, UserCheck, ArrowLeft, 
  Share2, Flag, Loader2, CheckCircle2, ShieldCheck, X, DollarSign, Repeat 
} from 'lucide-react';
import { fetchApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

const SAFE_MEETING_POINTS = [
  'Biblioteca Central - UCM Pemba',
  'Cantina Universitária / Esplanada',
  'Bloco A - Secretaria Académica',
  'Faculdade de Gestão e Economia (FGE)',
  'Entrada Principal / Portaria UCM',
  'Outro local seguro no campus'
];

export function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);

  // Estados do Modal de Reserva / Ponto de Encontro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeetingPoint, setSelectedMeetingPoint] = useState(SAFE_MEETING_POINTS[0]);
  const [customMeetingPoint, setCustomMeetingPoint] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [exchangeItemProposal, setExchangeItemProposal] = useState('');
  const [initialMessage, setInitialMessage] = useState('');

  useEffect(() => {
    loadListing();
  }, [id]);

  async function loadListing() {
    try {
      setLoading(true);
      const res = await fetchApi(`/listings/${id}`);
      if (res.success) {
        setListing(res.data);
        setProposedPrice(res.data.price_mzn !== undefined ? String(res.data.price_mzn) : '0');
        if (res.data.campus_location && SAFE_MEETING_POINTS.includes(res.data.campus_location)) {
          setSelectedMeetingPoint(res.data.campus_location);
        }
      }
    } catch (err) {
      showToast(err.message || 'Erro ao carregar detalhes do anúncio.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenReservationModal() {
    if (!user) {
      showToast('Inicie sessão para solicitar reserva de materiais.', 'warning');
      navigate('/');
      return;
    }

    if (listing?.owner_id === user?.id) {
      showToast('Este é o seu próprio anúncio.', 'info');
      return;
    }

    if (['reserved', 'sold', 'completed', 'removed', 'suspended'].includes(listing?.status)) {
      showToast('Este artigo já não se encontra disponível para reserva.', 'error');
      return;
    }

    setIsModalOpen(true);
  }

  async function handleSubmitReservation(e) {
    e.preventDefault();

    const finalMeetingPoint = selectedMeetingPoint === 'Outro local seguro no campus'
      ? (customMeetingPoint.trim() || 'Biblioteca Central - UCM Pemba')
      : selectedMeetingPoint;

    const finalPrice = listing.transaction_type === 'venda'
      ? (proposedPrice ? Number(proposedPrice) : listing.price_mzn)
      : 0;

    let messageToSend = initialMessage.trim();
    if (listing.transaction_type === 'troca' && exchangeItemProposal.trim()) {
      messageToSend = `[Item para Troca]: ${exchangeItemProposal.trim()}` + (messageToSend ? `\n\n${messageToSend}` : '');
    }

    try {
      setReserving(true);
      const res = await fetchApi('/reservations', {
        method: 'POST',
        body: {
          listing_id: id,
          seller_id: listing.owner_id,
          agreed_price_mzn: finalPrice,
          meeting_point: finalMeetingPoint,
          initial_message: messageToSend
        }
      });

      if (res.success) {
        showToast('Solicitação de reserva submetida com sucesso! A abrir a conversa no Chat...', 'success');
        setIsModalOpen(false);
        navigate('/chat', { state: { listing } });
      }
    } catch (err) {
      showToast(err.message || 'Erro ao solicitar reserva (Concorrência).', 'error');
    } finally {
      setReserving(false);
    }
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: listing?.title || 'CampusStore UCM',
        text: `Encontrei este artigo na CampusStore UCM: ${listing?.title}`,
        url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      showToast('Link do anúncio copiado para a área de transferência! Partilhe no grupo da turma.', 'info');
    }
  }

  async function handleReport() {
    const reason = window.prompt(
      'Motivo da denúncia ao Moderador UCM Pemba (Ex: Material inapropriado, Preço enganoso, Spam, Venda de exames):',
      'Material inapropriado'
    );
    if (!reason) return;

    try {
      await fetchApi('/admin/reports', {
        method: 'POST',
        body: {
          listing_id: listing.id,
          reported_user_id: listing.owner_id,
          reason,
          details: `Denúncia registada no anúncio "${listing.title}" (ID: ${listing.id})`
        }
      });
      showToast('Denúncia enviada à equipa de moderação da UCM Pemba com sucesso.', 'success');
    } catch (e) {
      showToast(e.message || 'Erro ao enviar denúncia.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-ucm-emerald animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-semibold">A carregar detalhes do material...</p>
      </div>
    );
  }

  if (!listing) return null;

  const isOwner = listing.owner_id === user?.id;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4 pb-28">
      {/* Cabeçalho de Navegação Móvel com Voltar (ArrowLeft), Partilhar (Share2) e Denunciar (Flag) */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shadow-xs"
          title="Voltar ao Mercado"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="text-xs font-bold">Voltar</span>
        </button>

        <div className="flex items-center space-x-2">
          {/* Botão de Partilha Rápida para o Grupo de WhatsApp da Turma */}
          <button
            onClick={handleShare}
            className="p-2 bg-white border border-slate-200 text-slate-700 hover:text-ucm-emerald rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shadow-xs"
            title="Partilhar no WhatsApp da Turma"
          >
            <Share2 className="w-4 h-4 text-slate-600" />
          </button>

          {/* Botão Discreto de Denúncia */}
          <button
            onClick={handleReport}
            className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center border border-slate-200"
            title="Denunciar Anúncio Impróprio"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Imagem do Anúncio */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm border border-slate-100 bg-slate-100 h-64">
        <img
          src={getOptimizedImageUrl(listing.images?.[0], 800, 600)}
          alt={listing.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <span className="absolute top-3 left-3 px-3 py-1 bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold rounded-xl uppercase">
          {listing.transaction_type}
        </span>
        {listing.status === 'negotiating' && (
          <span className="absolute top-3 right-3 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-xl shadow-sm">
            Negociação em Curso
          </span>
        )}
      </div>

      {/* Detalhes do Artigo */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold text-ucm-emerald">
            {listing.transaction_type === 'doacao' || listing.transaction_type === 'emprestimo'
              ? 'Grátis'
              : `${listing.price_mzn} MZN`}
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
            {listing.condition}
          </span>
        </div>

        <h1 className="text-xl font-bold text-slate-800">{listing.title}</h1>
        <p className="text-sm text-slate-600 leading-relaxed">{listing.description}</p>

        <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
          <p className="flex items-center">
            <Tag className="w-4 h-4 mr-2 text-ucm-emerald" /> <strong>Categoria:</strong> {listing.category}
          </p>
          <p className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-ucm-emerald" /> <strong>Ponto de Encontro:</strong> {listing.campus_location}
          </p>
          <p className="flex items-center">
            <UserCheck className="w-4 h-4 mr-2 text-ucm-emerald" /> <strong>Vendedor:</strong> {listing.profiles?.full_name || 'Estudante UCM'}
          </p>
        </div>

        {/* Botões de Ação Inline (Desktop) */}
        {!isOwner && (
          <div className="hidden sm:flex pt-4 border-t border-slate-100 space-x-2">
            <button
              onClick={handleOpenReservationModal}
              disabled={reserving}
              className="flex-1 py-3.5 bg-blue-900 hover:bg-blue-800 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-blue-900/25 transition-all flex items-center justify-center min-h-[48px] active:scale-95"
            >
              {reserving ? <Loader2 className="w-4 h-4 animate-spin text-ucm-gold" /> : <ShoppingCart className="w-4 h-4 mr-2 text-ucm-gold" />}
              Reservar / Combinar Encontro
            </button>

            <button
              onClick={() => navigate('/chat', { state: { listing } })}
              className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-colors flex items-center justify-center min-h-[48px]"
            >
              <MessageSquare className="w-4 h-4 mr-1.5 text-blue-900" /> Conversar
            </button>
          </div>
        )}
      </div>

      {/* BARRA FIXA DE AÇÃO NO FUNDO DO ECRÃ EM TELEMÓVEL (MOBILE BOTTOM CTA) */}
      {!isOwner && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 flex space-x-2 shadow-2xl">
          <button
            onClick={handleOpenReservationModal}
            disabled={reserving}
            className="flex-1 py-3.5 bg-blue-900 hover:bg-blue-800 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center min-h-[48px] active:scale-95"
          >
            {reserving ? <Loader2 className="w-4 h-4 animate-spin text-ucm-gold" /> : <ShoppingCart className="w-4 h-4 mr-2 text-ucm-gold" />}
            Reservar / Combinar Encontro
          </button>

          <button
            onClick={() => navigate('/chat', { state: { listing } })}
            className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center min-h-[48px]"
            title="Chat Privado"
          >
            <MessageSquare className="w-5 h-5 text-blue-900" />
          </button>
        </div>
      )}

      {/* ─── MODAL DE RESERVA E PONTO DE ENCONTRO SEGURO UCM ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5 animate-in zoom-in-95 duration-200">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-900/10 text-blue-900 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5 text-blue-900" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 leading-tight">Reservar Artigo</h2>
                  <p className="text-xs text-slate-400">Ponto de Encontro Seguro UCM</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Artigo */}
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <img
                src={getOptimizedImageUrl(listing.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80')}
                alt={listing.title}
                className="w-14 h-14 object-cover rounded-xl shrink-0 border border-slate-200 bg-white"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold text-slate-800 truncate">{listing.title}</h3>
                <p className="text-[11px] text-slate-500 font-medium">Vendedor: {listing.profiles?.full_name || 'Estudante UCM'}</p>
                <span className="text-xs font-extrabold text-blue-900">
                  {listing.transaction_type === 'venda' ? `${listing.price_mzn} MZN` : listing.transaction_type.toUpperCase()}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitReservation} className="space-y-4">
              {/* Seleção do Ponto de Encontro */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  <MapPin className="w-4 h-4 text-emerald-600 mr-1.5" /> Ponto de Encontro Seguro no Campus
                </label>
                <p className="text-[11px] text-slate-400">
                  As trocas devem ser sempre realizadas dentro do perímetro seguro da UCM Pemba.
                </p>
                <div className="space-y-1.5">
                  {SAFE_MEETING_POINTS.map((pt) => (
                    <label
                      key={pt}
                      className={`flex items-center p-3 rounded-2xl border cursor-pointer transition-all text-xs font-medium ${
                        selectedMeetingPoint === pt
                          ? 'border-blue-900 bg-blue-50/50 text-blue-950 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="meeting_point"
                        value={pt}
                        checked={selectedMeetingPoint === pt}
                        onChange={() => setSelectedMeetingPoint(pt)}
                        className="w-4 h-4 text-blue-900 focus:ring-blue-900 mr-3"
                      />
                      <span>{pt}</span>
                    </label>
                  ))}
                </div>

                {selectedMeetingPoint === 'Outro local seguro no campus' && (
                  <input
                    type="text"
                    required
                    placeholder="Especifique o local seguro na UCM..."
                    value={customMeetingPoint}
                    onChange={(e) => setCustomMeetingPoint(e.target.value)}
                    className="w-full mt-2 p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  />
                )}
              </div>

              {/* Confirmação de Preço / Troca */}
              {listing.transaction_type === 'venda' ? (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                    <DollarSign className="w-4 h-4 text-emerald-600 mr-1.5" /> Confirmar Valor do Acordo (MZN)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    className="w-full p-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    placeholder="Valor em MZN"
                  />
                  <span className="text-[10px] text-slate-400">Preço original do anúncio: {listing.price_mzn} MZN</span>
                </div>
              ) : listing.transaction_type === 'troca' ? (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                    <Repeat className="w-4 h-4 text-sky-600 mr-1.5" /> Item Proposto para Troca
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sebenta de Direito Civil II ou Calculadora FX-82"
                    value={exchangeItemProposal}
                    onChange={(e) => setExchangeItemProposal(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  />
                </div>
              ) : null}

              {/* Mensagem Inicial */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  <MessageSquare className="w-4 h-4 text-indigo-600 mr-1.5" /> Mensagem Inicial ao Vendedor (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Olá! Tenho interesse no material e posso encontrar-me consigo amanhã na biblioteca."
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 resize-none"
                />
              </div>

              {/* Aviso de Concorrência & Segurança */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
                🛡️ <strong>Regra de Equidade:</strong> O registo inicial bloqueia o artigo atomicamente na base de dados para evitar reservas simultâneas (concorrência). A transação definitiva só é selada após a dupla confirmação presencial no campus.
              </div>

              {/* Botões do Formulário */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={reserving}
                  className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reserving}
                  className="flex-1 py-3 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 active:scale-95 shadow-lg shadow-blue-900/30 rounded-2xl transition-all flex items-center justify-center min-h-[44px]"
                >
                  {reserving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5 text-ucm-gold" /> A Submeter...
                    </>
                  ) : (
                    'Confirmar Solicitação'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

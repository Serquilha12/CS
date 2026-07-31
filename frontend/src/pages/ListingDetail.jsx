import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tag, MapPin, Calendar, MessageSquare, ShoppingCart, UserCheck, ArrowLeft, Share2, Flag, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

export function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    loadListing();
  }, [id]);

  async function loadListing() {
    try {
      setLoading(true);
      const res = await fetchApi(`/listings/${id}`);
      if (res.success) {
        setListing(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Erro ao carregar detalhes do anúncio.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleReserveListing() {
    if (!user) {
      showToast('Inicie sessão para solicitar reserva de materiais.', 'warning');
      return;
    }

    try {
      setReserving(true);
      const res = await fetchApi('/reservations', {
        method: 'POST',
        body: {
          listing_id: id,
          seller_id: listing.owner_id,
          agreed_price_mzn: listing.price_mzn,
          meeting_point: listing.campus_location
        }
      });

      if (res.success) {
        showToast('Solicitação de reserva efetuada! A abrir a conversa no Chat...', 'success');
        navigate('/chat', { state: { listing } });
      }
    } catch (err) {
      showToast(err.message || 'Erro ao solicitar reserva.', 'error');
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
              onClick={handleReserveListing}
              disabled={reserving}
              className="flex-1 py-3.5 bg-persian hover:bg-persian-hover text-white font-extrabold rounded-2xl text-xs shadow-md shadow-persian/30 transition-all flex items-center justify-center min-h-[48px]"
            >
              {reserving ? <Loader2 className="w-4 h-4 animate-spin text-carrot" /> : <ShoppingCart className="w-4 h-4 mr-2 text-carrot" />}
              Solicitar Reserva / Negociar
            </button>

            <button
              onClick={() => navigate('/chat', { state: { listing } })}
              className="py-3.5 px-4 bg-platinum hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-colors flex items-center justify-center min-h-[48px]"
            >
              <MessageSquare className="w-4 h-4 mr-1.5 text-persian" /> Conversar
            </button>
          </div>
        )}
      </div>

      {/* BARRA FIXA DE AÇÃO NO FUNDO DO ECRÃ EM TELEMÓVEL (MOBILE BOTTOM CTA) */}
      {!isOwner && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 flex space-x-2 shadow-2xl">
          <button
            onClick={handleReserveListing}
            disabled={reserving}
            className="flex-1 py-3.5 bg-persian hover:bg-persian-hover text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-persian/40 transition-all flex items-center justify-center min-h-[48px]"
          >
            {reserving ? <Loader2 className="w-4 h-4 animate-spin text-carrot" /> : <ShoppingCart className="w-4 h-4 mr-2 text-carrot" />}
            Solicitar Reserva / Negociar
          </button>

          <button
            onClick={() => navigate('/chat', { state: { listing } })}
            className="py-3.5 px-4 bg-platinum hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center min-h-[48px]"
            title="Chat Privado"
          >
            <MessageSquare className="w-5 h-5 text-persian" />
          </button>
        </div>
      )}
    </div>
  );
}

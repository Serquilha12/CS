import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tag, MapPin, Calendar, MessageSquare, ShoppingCart, UserCheck, ArrowLeft, Loader2 } from 'lucide-react';
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
    <div className="max-w-xl mx-auto p-4 space-y-4 pb-24">
      {/* Botão de Voltar */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Mercado
      </button>

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

        {/* Botões de Ação */}
        {!isOwner && (
          <div className="pt-4 border-t border-slate-100 flex space-x-2">
            <button
              onClick={handleReserveListing}
              disabled={reserving}
              className="flex-1 py-3.5 bg-ucm-emerald hover:bg-ucm-darkEmerald text-white font-bold rounded-2xl text-xs shadow-md transition-all flex items-center justify-center min-h-[44px]"
            >
              {reserving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
              Solicitar Reserva
            </button>

            <button
              onClick={() => navigate('/chat', { state: { listing } })}
              className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center min-h-[44px]"
            >
              <MessageSquare className="w-4 h-4 mr-1.5" /> Conversar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

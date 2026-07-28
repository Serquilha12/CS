import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, CheckCircle2, ShieldAlert, XCircle, Clock, CheckCheck, Loader2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useChat } from '../hooks/useChat';
import { fetchApi } from '../services/api';

export function ChatPage() {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const location = useLocation();

  // Caso navegue a partir de um anúncio específico:
  const listingFromState = location.state?.listing || null;

  const [activeListing, setActiveListing] = useState(listingFromState);
  const [reservation, setReservation] = useState(null);
  const [loadingReservation, setLoadingReservation] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const receiverId = listingFromState?.owner_id !== user?.id
    ? listingFromState?.owner_id
    : reservation?.buyer_id;

  const { messages, loading: loadingChat, sendMessage } = useChat({
    listingId: activeListing?.id,
    receiverId
  });

  const [newMessageText, setNewMessageText] = useState('');

  useEffect(() => {
    if (activeListing?.id) {
      loadReservation(activeListing.id);
    }
  }, [activeListing]);

  async function loadReservation(listingId) {
    try {
      setLoadingReservation(true);
      const res = await fetchApi(`/reservations/listing/${listingId}`);
      if (res.success && res.data) {
        setReservation(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReservation(false);
    }
  }

  async function handleAcceptReservation() {
    if (!reservation?.id) return;
    try {
      setActionLoading(true);
      const res = await fetchApi(`/reservations/${reservation.id}/accept`, { method: 'PUT' });
      if (res.success) {
        showToast('Reserva aceite com sucesso! O item está marcado como Reservado.', 'success');
        setReservation(res.data);
        setActiveListing((prev) => ({ ...prev, status: 'reserved' }));
      }
    } catch (err) {
      showToast(err.message || 'Erro ao aceitar reserva.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDoubleConfirm(roleType) {
    if (!reservation?.id) return;
    try {
      setActionLoading(true);
      const res = await fetchApi(`/reservations/${reservation.id}/confirm`, {
        method: 'PUT',
        body: { roleType }
      });
      if (res.success) {
        showToast(res.message, 'success');
        setReservation(res.data);
        if (res.isDoubleConfirmed) {
          setActiveListing((prev) => ({ ...prev, status: 'sold' }));
        }
      }
    } catch (err) {
      showToast(err.message || 'Erro ao confirmar.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelReservation() {
    if (!reservation?.id) return;
    if (!window.confirm('Deseja realmente cancelar esta reserva? O artigo voltará ao mercado.')) return;

    try {
      setActionLoading(true);
      const res = await fetchApi(`/reservations/${reservation.id}/cancel`, { method: 'PUT' });
      if (res.success) {
        showToast('Reserva cancelada. Anúncio devolvido ao feed ativo.', 'info');
        setReservation(res.data);
        setActiveListing((prev) => ({ ...prev, status: 'active' }));
      }
    } catch (err) {
      showToast(err.message || 'Erro ao cancelar reserva.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendSubmit(e) {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    try {
      await sendMessage(newMessageText);
      setNewMessageText('');
    } catch (err) {
      showToast(err.message || 'Erro ao enviar mensagem.', 'error');
    }
  }

  const isSeller = activeListing?.owner_id === user?.id;
  const isBuyer = !isSeller;

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col h-[calc(100vh-80px)]">
      {/* Header Unificado com Ações de Reserva Integradas */}
      {activeListing ? (
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm mb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={activeListing.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'}
                alt={activeListing.title}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div>
                <h2 className="font-bold text-slate-800 text-sm line-clamp-1">{activeListing.title}</h2>
                <p className="text-xs font-bold text-ucm-emerald">
                  {activeListing.transaction_type === 'doacao' || activeListing.transaction_type === 'emprestimo'
                    ? 'Grátis'
                    : `${activeListing.price_mzn} MZN`}
                </p>
              </div>
            </div>

            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full capitalize">
              {activeListing.status || 'Ativo'}
            </span>
          </div>

          {/* BARRA DE AÇÕES INTEGRADAS NO CHAT */}
          {reservation && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between space-x-2">
              {/* Botão Aceitar Reserva (Para o Vendedor se Estiver Pendente) */}
              {isSeller && reservation.status === 'pending' && (
                <button
                  onClick={handleAcceptReservation}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-ucm-emerald hover:bg-ucm-darkEmerald text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                  Aceitar Reserva
                </button>
              )}

              {/* Botão Confirmar Entrega (Vendedor) */}
              {isSeller && reservation.status === 'accepted' && (
                <button
                  onClick={() => handleDoubleConfirm('seller')}
                  disabled={actionLoading || reservation.seller_confirmed}
                  className={`flex-1 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center ${
                    reservation.seller_confirmed
                      ? 'bg-emerald-100 text-ucm-darkEmerald cursor-default'
                      : 'bg-ucm-emerald hover:bg-ucm-darkEmerald text-white'
                  }`}
                >
                  <CheckCheck className="w-4 h-4 mr-1.5" />
                  {reservation.seller_confirmed ? 'Entreguei (Confirmado)' : 'Confirmar Entrega'}
                </button>
              )}

              {/* Botão Confirmar Receção (Comprador) */}
              {isBuyer && reservation.status === 'accepted' && (
                <button
                  onClick={() => handleDoubleConfirm('buyer')}
                  disabled={actionLoading || reservation.buyer_confirmed}
                  className={`flex-1 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center ${
                    reservation.buyer_confirmed
                      ? 'bg-emerald-100 text-ucm-darkEmerald cursor-default'
                      : 'bg-ucm-emerald hover:bg-ucm-darkEmerald text-white'
                  }`}
                >
                  <CheckCheck className="w-4 h-4 mr-1.5" />
                  {reservation.buyer_confirmed ? 'Recebi (Confirmado)' : 'Confirmar Receção'}
                </button>
              )}

              {/* Botão Cancelar Reserva */}
              {reservation.status !== 'completed' && reservation.status !== 'cancelled' && (
                <button
                  onClick={handleCancelReservation}
                  disabled={actionLoading}
                  className="px-3 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-xs rounded-xl transition-colors border border-rose-200"
                  title="Cancelar Reserva"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 text-center border border-slate-100 text-xs text-slate-500 mb-3">
          Selecione um anúncio no mercado para conversar com o colega.
        </div>
      )}

      {/* Área de Mensagens */}
      <div className="flex-1 bg-white rounded-3xl p-4 border border-slate-100 shadow-sm overflow-y-auto space-y-3 mb-3">
        {loadingChat ? (
          <div className="text-center text-xs text-slate-400 py-8">A carregar mensagens do chat...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-12">
            Nenhuma mensagem trocada ainda. Combine aqui o horário e o ponto de encontro no campus!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-ucm-emerald text-white rounded-br-none shadow-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {msg.message_text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Caixa de Texto do Envio de Mensagem */}
      <form onSubmit={handleSendSubmit} className="flex space-x-2">
        <input
          type="text"
          placeholder="Escreva uma mensagem..."
          value={newMessageText}
          onChange={(e) => setNewMessageText(e.target.value)}
          className="flex-1 p-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none shadow-sm"
        />
        <button
          type="submit"
          className="p-3.5 bg-ucm-emerald hover:bg-ucm-darkEmerald text-white rounded-2xl shadow-md transition-all"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

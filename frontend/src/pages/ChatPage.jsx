import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, CheckCircle2, ShieldAlert, XCircle, Clock, CheckCheck, Loader2, ArrowLeft, Camera, Paperclip, AlertTriangle, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useChat } from '../hooks/useChat';
import { fetchApi } from '../services/api';

export function ChatPage() {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Caso navegue a partir de um anúncio específico:
  const listingFromState = location.state?.listing || null;

  const [activeListing, setActiveListing] = useState(listingFromState);
  const [reservation, setReservation] = useState(null);
  const [loadingReservation, setLoadingReservation] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Estado para Modal de Motivo de Cancelamento
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Desistência do comprador');

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
        showToast('Reserva aceite com sucesso! O item está marcado como Reservado e saiu do feed público.', 'success');
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

  async function handleConfirmCancelWithReason() {
    if (!reservation?.id) return;

    try {
      setActionLoading(true);
      const res = await fetchApi(`/reservations/${reservation.id}/cancel`, {
        method: 'PUT',
        body: { cancellation_reason: selectedReason }
      });
      if (res.success) {
        showToast('Reserva cancelada. Anúncio devolvido ao feed ativo.', 'info');
        setReservation(res.data);
        setActiveListing((prev) => ({ ...prev, status: 'active' }));
        setIsCancelModalOpen(false);
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

  function handleAttachPhoto() {
    showToast('Selecione uma fotografia adicional para enviar na conversa.', 'info');
  }

  const isSeller = activeListing?.owner_id === user?.id;
  const isBuyer = !isSeller;

  // Verificação de Race Condition: Item reservado por outro colega
  const isReservedByAnother = activeListing?.status === 'reserved' && reservation && reservation.buyer_id !== user?.id && isBuyer;

  function renderStatusBadge(status) {
    switch (status) {
      case 'negotiating':
        return (
          <span className="text-[11px] font-bold px-3 py-1 bg-amber-500 text-white rounded-full shadow-sm flex items-center">
            <Clock className="w-3 h-3 mr-1" /> Negociação em Curso
          </span>
        );
      case 'reserved':
        return (
          <span className="text-[11px] font-bold px-3 py-1 bg-indigo-600 text-white rounded-full shadow-sm flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Reservado
          </span>
        );
      case 'sold':
      case 'completed':
        return (
          <span className="text-[11px] font-bold px-3 py-1 bg-emerald-600 text-white rounded-full shadow-sm flex items-center">
            <CheckCheck className="w-3 h-3 mr-1" /> Concluído
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full capitalize">
            {status || 'Disponível'}
          </span>
        );
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col h-[calc(100vh-80px)]">
      {/* Botão de Regresso com Seta ArrowLeft */}
      <div className="flex items-center space-x-2 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shadow-xs"
          title="Regressar à Lista / Mercado"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="text-xs font-bold">Voltar</span>
        </button>
      </div>

      {/* Header Contextualizado do Chat com o Material */}
      {activeListing ? (
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm mb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={activeListing.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'}
                alt={activeListing.title}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-xs bg-slate-50"
              />
              <div>
                <h2 className="font-bold text-slate-800 text-sm line-clamp-1">{activeListing.title}</h2>
                <div className="flex items-center space-x-2 text-xs mt-0.5">
                  <span className="font-bold text-ucm-emerald">
                    {activeListing.transaction_type === 'doacao' || activeListing.transaction_type === 'emprestimo'
                      ? 'Grátis'
                      : `${activeListing.price_mzn} MZN`}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 capitalize">{activeListing.transaction_type || 'Venda'}</span>
                </div>
              </div>
            </div>

            {renderStatusBadge(activeListing.status)}
          </div>

          {/* ALERTA DE RACE CONDITION: RESERVADO POR OUTRO UTILIZADOR */}
          {isReservedByAnother && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center text-xs font-bold text-amber-900">
              <AlertTriangle className="w-5 h-5 mr-2 text-amber-600 shrink-0" />
              <span>⚠️ Este item acabou de ser reservado por outro colega. Serás notificado caso a reserva seja cancelada.</span>
            </div>
          )}

          {/* BARRA DE AÇÕES INTEGRADAS DA RESERVA NO CHAT */}
          {reservation && !isReservedByAnother && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              {/* Notificação de Sucesso quando o negócio é concluído */}
              {reservation.status === 'completed' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center text-xs font-bold text-ucm-darkEmerald">
                  <CheckCheck className="w-5 h-5 mr-2 text-ucm-emerald shrink-0" />
                  <span>🎉 Negócio Concluído! O material foi entregue e a transação registada no Painel Pessoal.</span>
                </div>
              )}

              {/* Botões de Ação Dinâmicos com Touch Targets min-h-[44px] */}
              {reservation.status !== 'completed' && (
                <div className="flex items-center justify-between space-x-2">
                  {/* Botão Aceitar Reserva (Vendedor quando Pendente) */}
                  {isSeller && reservation.status === 'pending' && (
                    <button
                      onClick={handleAcceptReservation}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 bg-ucm-emerald hover:bg-ucm-darkEmerald text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center min-h-[44px]"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                      Aceitar Reserva
                    </button>
                  )}

                  {/* Botão Confirmar Entrega (Vendedor no Encontro Presencial) */}
                  {isSeller && (reservation.status === 'accepted' || activeListing.status === 'reserved') && (
                    <button
                      onClick={() => handleDoubleConfirm('seller')}
                      disabled={actionLoading || reservation.seller_confirmed}
                      className={`flex-1 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center min-h-[44px] ${
                        reservation.seller_confirmed
                          ? 'bg-emerald-100 text-ucm-darkEmerald border border-emerald-300 cursor-default'
                          : 'bg-ucm-emerald hover:bg-ucm-darkEmerald text-white'
                      }`}
                    >
                      <CheckCheck className="w-4 h-4 mr-1.5" />
                      {reservation.seller_confirmed ? 'Entreguei o Material (Confirmado)' : 'Entreguei o Material'}
                    </button>
                  )}

                  {/* Botão Confirmar Receção (Comprador no Encontro Presencial) */}
                  {isBuyer && (reservation.status === 'accepted' || activeListing.status === 'reserved') && (
                    <button
                      onClick={() => handleDoubleConfirm('buyer')}
                      disabled={actionLoading || reservation.buyer_confirmed}
                      className={`flex-1 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center min-h-[44px] ${
                        reservation.buyer_confirmed
                          ? 'bg-emerald-100 text-ucm-darkEmerald border border-emerald-300 cursor-default'
                          : 'bg-ucm-emerald hover:bg-ucm-darkEmerald text-white'
                      }`}
                    >
                      <CheckCheck className="w-4 h-4 mr-1.5" />
                      {reservation.buyer_confirmed ? 'Recebi o Material (Confirmado)' : 'Recebi o Material'}
                    </button>
                  )}

                  {/* Botão Cancelar Reserva (Abre Modal de Motivo em 1 Clique) */}
                  {reservation.status !== 'completed' && reservation.status !== 'cancelled' && (
                    <button
                      onClick={() => setIsCancelModalOpen(true)}
                      disabled={actionLoading}
                      className="px-3 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-xs rounded-xl transition-colors border border-rose-200 flex items-center shrink-0 min-h-[44px]"
                      title="Cancelar Reserva"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Cancelar Reserva
                    </button>
                  )}
                </div>
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
          <div className="text-center text-xs text-slate-400 py-12 space-y-1">
            <p className="font-semibold text-slate-600">Nenhuma mensagem trocada ainda.</p>
            <p>Combine aqui o horário e o ponto de encontro no campus da UCM Pemba!</p>
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
        <button
          type="button"
          onClick={handleAttachPhoto}
          className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-ucm-emerald rounded-2xl shadow-xs transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          title="Anexar Foto Extra do Material"
        >
          <Camera className="w-5 h-5" />
        </button>

        <input
          type="text"
          placeholder="Escreva uma mensagem..."
          value={newMessageText}
          onChange={(e) => setNewMessageText(e.target.value)}
          className="flex-1 p-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none shadow-sm min-h-[44px]"
        />

        <button
          type="submit"
          className="p-3.5 bg-ucm-emerald hover:bg-ucm-darkEmerald text-white rounded-2xl shadow-md transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          title="Enviar Mensagem"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* MODAL DE MOTIVO DE CANCELAMENTO PRESENCIAL (1 CLIQUE) */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <XCircle className="w-5 h-5 text-rose-600 mr-2" /> Motivo do Cancelamento
              </h3>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Indique a razão para cancelar esta reserva. O anúncio regressará imediatamente ao feed ativo.
            </p>

            <div className="space-y-2">
              {[
                'Desistência do comprador',
                'Estado do material diferente da descrição',
                'Falta de acordo no valor final',
                'Outro motivo'
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full p-3 rounded-xl text-xs font-bold text-left border transition-all flex items-center justify-between ${
                    selectedReason === reason
                      ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{reason}</span>
                  {selectedReason === reason && <CheckCircle2 className="w-4 h-4 text-rose-600" />}
                </button>
              ))}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="w-1/2 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs min-h-[44px]"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelWithReason}
                disabled={actionLoading}
                className="w-1/2 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md min-h-[44px] flex items-center justify-center"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

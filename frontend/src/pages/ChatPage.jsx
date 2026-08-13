import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, CheckCircle2, ShieldAlert, XCircle, Clock, CheckCheck, Loader2, ArrowLeft, Camera, ShieldCheck, MapPin, AlertTriangle, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useChat } from '../hooks/useChat';
import { fetchApi } from '../services/api';
import { CameraModal } from '../components/CameraModal';
import { compressImage } from '../utils/imageCompressor';
import { supabase } from '../services/supabaseClient';

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
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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
        showToast('Reserva aceite! O item foi marcado como Reservado e saiu do feed público.', 'success');
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
    setIsCameraOpen(true);
  }

  async function handleCameraPhotoCapture(rawFile) {
    if (!rawFile) return;

    try {
      setIsUploadingPhoto(true);
      showToast('A otimizar fotografia capturada...', 'info');

      const compressedFile = await compressImage(rawFile, 1024, 1024, 0.8);
      let publicUrl = null;
      const fileName = `chat/${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;

      const { data: storageData, error: storageErr } = await supabase.storage
        .from('listing-images')
        .upload(fileName, compressedFile, {
          contentType: 'image/webp',
          upsert: true
        });

      if (!storageErr && storageData) {
        const { data: urlData } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      } else {
        const bodyData = new FormData();
        bodyData.append('image', compressedFile);

        const response = await fetch('/api/v1/upload/image', {
          method: 'POST',
          body: bodyData
        });
        const res = await response.json();
        if (res.success && res.data?.url) {
          publicUrl = res.data.url;
        }
      }

      if (publicUrl) {
        await sendMessage(`📷 [Fotografia do Material] ${publicUrl}`);
        showToast('Fotografia enviada com sucesso na conversa!', 'success');
      } else {
        throw new Error('Não foi possível carregar a foto para a conversa.');
      }
    } catch (err) {
      showToast(err.message || 'Erro ao enviar foto.', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  const isSeller = activeListing?.owner_id === user?.id;
  const isBuyer = !isSeller;

  // Verificação de Race Condition: Item reservado por outro colega
  const isReservedByAnother = activeListing?.status === 'reserved' && reservation && reservation.buyer_id !== user?.id && isBuyer;

  function renderStatusBadge(status) {
    switch (status) {
      case 'negotiating':
        return (
          <span className="text-[10px] sm:text-xs font-black px-3 py-1 bg-amber-500 text-white rounded-full shadow-xs flex items-center">
            <Clock className="w-3 h-3 mr-1" /> Negociação em Curso
          </span>
        );
      case 'reserved':
        return (
          <span className="text-[10px] sm:text-xs font-black px-3 py-1 bg-persian text-white rounded-full shadow-xs flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1 text-carrot" /> Reservado
          </span>
        );
      case 'sold':
      case 'completed':
        return (
          <span className="text-[10px] sm:text-xs font-black px-3 py-1 bg-emerald-600 text-white rounded-full shadow-xs flex items-center">
            <CheckCheck className="w-3 h-3 mr-1" /> Concluído
          </span>
        );
      default:
        return (
          <span className="text-[10px] sm:text-xs font-black px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full capitalize">
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
          <ArrowLeft className="w-5 h-5 mr-1 text-persian" />
          <span className="text-xs font-extrabold">Voltar</span>
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
                <h2 className="font-extrabold text-slate-900 text-sm line-clamp-1">{activeListing.title}</h2>
                <div className="flex items-center space-x-2 text-xs mt-0.5">
                  <span className="font-black text-persian">
                    {activeListing.transaction_type === 'doacao' || activeListing.transaction_type === 'emprestimo'
                      ? 'Grátis'
                      : `${activeListing.price_mzn} MZN`}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 capitalize font-bold">{activeListing.transaction_type || 'Venda'}</span>
                </div>
              </div>
            </div>

            {renderStatusBadge(activeListing.status)}
          </div>

          {/* RECOMENDAÇÃO INTEGRADA DE SEGURANÇA DE ENCONTRO NO CAMPUS UCM PEMBA */}
          <div className="p-3 bg-platinum/80 rounded-2xl border border-slate-200/80 flex items-start space-x-2 text-xs text-slate-700">
            <MapPin className="w-4 h-4 text-carrot shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-slate-900">Encontro Seguro no Campus UCM:</span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Recomendamos que a troca ou pagamento seja feito presencialmente na <strong>Biblioteca Central</strong>, <strong>Cantina Principal</strong> ou no <strong>Pátio da FGTI</strong>.
              </p>
            </div>
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
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center text-xs font-bold text-emerald-900">
                  <CheckCheck className="w-5 h-5 mr-2 text-emerald-600 shrink-0" />
                  <span>🎉 Negócio Concluído! O material foi entregue e a transação registada no Painel Pessoal.</span>
                </div>
              )}

              {/* Botões de Ação Dinâmicos com Touch Targets min-h-[44px] */}
              {reservation.status !== 'completed' && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Botão Aceitar Reserva (Vendedor quando Pendente) */}
                  {isSeller && reservation.status === 'pending' && (
                    <button
                      onClick={handleAcceptReservation}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center min-h-[44px]"
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
                      className={`flex-1 py-2.5 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center min-h-[44px] ${
                        reservation.seller_confirmed
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
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
                      className={`flex-1 py-2.5 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center min-h-[44px] ${
                        reservation.buyer_confirmed
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
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
                      className="px-3 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs rounded-xl transition-colors border border-rose-200 flex items-center shrink-0 min-h-[44px]"
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
      <div className="flex-1 bg-white rounded-3xl p-4 border border-slate-100 shadow-sm overflow-y-auto space-y-3 mb-3 scrollbar-thin">
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
                      ? 'bg-persian text-white rounded-br-none shadow-sm font-medium'
                      : 'bg-slate-100 text-slate-800 rounded-bl-none font-medium'
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
          className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-persian rounded-2xl shadow-xs transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          title="Anexar Foto Extra do Material"
        >
          <Camera className="w-5 h-5" />
        </button>

        <input
          type="text"
          placeholder="Escreva uma mensagem..."
          value={newMessageText}
          onChange={(e) => setNewMessageText(e.target.value)}
          className="flex-1 p-3.5 bg-white border border-slate-200 rounded-2xl text-base sm:text-sm focus:ring-2 focus:ring-persian focus:outline-none shadow-sm min-h-[48px]"
        />

        <button
          type="submit"
          className="p-3.5 bg-persian hover:bg-persian-hover text-white rounded-2xl shadow-md transition-all min-h-[48px] min-w-[48px] flex items-center justify-center shrink-0"
          title="Enviar Mensagem"
        >
          <Send className="w-5 h-5 text-carrot" />
        </button>
      </form>

      {/* MODAL DE MOTIVO DE CANCELAMENTO PRESENCIAL (1 CLIQUE) */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center">
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
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full p-3.5 rounded-2xl text-xs font-bold text-left border transition-all flex items-center justify-between min-h-[44px] ${
                    selectedReason === reason
                      ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{reason}</span>
                  {selectedReason === reason && <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />}
                </button>
              ))}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="w-1/2 py-3.5 bg-platinum hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs min-h-[48px]"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelWithReason}
                disabled={actionLoading}
                className="w-1/2 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl text-xs shadow-md min-h-[48px] flex items-center justify-center"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Captura com Câmera ao Vivo para o Chat */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraPhotoCapture}
      />
    </div>
  );
}

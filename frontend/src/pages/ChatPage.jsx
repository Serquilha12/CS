import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Send, CheckCircle2, ShieldAlert, XCircle, Clock, CheckCheck, Loader2, 
  ArrowLeft, Camera, ShieldCheck, MapPin, AlertTriangle, X, RefreshCw, 
  WifiOff, MessageSquare, Flag, Search, User, ChevronRight, Sparkles 
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useChat } from '../hooks/useChat';
import { useConversations } from '../hooks/useConversations';
import { fetchApi } from '../services/api';
import { CameraModal } from '../components/CameraModal';
import { compressImage } from '../utils/imageCompressor';
import { supabase } from '../services/supabaseClient';


export function ChatPage() {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Caso navegue a partir de um anúncio específico
  const listingFromState = location.state?.listing || null;
  const [activeListing, setActiveListing] = useState(listingFromState);
  const [customReceiverId, setCustomReceiverId] = useState(null);

  // Lista de conversas ativas (Inbox)
  const { conversations, loading: loadingConversations, refresh: refreshConversations } = useConversations();
  const [conversationSearch, setConversationSearch] = useState('');

  const [reservation, setReservation] = useState(null);
  const [loadingReservation, setLoadingReservation] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Modais de Cancelamento e Denúncia
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Desistência do comprador');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Comportamento inadequado ou suspeita de fraude académica');

  const messagesEndRef = useRef(null);

  const receiverId = customReceiverId || (
    activeListing?.owner_id !== user?.id
      ? activeListing?.owner_id
      : reservation?.buyer_id
  );

  const { 
    messages, 
    loading: loadingChat, 
    sendMessage, 
    retryMessage, 
    handleTypingActivity,
    isPartnerTyping,
    connectionStatus 
  } = useChat({
    listingId: activeListing?.id,
    receiverId
  });

  const [newMessageText, setNewMessageText] = useState('');

  // Auto-scroll suave para o final do chat sempre que uma nova mensagem for adicionada
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

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
        refreshConversations();
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
        refreshConversations();
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
        refreshConversations();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao cancelar reserva.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendSubmit(e) {
    if (e) e.preventDefault();
    if (!newMessageText.trim()) return;

    try {
      await sendMessage(newMessageText);
      setNewMessageText('');
      refreshConversations();
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
      showToast('A otimizar fotografia...', 'info');

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
        await sendMessage(`[Fotografia do Material] ${publicUrl}`);
        showToast('Fotografia enviada com sucesso na conversa!', 'success');
        refreshConversations();
      } else {
        throw new Error('Não foi possível carregar a foto para a conversa.');
      }
    } catch (err) {
      showToast(err.message || 'Erro ao enviar foto.', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleSendReport() {
    if (!activeListing) return;
    try {
      setActionLoading(true);
      await fetchApi('/admin/reports', {
        method: 'POST',
        body: {
          listing_id: activeListing.id,
          reported_user_id: receiverId,
          reason: reportReason,
          details: `Denúncia registada no chat do anúncio "${activeListing.title}". Última interação reportada para moderação.`
        }
      });
      showToast('Denúncia enviada à moderação académica da UCM Pemba.', 'success');
      setIsReportModalOpen(false);
    } catch (e) {
      showToast(e.message || 'Erro ao submeter denúncia.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  function handleSelectConversation(conv) {
    setActiveListing(conv.listing);
    setCustomReceiverId(conv.partner_id);
  }

  const isSeller = activeListing?.owner_id === user?.id;
  const isBuyer = !isSeller;

  function renderStatusBadge(status) {
    switch (status) {
      case 'negotiating':
        return (
          <span className="text-[10px] font-black px-2.5 py-1 bg-amber-500 text-white rounded-full shadow-xs flex items-center">
            <Clock className="w-3 h-3 mr-1" /> Negociação
          </span>
        );
      case 'reserved':
        return (
          <span className="text-[10px] font-black px-2.5 py-1 bg-persian text-white rounded-full shadow-xs flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1 text-carrot" /> Reservado
          </span>
        );
      case 'sold':
      case 'completed':
        return (
          <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-600 text-white rounded-full shadow-xs flex items-center">
            <CheckCheck className="w-3 h-3 mr-1" /> Concluído
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full capitalize">
            {status || 'Disponível'}
          </span>
        );
    }
  }

  const filteredConversations = conversations.filter((c) => {
    if (!conversationSearch.trim()) return true;
    const term = conversationSearch.toLowerCase();
    return (
      c.partner?.full_name?.toLowerCase().includes(term) ||
      c.listing?.title?.toLowerCase().includes(term) ||
      c.last_message?.text?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 h-[calc(100vh-80px)] flex flex-col">
      {/* Layout Split-View: Inbox à esquerda, Chat à direita */}
      <div className="flex-1 flex bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden min-h-0">
        
        {/* ─── COLUNA ESQUERDA: CAIXA DE ENTRADA (INBOX) ─── */}
        <aside 
          className={`w-full lg:w-80 xl:w-96 border-r border-slate-100 flex flex-col bg-slate-50/50 ${
            activeListing ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Header Inbox */}
          <div className="p-4 border-b border-slate-100 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-persian/10 text-persian flex items-center justify-center font-black text-sm">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h1 className="text-base font-black text-slate-900">Mensagens</h1>
              </div>
              <button
                onClick={() => navigate('/')}
                className="text-xs text-persian hover:text-persian-hover font-bold transition-colors"
              >
                Mercado
              </button>
            </div>

            {/* Barra de Pesquisa de Conversas */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquisar conversas ou livros..."
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-persian border-none"
              />
            </div>
          </div>

          {/* Lista de Conversas */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-persian" />
                <p>A carregar conversas...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="font-semibold text-slate-600">Nenhuma conversa encontrada.</p>
                <p className="text-[11px] text-slate-400">Quando contactar um colega no mercado, a conversa aparecerá aqui.</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 bg-persian text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Explorar Materiais
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeListing?.id === conv.listing_id && receiverId === conv.partner_id;
                const lastTime = conv.last_message?.created_at
                  ? new Date(conv.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <button
                    key={`${conv.listing_id}_${conv.partner_id}`}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-3.5 text-left flex items-start space-x-3 transition-colors ${
                      isSelected ? 'bg-persian/5 border-l-4 border-persian' : 'hover:bg-slate-100/70 bg-white'
                    }`}
                  >
                    {/* Foto do Material ou Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={conv.listing?.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=200&q=80'}
                        alt={conv.listing?.title}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-xs bg-slate-100"
                      />
                      {conv.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-carrot text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm animate-pulse">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>

                    {/* Detalhes da Conversa */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-900 truncate">
                          {conv.partner?.full_name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-semibold">{lastTime}</span>
                      </div>
                      <p className="text-[11px] font-bold text-persian truncate mt-0.5">
                        {conv.listing?.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {conv.last_message?.text?.startsWith('[Fotografia') ? '📷 Fotografia anexada' : conv.last_message?.text}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ─── COLUNA DIREITA: CONVERSA ATIVA ─── */}
        <main 
          className={`flex-1 flex flex-col bg-white min-w-0 ${
            !activeListing ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {activeListing ? (
            <>
              {/* Header do Chat / Barra de Ações Rápidas */}
              <div className="p-3 sm:p-4 border-b border-slate-100 bg-white/90 backdrop-blur-md space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Botão Voltar para mobile */}
                    <button
                      onClick={() => setActiveListing(null)}
                      className="p-2 bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl transition-colors lg:hidden shrink-0"
                      title="Voltar à Caixa de Entrada"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <img
                      src={activeListing.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80'}
                      alt={activeListing.title}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-xs shrink-0"
                    />

                    <div className="min-w-0">
                      <h2 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                        {activeListing.title}
                      </h2>
                      <div className="flex items-center space-x-2 text-[11px]">
                        <span className="font-extrabold text-persian">
                          {activeListing.transaction_type === 'doacao' || activeListing.transaction_type === 'emprestimo'
                            ? 'Grátis'
                            : `${activeListing.price_mzn} MZN`}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 capitalize">{activeListing.transaction_type || 'Venda'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {renderStatusBadge(activeListing.status)}
                    
                    {/* Botão de Denúncia Rápida / Moderação Ética */}
                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                      title="Reportar infração académica"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Bloco de Gestão de Reserva / Confirmação Dupla */}
                {reservation && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 text-xs text-slate-600 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-persian shrink-0" />
                      <span className="text-[11px] truncate max-w-[200px] sm:max-w-xs">
                        {reservation.meeting_point || activeListing.campus_location || 'Biblioteca Central'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {isSeller && reservation.status === 'pending' && (
                        <button
                          onClick={handleAcceptReservation}
                          disabled={actionLoading}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center"
                        >
                          {actionLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                          Aceitar Reserva
                        </button>
                      )}

                      {isSeller && (reservation.status === 'accepted' || activeListing.status === 'reserved') && (
                        <button
                          onClick={() => handleDoubleConfirm('seller')}
                          disabled={actionLoading || reservation.seller_confirmed}
                          className={`px-3 py-1.5 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center ${
                            reservation.seller_confirmed
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <CheckCheck className="w-3.5 h-3.5 mr-1" />
                          {reservation.seller_confirmed ? 'Entrega Confirmada' : 'Entreguei Material'}
                        </button>
                      )}

                      {isBuyer && (reservation.status === 'accepted' || activeListing.status === 'reserved') && (
                        <button
                          onClick={() => handleDoubleConfirm('buyer')}
                          disabled={actionLoading || reservation.buyer_confirmed}
                          className={`px-3 py-1.5 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center ${
                            reservation.buyer_confirmed
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <CheckCheck className="w-3.5 h-3.5 mr-1" />
                          {reservation.buyer_confirmed ? 'Receção Confirmada' : 'Recebi Material'}
                        </button>
                      )}

                      {reservation.status !== 'completed' && reservation.status !== 'cancelled' && (
                        <button
                          onClick={() => setIsCancelModalOpen(true)}
                          disabled={actionLoading}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition-colors"
                          title="Cancelar Reserva"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Banner de Reconexão */}
              {connectionStatus === 'reconnecting' && (
                <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-3.5 py-1.5 text-[11px] flex items-center justify-center space-x-2 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                  <span>A reconectar em tempo real com o servidor...</span>
                </div>
              )}

              {/* Área de Mensagens com Scroll Suave */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin bg-slate-50/30">
                {loadingChat ? (
                  <div className="text-center text-xs text-slate-400 py-8 space-y-2">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-persian" />
                    <p>A carregar histórico da conversa...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-12 space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-persian/10 text-persian flex items-center justify-center mx-auto">
                      <Sparkles className="w-5 h-5 text-carrot" />
                    </div>
                    <p className="font-bold text-slate-700">Inicie a conversa!</p>
                    <p className="text-slate-400 max-w-xs mx-auto text-[11px]">
                      Combine o horário e o ponto de encontro seguro no campus da UCM Pemba.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    const isSending = msg.status === 'sending';
                    const isFailed = msg.status === 'failed';
                    const isRead = msg.status === 'read' || msg.is_read;
                    const timeStr = msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed transition-all ${
                            isMe
                              ? isFailed
                                ? 'bg-rose-600 text-white rounded-br-none shadow-sm'
                                : isSending
                                ? 'bg-persian/80 text-white rounded-br-none shadow-xs'
                                : 'bg-persian text-white rounded-br-none shadow-sm'
                              : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none shadow-xs'
                          }`}
                        >
                          {/* Fotografia anexada */}
                          {msg.message_text.startsWith('[Fotografia do Material]') || (msg.message_text.startsWith('http') && (msg.message_text.includes('.webp') || msg.message_text.includes('.jpg') || msg.message_text.includes('.png'))) ? (
                            <div className="space-y-1.5 py-1">
                              <span className="text-[10px] opacity-80 font-bold block">Fotografia do Material</span>
                              <img
                                src={msg.message_text.replace('[Fotografia do Material]', '').trim()}
                                alt="Foto do Material"
                                className="rounded-xl max-h-56 w-auto object-cover cursor-pointer hover:opacity-95 shadow-xs border border-white/20"
                                onClick={() => window.open(msg.message_text.replace('[Fotografia do Material]', '').trim(), '_blank')}
                              />
                            </div>
                          ) : (
                            msg.message_text
                          )}
                        </div>

                        {/* Indicadores de Estado e Hora (Optimistic UI & Live Receipts) */}
                        <div className="flex items-center space-x-1.5 mt-1 px-1 text-[10px] text-slate-400">
                          <span>{timeStr}</span>
                          {isMe && (
                            <>
                              {isSending && <Clock className="w-3 h-3 text-slate-400 animate-spin" />}
                              {isFailed && (
                                <button
                                  onClick={() => retryMessage(msg.id)}
                                  className="text-rose-600 hover:text-rose-700 font-bold flex items-center"
                                >
                                  <RefreshCw className="w-3 h-3 mr-0.5" /> Reenviar
                                </button>
                              )}
                              {!isSending && !isFailed && (
                                <CheckCheck className={`w-3.5 h-3.5 ${isRead ? 'text-sky-500' : 'text-slate-400'}`} />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Balão Indicador de Digitação (Typing Indicator) */}
                {isPartnerTyping && (
                  <div className="flex items-center space-x-2 py-1.5 px-3.5 bg-white border border-slate-100 rounded-full w-fit shadow-xs animate-pulse">
                    <span className="text-[11px] font-bold text-slate-600">O colega está a escrever</span>
                    <div className="flex space-x-1">
                      <span className="w-1.5 h-1.5 bg-persian rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-persian rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-persian rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>


              {/* Caixa de Texto do Envio de Mensagem */}
              <form onSubmit={handleSendSubmit} className="p-3 bg-white border-t border-slate-100 flex space-x-2">
                <button
                  type="button"
                  onClick={handleAttachPhoto}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-persian rounded-2xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                  title="Anexar Fotografia"
                >
                  <Camera className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  placeholder="Escreva uma mensagem..."
                  value={newMessageText}
                  onChange={(e) => {
                    setNewMessageText(e.target.value);
                    if (handleTypingActivity) handleTypingActivity();
                  }}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-persian focus:bg-white focus:outline-none transition-all shadow-xs min-h-[44px]"
                />

                <button
                  type="submit"
                  disabled={!newMessageText.trim()}
                  className="p-3 bg-persian hover:bg-persian-hover disabled:opacity-40 text-white rounded-2xl shadow-md transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                  title="Enviar"
                >
                  <Send className="w-5 h-5 text-carrot" />
                </button>
              </form>
            </>
          ) : (
            /* Estado de Boas-Vindas no Desktop (Nenhuma Conversa Selecionada) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50/40">
              <div className="w-16 h-16 rounded-3xl bg-persian/10 text-persian flex items-center justify-center shadow-xs">
                <MessageSquare className="w-8 h-8 text-persian" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Caixa de Entrada da CampusStore</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Selecione uma conversa à esquerda ou explore o mercado para combinar encontros presenciais seguros na UCM Pemba.
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-persian hover:bg-persian-hover text-white text-xs font-black rounded-xl shadow-sm transition-all"
              >
                Explorar Mercado
              </button>
            </div>
          )}
        </main>
      </div>

      {/* MODAL DE MOTIVO DE CANCELAMENTO */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center">
                <XCircle className="w-5 h-5 text-rose-600 mr-2" /> Motivo do Cancelamento
              </h3>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {['Desistência do comprador', 'Comprador não compareceu ao encontro', 'Material já não disponível', 'Outro motivo'].map((reason) => (
                <label key={reason} className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                  <input
                    type="radio"
                    name="cancellationReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="text-persian focus:ring-persian"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleConfirmCancelWithReason}
              disabled={actionLoading}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Cancelamento'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE DENÚNCIA / MODERAÇÃO ÉTICA ACADÉMICA */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center">
                <ShieldAlert className="w-5 h-5 text-rose-600 mr-2" /> Denúncia à Moderação
              </h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              A equipa de moderação da UCM Pemba analisará o histórico desta negociação para preservar o ambiente seguro e ético do campus.
            </p>

            <div className="space-y-2">
              {[
                'Comportamento inadequado ou ofensivo',
                'Suspeita de fraude académica ou venda de testes',
                'Preço abusivo ou tentativa de burla',
                'Não comparecimento intencional'
              ].map((reason) => (
                <label key={reason} className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="text-persian focus:ring-persian"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleSendReport}
              disabled={actionLoading}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submeter Denúncia'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Captura de Fotografia */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraPhotoCapture}
        isLoading={isUploadingPhoto}
      />
    </div>
  );
}

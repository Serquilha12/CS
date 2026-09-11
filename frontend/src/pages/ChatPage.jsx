import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Send, CheckCircle2, ShieldAlert, XCircle, Clock, CheckCheck, Loader2, 
  ArrowLeft, Camera, ShieldCheck, MapPin, AlertTriangle, X, RefreshCw, 
  WifiOff, MessageSquare, Flag, Search, User, ChevronRight, Sparkles,
  ExternalLink, Eye, Info, Lock, Tag, Trash2
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
  const [activePartner, setActivePartner] = useState(null);

  // Lista de conversas ativas (Inbox)
  const { conversations, loading: loadingConversations, refresh: refreshConversations } = useConversations();
  const [conversationSearch, setConversationSearch] = useState('');

  // Contexto de Negociação de Mercado Livre
  const [contextData, setContextData] = useState({
    listing: listingFromState,
    reservation: null,
    isAcceptedForThisChat: false,
    isReservedByOther: false,
    reservedBuyerName: null
  });
  const [reservation, setReservation] = useState(null);
  const [loadingReservation, setLoadingReservation] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Modal Sobreposto de Detalhes do Anúncio (Zona 1)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Modais de Cancelamento e Denúncia
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Colega não compareceu no ponto de encontro');
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
    deleteMessage,
    deleteConversation,
    retryMessage, 
    handleTypingActivity,
    isPartnerTyping,
    connectionStatus 
  } = useChat({
    listingId: activeListing?.id,
    receiverId
  });

  async function handleDeleteMessage(messageId) {
    if (!window.confirm('Tem a certeza de que deseja apagar esta mensagem?')) return;
    try {
      await deleteMessage(messageId);
      showToast('Mensagem apagada com sucesso.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao apagar mensagem.', 'error');
    }
  }

  async function handleDeleteConversation() {
    if (!window.confirm('Tem a certeza de que deseja apagar todo o histórico desta conversa? Esta ação apagará permanentemente as mensagens.')) return;
    try {
      await deleteConversation();
      showToast('Histórico da conversa apagado com sucesso.', 'success');
      refreshConversations();
    } catch (err) {
      showToast(err.message || 'Erro ao apagar histórico da conversa.', 'error');
    }
  }

  const [newMessageText, setNewMessageText] = useState('');

  // Auto-scroll suave para o final do chat sempre que uma nova mensagem for adicionada
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  useEffect(() => {
    if (activeListing?.id && receiverId) {
      loadContext(activeListing.id, receiverId);
    }
  }, [activeListing?.id, receiverId]);

  async function loadContext(listingId, partnerId) {
    try {
      setLoadingReservation(true);
      const res = await fetchApi(`/reservations/context/${listingId}/${partnerId}`);
      if (res.success && res.data) {
        setContextData(res.data);
        if (res.data.listing) {
          setActiveListing((prev) => ({ ...prev, ...res.data.listing }));
        }
        if (res.data.partner) {
          setActivePartner(res.data.partner);
        }
        setReservation(res.data.reservation || null);
      }
    } catch (e) {
      console.error('[LOAD CONTEXT ERROR]:', e);
    } finally {
      setLoadingReservation(false);
    }
  }

  async function handleAcceptReservation() {
    try {
      setActionLoading(true);
      let targetReservationId = reservation?.id;

      // Se ainda não houver ID de reserva (ex: interessado iniciou chat direto), criar o pedido antes de aceitar
      if (!targetReservationId && activeListing?.id && receiverId) {
        const createRes = await fetchApi('/reservations', {
          method: 'POST',
          body: {
            listing_id: activeListing.id,
            seller_id: user.id,
            agreed_price_mzn: activeListing.price_mzn,
            meeting_point: activeListing.campus_location || 'Biblioteca Central - UCM Pemba',
            initial_message: 'Oferta de reserva aceite pelo vendedor.'
          }
        });
        if (createRes.success && createRes.data?.id) {
          targetReservationId = createRes.data.id;
        }
      }

      if (!targetReservationId) {
        throw new Error('Não foi possível identificar a reserva para este aluno.');
      }

      const res = await fetchApi(`/reservations/${targetReservationId}/accept`, { method: 'PUT' });
      if (res.success) {
        showToast('Oferta aceite! O artigo foi reservado com exclusividade para este colega.', 'success');
        setReservation(res.data);
        setActiveListing((prev) => ({ ...prev, status: 'reserved' }));
        if (activeListing?.id && receiverId) {
          loadContext(activeListing.id, receiverId);
        }
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
        if (res.isDoubleConfirmed) {
          setActiveListing((prev) => ({ ...prev, status: 'sold' }));
          showToast('Transação concluída com sucesso! O histórico do chat foi encerrado e apagado.', 'success');
        } else {
          showToast(res.message, 'success');
        }
        setReservation(res.data);
        if (activeListing?.id && receiverId) {
          loadContext(activeListing.id, receiverId);
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
        showToast('Reserva cancelada com sucesso! O anúncio regressou a disponível e as restantes conversas foram reabertas.', 'info');
        setReservation(res.data);
        setActiveListing((prev) => ({ ...prev, status: 'active' }));
        setIsCancelModalOpen(false);
        if (activeListing?.id && receiverId) {
          loadContext(activeListing.id, receiverId);
        }
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
    if (conv.partner) {
      setActivePartner(conv.partner);
    }
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

        {/* ─── COLUNA DIREITA: CONVERSA ATIVA (BALCÃO DE NEGÓCIOS EM 3 ZONAS) ─── */}
        <main 
          className={`flex-1 flex flex-col bg-white min-w-0 ${
            !activeListing ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {activeListing ? (
            <>
              {/* ─── ZONA 1: O CABEÇALHO FIXO DO PRODUTO (GLASSMORPHISM STICKY) ─── */}
              <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 p-3 sm:p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  
                  {/* Informações do Produto em Negociação */}
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
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-slate-200/80 shadow-2xs shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setIsDetailModalOpen(true)}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h2 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                          {activeListing.title}
                        </h2>
                        {/* Ligação subtil para abrir detalhes completos num modal sobreposto */}
                        <button
                          type="button"
                          onClick={() => setIsDetailModalOpen(true)}
                          className="text-[11px] font-bold text-ucm-emerald hover:text-ucm-darkEmerald hover:underline inline-flex items-center shrink-0 cursor-pointer"
                          title="Ver detalhes completos do anúncio"
                        >
                          <ExternalLink className="w-3 h-3 mr-0.5" />
                          <span className="hidden sm:inline">Ver anúncio</span>
                        </button>
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] mt-0.5">
                        <span className="font-black text-ucm-emerald">
                          {activeListing.transaction_type === 'doacao' || activeListing.transaction_type === 'emprestimo'
                            ? 'Grátis'
                            : `${activeListing.price_mzn} MZN`}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 capitalize">{activeListing.transaction_type || 'Venda'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400 truncate max-w-[120px]">{activeListing.campus_location || 'Campus de Pemba'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Estado do Anúncio, Apagar Conversa & Botão de Denúncia */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {renderStatusBadge(activeListing.status)}
                    
                    <button
                      onClick={handleDeleteConversation}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Apagar todo o histórico desta conversa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Reportar infração académica"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ─── ZONA 2: IDENTIFICAÇÃO DE PAPÉIS (QUEM É QUEM) ─── */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-slate-200/80 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                      <User className="w-3 h-3" />
                    </div>
                    <span className="font-bold text-slate-800 text-xs truncate">
                      {activePartner?.full_name || (isSeller ? 'Interessado na UCM' : 'Anunciante')}
                    </span>
                    {/* Badge contextual de papel */}
                    {isSeller ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        Interessado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-900 border border-blue-200/80 shrink-0">
                        Anunciante
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 shrink-0">
                    {isSeller ? 'Você é o Vendedor' : 'Você é o Comprador'}
                  </span>
                </div>

                {/* ─── ZONA 3: PAINEL DE AÇÕES CONTEXTUAIS (A MÁQUINA DE ESTADOS) ─── */}
                
                {/* ESTADO 3: O Artigo foi reservado por outro colega (Concorrência com negociação pausada) */}
                {contextData.isReservedByOther && !contextData.isAcceptedForThisChat ? (
                  <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex items-start space-x-2.5 text-xs text-amber-900 animate-in fade-in duration-300">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-amber-950">Este artigo acabou de ser reservado por outro colega</p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        A conversa está pausada temporariamente enquanto o anunciante finaliza o encontro presencial. Se o colega faltar ou desistir, a sua conversa será desbloqueada de imediato.
                      </p>
                    </div>
                  </div>
                ) : contextData.isAcceptedForThisChat || (reservation?.status === 'accepted') ? (
                  /* ESTADO 2: Reserva Aceite com Este Aluno (Ponto de Encontro + Dupla Confirmação) */
                  <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5 animate-in fade-in duration-300">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 text-xs text-slate-700 font-semibold">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs truncate max-w-[220px] sm:max-w-xs">
                          Ponto de Encontro: <strong className="text-slate-900">{reservation?.meeting_point || activeListing.campus_location || 'Biblioteca Central'}</strong>
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {/* Vendedor: Confirmar Entrega */}
                        {isSeller && (
                          <button
                            onClick={() => handleDoubleConfirm('seller')}
                            disabled={actionLoading || reservation?.seller_confirmed}
                            className={`px-3.5 py-1.5 font-extrabold text-xs rounded-xl shadow-xs transition-transform active:scale-95 flex items-center cursor-pointer ${
                              reservation?.seller_confirmed
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                            {reservation?.seller_confirmed ? 'Entrega Confirmada ✓' : 'Entreguei o Material'}
                          </button>
                        )}

                        {/* Comprador: Confirmar Receção */}
                        {isBuyer && (
                          <button
                            onClick={() => handleDoubleConfirm('buyer')}
                            disabled={actionLoading || reservation?.buyer_confirmed}
                            className={`px-3.5 py-1.5 font-extrabold text-xs rounded-xl shadow-xs transition-transform active:scale-95 flex items-center cursor-pointer ${
                              reservation?.buyer_confirmed
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                            {reservation?.buyer_confirmed ? 'Receção Confirmada ✓' : 'Recebi o Material'}
                          </button>
                        )}

                        {/* Reversibilidade Amigável: Cancelar Reserva (se o aluno faltar) */}
                        {reservation?.status !== 'completed' && (
                          <button
                            onClick={() => setIsCancelModalOpen(true)}
                            disabled={actionLoading}
                            className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center cursor-pointer"
                            title="Cancelar Reserva e Reabrir Negociações"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            <span>Cancelar Reserva</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Alerta de Confirmação Cruzada */}
                    <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
                      {isSeller && reservation?.buyer_confirmed && !reservation?.seller_confirmed && (
                        <span className="text-emerald-700 font-bold flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> O colega já confirmou a receção! Confirme para concluir.
                        </span>
                      )}
                      {isBuyer && reservation?.seller_confirmed && !reservation?.buyer_confirmed && (
                        <span className="text-emerald-700 font-bold flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> O anunciante já confirmou a entrega! Confirme a receção do material.
                        </span>
                      )}
                      {!reservation?.buyer_confirmed && !reservation?.seller_confirmed && (
                        <span className="text-slate-500">
                          Ambos devem confirmar no local de encontro físico após a verificação do material.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ESTADO 1: Negociação Aberta (Múltiplas conversas simultâneas permitidas) */
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200/70 rounded-2xl flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-300">
                    {isSeller ? (
                      <>
                        <div className="flex items-center space-x-2 text-xs text-slate-700">
                          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-slate-700 font-medium">
                            Negociação aberta com este aluno. Se fechar negócio, clique para reservar com exclusividade:
                          </span>
                        </div>
                        <button
                          onClick={handleAcceptReservation}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-ucm-emerald hover:bg-ucm-darkEmerald active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-700/20 transition-all flex items-center cursor-pointer"
                        >
                          {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                          Aceitar Oferta deste Aluno
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center space-x-2 text-xs text-slate-600 w-full">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>A aguardar resposta do anunciante... Pode tirar dúvidas e combinar os termos da entrega.</span>
                      </div>
                    )}
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
                        {/* Identificador sutil de papel acima da mensagem */}
                        <span className="text-[10px] font-bold text-slate-400 px-1 mb-0.5">
                          {isMe
                            ? (isSeller ? 'Você (Anunciante)' : 'Você (Interessado)')
                            : (isSeller ? 'Interessado' : 'Anunciante')}
                        </span>

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

                        {/* Indicadores de Estado e Hora */}
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
                              {!isSending && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMessage(msg.id);
                                  }}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 ml-1 cursor-pointer"
                                  title="Apagar mensagem"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                          {!isMe && user?.role === 'admin' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMessage(msg.id);
                              }}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 ml-1 cursor-pointer"
                              title="Moderação: Apagar mensagem inadequada"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
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

              {/* ─── CAIXA DE ENVIO COM BLOQUEIO SUAVE CONTEXTUAL ─── */}
              {contextData.isReservedByOther && !contextData.isAcceptedForThisChat ? (
                <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-center text-center space-x-2 text-xs text-slate-500">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Negociação pausada temporariamente enquanto a reserva com o outro colega estiver ativa.</span>
                </div>
              ) : (
                <form onSubmit={handleSendSubmit} className="p-3 bg-white border-t border-slate-100 flex space-x-2">
                  <button
                    type="button"
                    onClick={handleAttachPhoto}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-persian rounded-2xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
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
                    className="p-3 bg-persian hover:bg-persian-hover disabled:opacity-40 text-white rounded-2xl shadow-md transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
                    title="Enviar"
                  >
                    <Send className="w-5 h-5 text-carrot" />
                  </button>
                </form>
              )}
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

      {/* ─── MODAL SOBREPOSTO DE DETALHES DO ANÚNCIO (ZONA 1) ─── */}
      {isDetailModalOpen && activeListing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
                  <Eye className="w-5 h-5 text-blue-900" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Detalhes do Artigo</h3>
                  <p className="text-[11px] text-slate-400">Consulta rápida sem sair da negociação</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Imagens do Artigo */}
            <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 relative aspect-video flex items-center justify-center">
              <img
                src={activeListing.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'}
                alt={activeListing.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-extrabold rounded-lg uppercase tracking-wider">
                {activeListing.transaction_type || 'Venda'}
              </span>
              <span className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 backdrop-blur-md text-slate-800 text-[10px] font-black rounded-lg shadow-xs">
                {activeListing.condition || 'Usado'}
              </span>
            </div>

            {/* Título e Preço */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-black text-slate-900 leading-snug">
                  {activeListing.title}
                </h2>
                <span className="text-base font-black text-ucm-emerald shrink-0">
                  {activeListing.transaction_type === 'doacao' || activeListing.transaction_type === 'emprestimo'
                    ? 'Grátis'
                    : `${activeListing.price_mzn} MZN`}
                </span>
              </div>
              {activeListing.category && (
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-[11px] text-slate-600">
                    {activeListing.category}
                  </span>
                  {activeListing.course && (
                    <span className="text-slate-400 text-[11px]">
                      • Curso: <strong className="text-slate-600">{activeListing.course}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Descrição */}
            {activeListing.description && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Descrição</span>
                <p className="text-xs text-slate-700 bg-slate-50/70 p-3 rounded-xl leading-relaxed border border-slate-100">
                  {activeListing.description}
                </p>
              </div>
            )}

            {/* Metadados de Encontro e Segurança */}
            <div className="space-y-2 pt-1 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Ponto de Encontro: <strong className="text-slate-900">{activeListing.campus_location || 'Biblioteca Central - UCM Pemba'}</strong>
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-900 shrink-0" />
                <span>Negociação protegida pela moderação académica da UCM Pemba</span>
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="flex space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Voltar à Conversa
              </button>
            </div>
          </div>
        </div>
      )}

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

import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { fetchApi } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { WebSocketContext } from '../context/WebSocketContext';

export function useChat(param1, param2) {
  let listingId, otherUserId;
  if (typeof param1 === 'object' && param1 !== null) {
    listingId = param1.listingId;
    otherUserId = param1.receiverId || param1.otherUserId;
  } else {
    listingId = param1;
    otherUserId = param2;
  }

  const { user } = useContext(AuthContext);
  const { 
    subscribeToMessages, 
    onReconnect, 
    connectionStatus, 
    emitTyping, 
    emitMarkRead, 
    requestNotificationPermission 
  } = useContext(WebSocketContext) || {};

  const cacheKey = listingId && otherUserId ? `cs_chat_${listingId}_${otherUserId}` : null;

  // 1. CARREGAMENTO INICIAL OFFLINE-FIRST (0ms a partir do LocalStorage)
  const [messages, setMessages] = useState(() => {
    if (!cacheKey || typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const lastSyncTimestampRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Persistir mensagens no cache local
  useEffect(() => {
    if (!cacheKey || typeof window === 'undefined' || messages.length === 0) return;
    try {
      // Guardar apenas mensagens definitivas (máx 50) para poupar espaço
      const toCache = messages.filter(m => !m.id.startsWith('temp_')).slice(-50);
      localStorage.setItem(cacheKey, JSON.stringify(toCache));
    } catch (e) {}
  }, [cacheKey, messages]);

  // Carregamento completo do servidor
  const loadMessages = useCallback(async () => {
    if (!listingId || !otherUserId) return;
    try {
      setLoading(true);
      const res = await fetchApi(`/chat/messages/${listingId}/${otherUserId}`);
      if (res.success && Array.isArray(res.data)) {
        setMessages(res.data.map(m => ({ ...m, status: m.is_read ? 'read' : 'sent' })));
        if (res.data.length > 0) {
          lastSyncTimestampRef.current = res.data[res.data.length - 1].created_at;
        }
      }
    } catch (e) {
      console.error('[CHAT LOAD ERROR]:', e);
    } finally {
      setLoading(false);
    }
  }, [listingId, otherUserId]);

  // DELTA SYNC: Busca diferencial de mensagens perdidas
  const syncDeltaMessages = useCallback(async () => {
    if (!listingId || !otherUserId || !lastSyncTimestampRef.current) return;
    try {
      const res = await fetchApi(`/chat/messages/${listingId}/${otherUserId}?since=${encodeURIComponent(lastSyncTimestampRef.current)}`);
      
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map(m => m.id));
          const newItems = res.data
            .filter(m => !existingIds.has(m.id))
            .map(m => ({ ...m, status: m.is_read ? 'read' : 'sent' }));

          if (newItems.length === 0) return prev;

          const updated = [...prev, ...newItems];
          lastSyncTimestampRef.current = updated[updated.length - 1].created_at;
          return updated;
        });
      }
    } catch (e) {
      console.warn('[CHAT DELTA SYNC NOTICE]:', e.message);
    }
  }, [listingId, otherUserId]);

  // Efeito ao trocar de conversa
  useEffect(() => {
    if (listingId && otherUserId) {
      // Ler cache fresco da conversa atual
      if (cacheKey && typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) setMessages(JSON.parse(cached));
        } catch (e) {}
      }

      loadMessages();
      if (emitMarkRead) emitMarkRead(listingId, otherUserId);
    }
  }, [listingId, otherUserId, cacheKey, loadMessages, emitMarkRead]);

  // Registo do Delta Sync ao reconectar
  useEffect(() => {
    if (!onReconnect) return;
    const unsubscribe = onReconnect(() => {
      syncDeltaMessages();
    });
    return unsubscribe;
  }, [onReconnect, syncDeltaMessages]);

  // Escuta de eventos WebSocket em tempo real (Mensagens, Digitação, Leitura)
  useEffect(() => {
    if (!subscribeToMessages) return;

    const unsubscribe = subscribeToMessages((payload) => {
      // 1. Mensagem de Chat Recebida
      if (payload.type === 'CHAT_MESSAGE' && payload.data) {
        const msg = payload.data;
        const isThisChat = 
          msg.listing_id === listingId &&
          ((msg.sender_id === otherUserId && msg.receiver_id === user?.id) ||
           (msg.sender_id === user?.id && msg.receiver_id === otherUserId));

        if (isThisChat) {
          setIsPartnerTyping(false);
          setMessages((prev) => {
            if (prev.some(m => m.id === msg.id)) return prev;

            const hasOptimistic = prev.some(m => m.id.startsWith('temp_') && m.message_text === msg.message_text);
            if (hasOptimistic) {
              return prev.map(m => (m.id.startsWith('temp_') && m.message_text === msg.message_text) ? { ...msg, status: 'sent' } : m);
            }

            lastSyncTimestampRef.current = msg.created_at;
            return [...prev, { ...msg, status: 'sent' }];
          });

          // Se a janela estiver ativa, confirma a leitura imediatamente
          if (emitMarkRead && document.hasFocus()) {
            emitMarkRead(listingId, otherUserId);
          }
        }
      }

      // 2. Indicador de Digitação (Typing Status)
      if (payload.type === 'TYPING_STATUS' && payload.listing_id === listingId && payload.sender_id === otherUserId) {
        setIsPartnerTyping(Boolean(payload.isTyping));
      }

      // 3. Confirmação de Leitura em Tempo Real (Live Read Receipts)
      if (payload.type === 'MESSAGES_READ' && payload.listing_id === listingId && payload.reader_id === otherUserId) {
        setMessages((prev) =>
          prev.map((m) => (m.sender_id === user?.id ? { ...m, status: 'read', is_read: true } : m))
        );
      }
    });

    return unsubscribe;
  }, [subscribeToMessages, listingId, otherUserId, user, emitMarkRead]);

  // Emitir atividade de digitação com Debounce
  const handleTypingActivity = useCallback(() => {
    if (!emitTyping || !listingId || !otherUserId) return;

    emitTyping(listingId, otherUserId, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(listingId, otherUserId, false);
    }, 2500);
  }, [emitTyping, listingId, otherUserId]);

  // OPTIMISTIC UI: Envio imediato no estado local
  const sendMessage = async (text) => {
    if (!listingId || !otherUserId) {
      throw new Error('Destinatário ou anúncio não identificados para envio de mensagem.');
    }

    const trimmedText = text.trim();
    if (!trimmedText) return;

    if (requestNotificationPermission) requestNotificationPermission();

    // Interrompe indicador de digitação
    if (emitTyping) emitTyping(listingId, otherUserId, false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMessage = {
      id: tempId,
      listing_id: listingId,
      sender_id: user?.id,
      receiver_id: otherUserId,
      message_text: trimmedText,
      status: 'sending',
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetchApi('/chat/messages', {
        method: 'POST',
        body: {
          listing_id: listingId,
          receiver_id: otherUserId,
          message_text: trimmedText
        }
      });

      if (res.success && res.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...res.data, status: 'sent' } : m))
        );
        lastSyncTimestampRef.current = res.data.created_at;
        return res.data;
      } else {
        throw new Error(res.error || 'Falha ao enviar mensagem.');
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: 'failed', errorMsg: err.message } : m
        )
      );
      throw err;
    }
  };

  const retryMessage = async (tempId) => {
    const failedMsg = messages.find(m => m.id === tempId);
    if (!failedMsg) return;

    setMessages(prev => prev.filter(m => m.id !== tempId));
    return sendMessage(failedMsg.message_text);
  };

  return { 
    messages, 
    loading, 
    sendMessage, 
    retryMessage, 
    handleTypingActivity,
    isPartnerTyping,
    refresh: loadMessages,
    connectionStatus 
  };
}

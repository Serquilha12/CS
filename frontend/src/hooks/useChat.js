import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { fetchApi } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { WebSocketContext } from '../context/WebSocketContext';
import { supabase } from '../services/supabaseClient';

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
  const supabaseChannelRef = useRef(null);

  // Persistir mensagens no cache local
  useEffect(() => {
    if (!cacheKey || typeof window === 'undefined' || messages.length === 0) return;
    try {
      const toCache = messages.filter(m => !m.id.startsWith('temp_')).slice(-50);
      localStorage.setItem(cacheKey, JSON.stringify(toCache));
    } catch (e) {}
  }, [cacheKey, messages]);

  // Função centralizada para processar mensagens recebidas em tempo real
  const handleIncomingMessage = useCallback((msg) => {
    if (!msg || !msg.id) return;

    // Verificar se a mensagem pertence à conversa atual
    const isThisChat =
      msg.listing_id === listingId &&
      ((msg.sender_id === otherUserId && msg.receiver_id === user?.id) ||
       (msg.sender_id === user?.id && msg.receiver_id === otherUserId));

    if (!isThisChat) return;

    setIsPartnerTyping(false);

    setMessages((prev) => {
      // Evitar duplicações pelo id
      if (prev.some(m => m.id === msg.id)) return prev;

      // Reconciliação otimista: substitui mensagem temporária
      const optimisticIdx = prev.findIndex(
        m => m.id.startsWith('temp_') && m.message_text === msg.message_text && m.sender_id === msg.sender_id
      );

      if (optimisticIdx !== -1) {
        const next = [...prev];
        next[optimisticIdx] = { ...msg, status: 'sent' };
        return next;
      }

      lastSyncTimestampRef.current = msg.created_at;
      return [...prev, { ...msg, status: 'sent' }];
    });

    // Se o chat estiver ativo e focado, confirma a leitura imediatamente
    if (document.hasFocus() && msg.receiver_id === user?.id) {
      if (emitMarkRead) emitMarkRead(listingId, otherUserId);
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'read',
          payload: { reader_id: user?.id, listing_id: listingId }
        });
      }
    }
  }, [listingId, otherUserId, user?.id, emitMarkRead]);

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

  // DELTA SYNC: Busca diferencial de mensagens novas
  const syncDeltaMessages = useCallback(async () => {
    if (!listingId || !otherUserId) return;
    try {
      const endpoint = lastSyncTimestampRef.current
        ? `/chat/messages/${listingId}/${otherUserId}?since=${encodeURIComponent(lastSyncTimestampRef.current)}`
        : `/chat/messages/${listingId}/${otherUserId}`;

      const res = await fetchApi(endpoint);

      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map(m => m.id));
          const newItems = res.data
            .filter(m => !existingIds.has(m.id))
            .map(m => ({ ...m, status: m.is_read ? 'read' : 'sent' }));

          if (newItems.length === 0) return prev;

          // Substituir optimistics correspondentes se existirem
          let next = [...prev];
          for (const item of newItems) {
            const tempIdx = next.findIndex(
              m => m.id.startsWith('temp_') && m.message_text === item.message_text && m.sender_id === item.sender_id
            );
            if (tempIdx !== -1) {
              next[tempIdx] = item;
            } else {
              next.push(item);
            }
          }

          lastSyncTimestampRef.current = next[next.length - 1].created_at;
          return next;
        });

        // Se recebeu novas mensagens de outro utilizador, marcar como lido
        const hasIncoming = res.data.some(m => m.receiver_id === user?.id);
        if (hasIncoming && document.hasFocus() && emitMarkRead) {
          emitMarkRead(listingId, otherUserId);
        }
      }
    } catch (e) {
      // Falhas silenciosas de delta sync temporárias são toleradas
    }
  }, [listingId, otherUserId, user?.id, emitMarkRead]);

  // Efeito ao trocar de conversa
  useEffect(() => {
    if (listingId && otherUserId) {
      lastSyncTimestampRef.current = null;
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

  // CAMADA 1: SUPABASE REALTIME (Postgres Changes + Broadcast instantâneo)
  useEffect(() => {
    if (!listingId || !user?.id) return;

    const channelName = `chat_room_${listingId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true }
      }
    });

    channel
      // A. Inserção no PostgreSQL
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `listing_id=eq.${listingId}`
        },
        (payload) => {
          if (payload.new) handleIncomingMessage(payload.new);
        }
      )
      // B. Atualização no PostgreSQL (Ex: is_read marcado como true)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `listing_id=eq.${listingId}`
        },
        (payload) => {
          const updated = payload.new;
          if (updated) {
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, ...updated, status: updated.is_read ? 'read' : 'sent' } : m))
            );
          }
        }
      )
      // C. Broadcast instantâneo peer-to-peer de novas mensagens (<30ms)
      .on('broadcast', { event: 'new_message' }, (payload) => {
        if (payload?.payload) handleIncomingMessage(payload.payload);
      })
      // D. Broadcast instantâneo de indicador de digitação
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload?.payload?.sender_id === otherUserId) {
          setIsPartnerTyping(Boolean(payload.payload.isTyping));
        }
      })
      // E. Broadcast instantâneo de confirmação de leitura
      .on('broadcast', { event: 'read' }, (payload) => {
        if (payload?.payload?.reader_id === otherUserId) {
          setMessages((prev) =>
            prev.map((m) => (m.sender_id === user?.id ? { ...m, status: 'read', is_read: true } : m))
          );
        }
      })
      // F. Remoção no PostgreSQL em tempo real
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `listing_id=eq.${listingId}`
        },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
          }
        }
      )
      // G. Broadcast instantâneo de mensagem apagada
      .on('broadcast', { event: 'message_deleted' }, (payload) => {
        const deletedId = payload?.payload?.messageId;
        if (deletedId) {
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      })
      // H. Broadcast instantâneo de conversa apagada
      .on('broadcast', { event: 'conversation_deleted' }, (payload) => {
        if (payload?.payload?.listingId === listingId) {
          setMessages([]);
          if (cacheKey && typeof window !== 'undefined') {
            localStorage.removeItem(cacheKey);
          }
        }
      })
      .subscribe((status) => {
        console.log(`[SUPABASE REALTIME ${channelName}]:`, status);
      });

    supabaseChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      supabaseChannelRef.current = null;
    };
  }, [listingId, otherUserId, user?.id, cacheKey, handleIncomingMessage]);

  // CAMADA 2: WEBSOCKET NATIVO DO BACKEND (quando conectado)
  useEffect(() => {
    if (!subscribeToMessages) return;

    const unsubscribe = subscribeToMessages((payload) => {
      if (payload.type === 'CHAT_MESSAGE' && payload.data) {
        handleIncomingMessage(payload.data);
      }

      if (payload.type === 'TYPING_STATUS' && payload.listing_id === listingId && payload.sender_id === otherUserId) {
        setIsPartnerTyping(Boolean(payload.isTyping));
      }

      if (payload.type === 'MESSAGES_READ' && payload.listing_id === listingId && payload.reader_id === otherUserId) {
        setMessages((prev) =>
          prev.map((m) => (m.sender_id === user?.id ? { ...m, status: 'read', is_read: true } : m))
        );
      }

      if (payload.type === 'MESSAGE_DELETED' && payload.messageId) {
        setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
      }

      if (payload.type === 'CONVERSATION_DELETED' && payload.listingId === listingId) {
        setMessages([]);
        if (cacheKey && typeof window !== 'undefined') {
          localStorage.removeItem(cacheKey);
        }
      }
    });

    return unsubscribe;
  }, [subscribeToMessages, listingId, otherUserId, user?.id, cacheKey, handleIncomingMessage]);

  // CAMADA 3: SMART DELTA-SYNC EM SEGUNDO PLANO (Verificação a cada 2.5s)
  // Garante que nenhuma mensagem seja perdida mesmo com redes instáveis ou quedas de socket
  useEffect(() => {
    if (!listingId || !otherUserId) return;

    const intervalId = setInterval(() => {
      syncDeltaMessages();
    }, 2500);

    return () => clearInterval(intervalId);
  }, [listingId, otherUserId, syncDeltaMessages]);

  // Registo do Delta Sync ao reconectar socket
  useEffect(() => {
    if (!onReconnect) return;
    const unsubscribe = onReconnect(() => {
      syncDeltaMessages();
    });
    return unsubscribe;
  }, [onReconnect, syncDeltaMessages]);

  // Emitir atividade de digitação com Debounce
  const handleTypingActivity = useCallback(() => {
    if (!listingId || !otherUserId) return;

    if (emitTyping) emitTyping(listingId, otherUserId, true);

    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender_id: user?.id, isTyping: true }
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (emitTyping) emitTyping(listingId, otherUserId, false);
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { sender_id: user?.id, isTyping: false }
        });
      }
    }, 2500);
  }, [emitTyping, listingId, otherUserId, user?.id]);

  // OPTIMISTIC UI: Envio imediato no estado local com broadcast instantâneo
  const sendMessage = async (text) => {
    if (!listingId || !otherUserId) {
      throw new Error('Destinatário ou anúncio não identificados para envio de mensagem.');
    }

    const trimmedText = text.trim();
    if (!trimmedText) return;

    if (requestNotificationPermission) requestNotificationPermission();

    // Interrompe indicador de digitação
    if (emitTyping) emitTyping(listingId, otherUserId, false);
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender_id: user?.id, isTyping: false }
      });
    }
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

        // Broadcast imediato para entrega em <30ms no Supabase Realtime
        if (supabaseChannelRef.current) {
          supabaseChannelRef.current.send({
            type: 'broadcast',
            event: 'new_message',
            payload: res.data
          });
        }

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

  const deleteMessage = async (messageId) => {
    if (!messageId) return;

    // Remoção otimista imediata na interface
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      const res = await fetchApi(`/chat/messages/${messageId}`, {
        method: 'DELETE'
      });

      if (res.success) {
        // Broadcast instantâneo no canal Supabase Realtime
        if (supabaseChannelRef.current) {
          supabaseChannelRef.current.send({
            type: 'broadcast',
            event: 'message_deleted',
            payload: { messageId }
          });
        }
        return true;
      }
    } catch (err) {
      console.error('[DELETE MESSAGE ERROR]:', err);
      loadMessages();
      throw err;
    }
  };

  const deleteConversation = async () => {
    if (!listingId || !otherUserId) return;

    // Limpar imediatamente o estado local e cache
    setMessages([]);
    if (cacheKey && typeof window !== 'undefined') {
      localStorage.removeItem(cacheKey);
    }

    try {
      const res = await fetchApi(`/chat/conversations/${listingId}/${otherUserId}`, {
        method: 'DELETE'
      });

      if (res.success) {
        if (supabaseChannelRef.current) {
          supabaseChannelRef.current.send({
            type: 'broadcast',
            event: 'conversation_deleted',
            payload: { listingId }
          });
        }
        return true;
      }
    } catch (err) {
      console.error('[DELETE CONVERSATION ERROR]:', err);
      loadMessages();
      throw err;
    }
  };

  return { 
    messages, 
    loading, 
    sendMessage, 
    deleteMessage,
    deleteConversation,
    retryMessage, 
    handleTypingActivity, 
    isPartnerTyping, 
    refresh: loadMessages, 
    connectionStatus 
  };
}

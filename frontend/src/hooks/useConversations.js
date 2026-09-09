import { useState, useEffect, useCallback, useContext } from 'react';
import { fetchApi } from '../services/api';
import { WebSocketContext } from '../context/WebSocketContext';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

export function useConversations() {
  const { user } = useContext(AuthContext);
  const { subscribeToMessages } = useContext(WebSocketContext) || {};
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConversations = useCallback(async (isSilent = false) => {
    if (!user?.id) return;
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const res = await fetchApi('/chat/conversations');
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (err) {
      if (!isSilent) setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 1. Escuta via Supabase Realtime para qualquer nova mensagem dirigida ou enviada pelo utilizador
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `user_inbox_${user.id}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const msg = payload.new;
          if (msg && (msg.receiver_id === user.id || msg.sender_id === user.id)) {
            loadConversations(true);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const msg = payload.new;
          if (msg && (msg.receiver_id === user.id || msg.sender_id === user.id)) {
            loadConversations(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadConversations]);

  // 2. Escuta de eventos via WebSocket Context
  useEffect(() => {
    if (!subscribeToMessages) return;

    const unsubscribe = subscribeToMessages((payload) => {
      if (payload.type === 'CHAT_MESSAGE' && payload.data) {
        loadConversations(true);
      }
    });

    return unsubscribe;
  }, [subscribeToMessages, loadConversations]);

  // 3. Atualização Periódica de Fundo a cada 6 segundos enquanto estiver na aplicação
  useEffect(() => {
    if (!user?.id) return;

    const intervalId = setInterval(() => {
      loadConversations(true);
    }, 6000);

    return () => clearInterval(intervalId);
  }, [user?.id, loadConversations]);

  return { conversations, loading, error, refresh: loadConversations };
}

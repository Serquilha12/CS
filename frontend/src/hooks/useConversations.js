import { useState, useEffect, useCallback, useContext } from 'react';
import { fetchApi } from '../services/api';
import { WebSocketContext } from '../context/WebSocketContext';
import { AuthContext } from '../context/AuthContext';

export function useConversations() {
  const { user } = useContext(AuthContext);
  const { subscribeToMessages } = useContext(WebSocketContext) || {};
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi('/chat/conversations');
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Atualizar a lista de conversas em tempo real quando uma nova mensagem chegar
  useEffect(() => {
    if (!subscribeToMessages) return;

    const unsubscribe = subscribeToMessages((payload) => {
      if (payload.type === 'CHAT_MESSAGE' && payload.data) {
        loadConversations();
      }
    });

    return unsubscribe;
  }, [subscribeToMessages, loadConversations]);

  return { conversations, loading, error, refresh: loadConversations };
}

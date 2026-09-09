import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { supabase } from '../services/supabaseClient';

export const WebSocketContext = createContext();

export function WebSocketProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [alerts, setAlerts] = useState([]);

  // Callbacks registrados para mensagens e eventos de reconexão
  const messageListenersRef = useRef(new Set());
  const reconnectListenersRef = useRef(new Set());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const isManuallyClosedRef = useRef(false);

  // Registro de listener para o Chat (mensagens privadas)
  const subscribeToMessages = useCallback((callback) => {
    messageListenersRef.current.add(callback);
    return () => {
      messageListenersRef.current.delete(callback);
    };
  }, []);

  // Registro de listener para Delta Sync após reconexão
  const onReconnect = useCallback((callback) => {
    reconnectListenersRef.current.add(callback);
    return () => {
      reconnectListenersRef.current.delete(callback);
    };
  }, []);

  // 1. SUPABASE REALTIME GLOBAL (Alertas de Notificação e Mensagens para o Utilizador)
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `global_user_channel_${user.id}`;
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
          if (msg && msg.receiver_id === user.id) {
            // Notificação do Navegador (Web Notifications API) quando a aba estiver em segundo plano
            if (
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted' &&
              document.hidden
            ) {
              const body = msg.message_text?.startsWith('[Fotografia')
                ? 'Enviou uma fotografia do material'
                : msg.message_text;

              try {
                const n = new Notification('CampusStore: Nova Mensagem', {
                  body,
                  icon: '/favicon.ico'
                });
                n.onclick = () => {
                  window.focus();
                  n.close();
                };
              } catch (e) {}
            }

            // Notificar ouvintes do chat
            messageListenersRef.current.forEach((listener) => {
              try {
                listener({ type: 'CHAT_MESSAGE', data: msg });
              } catch (e) {
                console.error(e);
              }
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listings'
        },
        (payload) => {
          const listing = payload.new;
          if (listing && listing.owner_id !== user.id) {
            setAlerts((prev) => [
              {
                type: 'NEW_LISTING_ALERT',
                course: listing.course,
                data: listing
              },
              ...prev
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // 2. CONEXÃO WEBSOCKET LOCAL / BACKEND OPCIONAL
  const connectWebSocket = useCallback(async () => {
    if (!user) return;
    if (isManuallyClosedRef.current) return;

    try {
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
      if (isVercel) {
        // No Vercel, o Supabase Realtime atua como canal principal
        setConnectionStatus('connected');
        return;
      }

      const token = (typeof window !== 'undefined' ? localStorage.getItem('cs_token') : null) || 'dummy-token';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:5000?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setSocket(ws);
        setConnectionStatus('connected');
        const wasReconnecting = reconnectAttemptRef.current > 0;
        reconnectAttemptRef.current = 0;

        if (wasReconnecting) {
          reconnectListenersRef.current.forEach((cb) => {
            try { cb(); } catch (e) { console.error(e); }
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'NEW_LISTING_ALERT') {
            setAlerts((prev) => [payload, ...prev]);
          }

          messageListenersRef.current.forEach((listener) => {
            try { listener(payload); } catch (e) { console.error(e); }
          });
        } catch (e) {
          console.error('[WS PARSE ERROR]:', e);
        }
      };

      ws.onclose = () => {
        setSocket(null);
        if (isManuallyClosedRef.current) return;

        // Mantém status 'connected' porque o Supabase Realtime permanece ativo
        setConnectionStatus('connected');

        if (reconnectAttemptRef.current < 5) {
          reconnectAttemptRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        }
      };

      ws.onerror = () => {
        // ws.onclose cuidará da reconexão
      };

    } catch (e) {
      setConnectionStatus('connected'); // Supabase Realtime ativo como fallback
    }
  }, [user]);

  // Função para solicitar permissão de notificações do navegador
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }
  }, []);

  // Emissão de Indicador de Digitação via WebSocket
  const emitTyping = useCallback((listingId, receiverId, isTyping) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: isTyping ? 'TYPING_START' : 'TYPING_STOP',
        listing_id: listingId,
        receiver_id: receiverId
      }));
    }
  }, [socket]);

  // Emissão de Confirmação de Leitura via WebSocket
  const emitMarkRead = useCallback((listingId, receiverId) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'MARK_READ',
        listing_id: listingId,
        receiver_id: receiverId
      }));
    }
  }, [socket]);

  useEffect(() => {
    isManuallyClosedRef.current = false;
    if (!user) {
      isManuallyClosedRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socket) {
        try { socket.close(); } catch(e) {}
      }
      setSocket(null);
      return;
    }

    connectWebSocket();

    return () => {
      isManuallyClosedRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socket) {
        try { socket.close(); } catch(e) {}
      }
    };
  }, [user, connectWebSocket]);

  return (
    <WebSocketContext.Provider value={{ 
      socket, 
      alerts, 
      connectionStatus, 
      subscribeToMessages, 
      onReconnect,
      emitTyping,
      emitMarkRead,
      requestNotificationPermission
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

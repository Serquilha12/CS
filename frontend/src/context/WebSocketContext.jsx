import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { supabase } from '../services/supabaseClient';

export const WebSocketContext = createContext();

export function WebSocketProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'connecting' | 'reconnecting' | 'disconnected'
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

  // Registro de listener para Delta Sync após reconexão bem-sucedida
  const onReconnect = useCallback((callback) => {
    reconnectListenersRef.current.add(callback);
    return () => {
      reconnectListenersRef.current.delete(callback);
    };
  }, []);

  const connectWebSocket = useCallback(async () => {
    if (!user) return;
    if (isManuallyClosedRef.current) return;

    try {
      const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
      if (isVercel) {
        setConnectionStatus('connected');
        return;
      }

      // Obter o token JWT real do Supabase
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || 'dummy-token';

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:5000?token=${encodeURIComponent(token)}`;

      setConnectionStatus(reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting');

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS FRONTEND CONNECTED]');
        setSocket(ws);
        setConnectionStatus('connected');

        const wasReconnecting = reconnectAttemptRef.current > 0;
        reconnectAttemptRef.current = 0;

        // Se for uma reconexão após queda, dispara Delta Sync para todos os ouvintes
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

          // Notificação do Navegador (Web Notifications API) quando a aba estiver em segundo plano
          if (
            payload.type === 'CHAT_MESSAGE' && 
            payload.data && 
            typeof window !== 'undefined' && 
            'Notification' in window && 
            Notification.permission === 'granted' && 
            document.hidden
          ) {
            const msg = payload.data;
            const senderName = msg.sender?.full_name || 'Colega UCM';
            const body = msg.message_text?.startsWith('[Fotografia')
              ? 'Enviou uma fotografia do material'
              : msg.message_text;

            try {
              const n = new Notification(`CampusStore: ${senderName}`, {
                body,
                icon: '/favicon.ico'
              });
              n.onclick = () => {
                window.focus();
                n.close();
              };
            } catch (e) {}
          }

          // Notificar os listeners do chat (ex: nova mensagem recebida, typing, etc.)
          messageListenersRef.current.forEach((listener) => {
            try { listener(payload); } catch (e) { console.error(e); }
          });
        } catch (e) {
          console.error('[WS PARSE ERROR]:', e);
        }
      };

      ws.onclose = () => {
        setSocket(null);
        if (isManuallyClosedRef.current) {
          setConnectionStatus('disconnected');
          return;
        }

        // LÓGICA DE RECONEXÃO COM BACKOFF EXPONENCIAL
        setConnectionStatus('reconnecting');
        const attempt = reconnectAttemptRef.current;
        const delay = Math.min(1000 * Math.pow(1.8, attempt) + Math.random() * 500, 30000);
        console.log(`[WS RECONNECT]: Tentativa ${attempt + 1} agendada para ${Math.round(delay)}ms`);

        reconnectAttemptRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      };

      ws.onerror = () => {
        // ws.onclose será acionado logo a seguir
      };

    } catch (e) {
      console.warn('[WS ERROR]:', e.message);
      setConnectionStatus('disconnected');
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
      setConnectionStatus('disconnected');
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

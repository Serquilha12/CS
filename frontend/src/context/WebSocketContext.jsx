import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';

export const WebSocketContext = createContext();

export function WebSocketProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        try { socket.close(); } catch(e) {}
      }
      setSocket(null);
      return;
    }

    let ws = null;
    try {
      const isVercel = window.location.hostname.includes('vercel.app');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Conecta apenas se não for Vercel Serverless (onde a porta 5000 WS não existe)
      if (!isVercel) {
        const wsUrl = `${protocol}//${window.location.hostname}:5000?token=dummy-token`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[WS FRONTEND CONNECTED]');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'NEW_LISTING_ALERT') {
              setAlerts((prev) => [message, ...prev]);
            }
          } catch (e) {}
        };

        ws.onerror = (err) => {
          console.warn('[WS NOTICE] Conexão WebSocket não disponível no ambiente atual.');
        };

        setSocket(ws);
      }
    } catch (e) {
      console.warn('[WS NOTICE] Erro ao iniciar WebSocket:', e.message);
    }

    return () => {
      if (ws) {
        try { ws.close(); } catch (e) {}
      }
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={{ socket, alerts }}>
      {children}
    </WebSocketContext.Provider>
  );
}

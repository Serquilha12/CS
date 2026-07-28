import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';

export const WebSocketContext = createContext();

export function WebSocketProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!user) {
      if (socket) socket.close();
      return;
    }

    // Em produção, o token estaria no cookie ou passado no handshake
    const wsUrl = `ws://${window.location.hostname}:5000?token=dummy-token`;
    const ws = new WebSocket(wsUrl);

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

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={{ socket, alerts }}>
      {children}
    </WebSocketContext.Provider>
  );
}

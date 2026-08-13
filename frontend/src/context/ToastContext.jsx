import React, { createContext, useContext, useState } from 'react';
import { Toast } from '../components/Toast';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'info', duration = 4000) {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, duration);
  }

  React.useEffect(() => {
    function handleNetworkError(e) {
      showToast(e.detail || 'Sem ligação à rede Wi-Fi do campus.', 'error', 5000);
    }
    function handleOffline() {
      showToast('Ligação Wi-Fi perdida. A trabalhar em modo offline.', 'warning', 5000);
    }
    function handleOnline() {
      showToast('Ligação à Internet restabelecida!', 'success', 3000);
    }

    window.addEventListener('cs-network-error', handleNetworkError);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('cs-network-error', handleNetworkError);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  function hideToast() {
    setToast(null);
  }

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg) => console.log(msg),
      hideToast: () => {}
    };
  }
  return context;
}

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

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './index.css';

// Tratar e recuperar automaticamente erros de carregamento dinâmico de chunks (ex: novo deploy no Vercel)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Detetada nova versão da aplicação ou chunk inacessível. A recarregar página...', event);
  // Força recarregar para buscar o index.html e assets mais recentes
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

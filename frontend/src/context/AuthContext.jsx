import React, { createContext, useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthSession();
  }, []);

  // Ouvir evento global de sessão expirada (emitido pelo fetchApi ao receber 401)
  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      localStorage.removeItem('cs_token');
      // Redirecionar para a página inicial
      if (window.location.pathname !== '/') {
        window.location.replace('/');
      }
    }
    window.addEventListener('cs-session-expired', handleSessionExpired);
    return () => window.removeEventListener('cs-session-expired', handleSessionExpired);
  }, []);

  // Temporizador de Inatividade (15 minutos = 900.000 ms) para computadores da faculdade
  useEffect(() => {
    if (!user) return;

    let inactivityTimer;

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        logout();
        alert('Sessão encerrada automaticamente por inatividade no computador para proteger a sua conta UCM.');
      }, 15 * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  async function checkAuthSession() {
    try {
      const res = await fetchApi('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await fetchApi('/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    if (res.success && res.data) {
      if (res.data.token) {
        localStorage.setItem('cs_token', res.data.token);
      }
      const profile = res.data.profile || res.data.user || res.data;
      setUser(profile);
      return profile;
    }
    return null;
  }

  async function register(data) {
    const res = await fetchApi('/auth/register', {
      method: 'POST',
      body: data
    });

    if (res.success && res.data) {
      if (res.data.token) {
        localStorage.setItem('cs_token', res.data.token);
      }
      const profile = res.data.profile || res.data.user || res.data;
      setUser(profile);
      return profile;
    }
    return null;
  }

  async function logout() {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('cs_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

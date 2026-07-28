import React, { createContext, useState, useEffect } from 'react';
import { fetchApi } from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthSession();
  }, []);

  async function checkAuthSession() {
    try {
      const res = await fetchApi('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
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

    if (res.success && res.data?.profile) {
      setUser(res.data.profile);
    }
    return res;
  }

  async function register(data) {
    const res = await fetchApi('/auth/register', {
      method: 'POST',
      body: data
    });

    if (res.success && res.data?.profile) {
      setUser(res.data.profile);
    }
    return res;
  }

  async function logout() {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (e) {}
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

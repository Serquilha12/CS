import React, { Suspense, lazy, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ToastProvider } from './context/ToastContext';
import { BottomNavigation } from './components/BottomNavigation';
import { LandingPage } from './pages/LandingPage';
import { Marketplace } from './pages/Marketplace';
import { ListingDetail } from './pages/ListingDetail';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

// Code Splitting (React.lazy) para isolar o código do Administrador
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Componente Guarda de Rota Protegida (Exige Login)
function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

// Componente Guarda de Rota Admin (Exige Role 'admin' - Invisível para Estudantes)
function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useContext(AuthContext);
  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <WebSocketProvider>
          <Router>
            <div className="min-h-screen bg-slate-50">
              <Routes>
                {/* Rota Aberta de Entrada e Redefinição de Palavra-passe */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Rotas Protegidas do Mercado e Utilizadores Autenticados */}
                <Route
                  path="/marketplace"
                  element={
                    <ProtectedRoute>
                      <Marketplace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/anunciar"
                  element={
                    <ProtectedRoute>
                      <Marketplace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/item/:id"
                  element={
                    <ProtectedRoute>
                      <ListingDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <ChatPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/perfil"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* Rota Reservada de Moderação Admin (Code Splitting + Protected Guard) */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <Suspense fallback={<div className="p-8 text-center text-slate-500 font-semibold text-xs">A carregar Painel de Moderação da Administração...</div>}>
                        <AdminDashboard />
                      </Suspense>
                    </AdminRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

              {/* Navegação Inferior (Apenas renderiza botão Admin se user.role === 'admin') */}
              <BottomNavigation />
            </div>
          </Router>
        </WebSocketProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

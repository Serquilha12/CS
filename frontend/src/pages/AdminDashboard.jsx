import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, ShoppingBag, DollarSign, Ban, Trash2, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await fetchApi('/admin/dashboard');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Erro ao carregar dados do painel de administração.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveListing(listingId) {
    if (!window.confirm('Tem certeza de que pretende suspender este anúncio?')) return;
    try {
      const res = await fetchApi(`/admin/listings/${listingId}`, { method: 'DELETE' });
      if (res.success) {
        showToast('Anúncio suspenso pelo Administrador.', 'info');
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao suspender anúncio.', 'error');
    }
  }

  async function handleSuspendUser(userId) {
    if (!window.confirm('Tem certeza de que pretende bloquear este utilizador? Todos os seus anúncios serão removidos.')) return;
    try {
      const res = await fetchApi(`/admin/users/${userId}/suspend`, { method: 'PUT' });
      if (res.success) {
        showToast('Utilizador suspenso com sucesso!', 'warning');
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao suspender utilizador.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-slate-500 text-xs font-semibold">
        A carregar Painel de Moderação da Administração...
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentListings = data?.recentListings || [];
  const recentUsers = data?.recentUsers || [];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header do Admin */}
      <div className="flex items-center space-x-3 pt-2">
        <div className="w-10 h-10 bg-slate-900 text-amber-400 rounded-2xl flex items-center justify-center shadow-md">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel de Moderação Admin</h1>
          <p className="text-xs text-slate-500">Monitorização & Segurança UCM Pemba</p>
        </div>
      </div>

      {/* Cartões de Estatísticas Globais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <Users className="w-5 h-5 text-blue-500" />
          <p className="text-xl font-bold text-slate-800">{stats.total_users || 0}</p>
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Estudantes</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <ShoppingBag className="w-5 h-5 text-ucm-emerald" />
          <p className="text-xl font-bold text-slate-800">{stats.total_listings || 0}</p>
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Anúncios</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <CheckCircle2 className="w-5 h-5 text-amber-500" />
          <p className="text-xl font-bold text-slate-800">{stats.total_completed_sales || 0}</p>
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Concluídos</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <p className="text-xl font-bold text-slate-800">{stats.total_saved_mzn || 0} MZN</p>
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Poupados</p>
        </div>
      </div>

      {/* Tabela de Gestão de Anúncios */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Moderação de Anúncios Recentes</h2>

        <div className="divide-y divide-slate-100">
          {recentListings.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                <p className="text-xs text-slate-500">
                  {item.category} • {item.price_mzn} MZN • {item.profiles?.full_name}
                </p>
              </div>

              <button
                onClick={() => handleRemoveListing(item.id)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl text-xs flex items-center transition-colors border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Suspender
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela de Gestão de Utilizadores */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Estudantes Registados</h2>

        <div className="divide-y divide-slate-100">
          {recentUsers.map((u) => (
            <div key={u.id} className="py-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{u.full_name}</h3>
                <p className="text-xs text-slate-500">
                  {u.email} • {u.course}
                </p>
              </div>

              {u.status === 'suspended' ? (
                <span className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                  Suspenso
                </span>
              ) : (
                <button
                  onClick={() => handleSuspendUser(u.id)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-xl text-xs flex items-center transition-colors border border-amber-200"
                >
                  <Ban className="w-3.5 h-3.5 mr-1" /> Suspender Conta
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

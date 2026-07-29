import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, ShoppingBag, DollarSign, Ban, Trash2, CheckCircle2, AlertTriangle, ShieldAlert, EyeOff, Check } from 'lucide-react';
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
    if (!window.confirm('Tem certeza de que pretende suspender/ocultar este anúncio da plataforma?')) return;
    try {
      const res = await fetchApi(`/admin/listings/${listingId}`, { method: 'DELETE' });
      if (res.success) {
        showToast('Anúncio suspenso e ocultado pelo Administrador.', 'info');
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao suspender anúncio.', 'error');
    }
  }

  async function handleSuspendUser(userId) {
    if (!window.confirm('Tem certeza de que pretende suspender esta conta de utilizador?')) return;
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

  function handleIgnoreReport(listingId) {
    showToast('Denúncia ignorada. Anúncio mantido ativo.', 'info');
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
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-24">
      {/* Header do Admin */}
      <div className="flex items-center space-x-3 pt-2">
        <div className="w-11 h-11 bg-slate-900 text-amber-400 rounded-2xl flex items-center justify-center shadow-md">
          <ShieldAlert className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel de Moderação Admin</h1>
          <p className="text-xs text-slate-500">Monitorização, Segurança & Auditoria UCM Pemba</p>
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

      {/* Tabela de Moderação de Anúncios e Alertas */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" /> Moderação de Anúncios Recentes
          </h2>
          <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
            Fila de Auditoria
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {recentListings.map((item) => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.price_mzn} MZN • {item.profiles?.full_name || 'Estudante'} ({item.campus_location || 'UCM'})
                </p>
              </div>

              {/* Botões de Ação Rápida com Touch Targets min-h-[44px] */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* Botão Suspender / Ocultar Anúncio (Contorno Vermelho) */}
                <button
                  onClick={() => handleRemoveListing(item.id)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center transition-colors border border-rose-200 min-h-[44px]"
                  title="Ocultar Anúncio da Plataforma"
                >
                  <EyeOff className="w-4 h-4 mr-1.5" /> Suspender Anúncio
                </button>

                {/* Botão Ignorar Denúncia (Cinzento Simples) */}
                <button
                  onClick={() => handleIgnoreReport(item.id)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs flex items-center transition-colors border border-slate-200 min-h-[44px]"
                  title="Ignorar Alerta"
                >
                  <Check className="w-4 h-4 mr-1" /> Ignorar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela de Gestão de Utilizadores e Segurança da Comunidade */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center">
          <ShieldAlert className="w-5 h-5 mr-2 text-slate-700" /> Estudantes e Segurança da Comunidade
        </h2>

        <div className="divide-y divide-slate-100">
          {recentUsers.map((u) => (
            <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{u.full_name}</h3>
                <p className="text-xs text-slate-500">
                  {u.email} • {u.course}
                </p>
              </div>

              {u.status === 'suspended' ? (
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3.5 py-2 rounded-xl border border-rose-200 inline-flex items-center min-h-[44px]">
                  <Ban className="w-4 h-4 mr-1.5" /> Conta Suspensa
                </span>
              ) : (
                /* Botão Suspender Utilizador (Contorno Vermelho Escuro) */
                <button
                  onClick={() => handleSuspendUser(u.id)}
                  className="px-3.5 py-2 bg-rose-900/10 hover:bg-rose-900/20 text-rose-800 font-bold rounded-xl text-xs flex items-center transition-colors border border-rose-800/30 min-h-[44px]"
                >
                  <Ban className="w-4 h-4 mr-1.5" /> Suspender Utilizador
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

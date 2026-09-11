import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, ShieldCheck, Users, ShoppingBag, DollarSign, 
  AlertTriangle, EyeOff, Check, Ban, Search, FileText, 
  RefreshCw, Lock, ExternalLink, Flag, Info, UserX, UserCheck, Clock, X,
  Trash2, RotateCcw, CheckCircle2
} from 'lucide-react';
import { fetchApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'listings' | 'users' | 'logs'
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null); // Modal de análise detalhada de denúncia
  const { showToast } = useToast();

  useEffect(() => {
    loadDashboard();
  }, [searchTerm]);

  async function loadDashboard() {
    try {
      setLoading(true);
      const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const res = await fetchApi(`/admin/dashboard${query}`);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Erro ao carregar dados do painel de administração.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteListing(listingId) {
    if (!window.confirm('ATENÇÃO: Pretende apagar definitivamente este anúncio da plataforma?')) return;
    try {
      const res = await fetchApi(`/admin/listings/${listingId}`, { method: 'DELETE' });
      if (res.success) {
        showToast('Anúncio apagado com sucesso pelo administrador.', 'info');
        if (selectedReport) setSelectedReport(null);
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao apagar anúncio.', 'error');
    }
  }

  async function handleReactivateListing(listingId) {
    if (!window.confirm('Pretende reativar este anúncio e torná-lo novamente visível no feed do Marketplace?')) return;
    try {
      const res = await fetchApi(`/admin/listings/${listingId}/reactivate`, { method: 'PUT' });
      if (res.success) {
        showToast('Anúncio reativado com sucesso no feed público!', 'success');
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao reativar anúncio.', 'error');
    }
  }

  async function handleSuspendListing(listingId) {
    if (!window.confirm('Tem certeza de que pretende suspender este anúncio? Ele deixará de ser visível no feed do Marketplace.')) return;
    try {
      const res = await fetchApi(`/admin/listings/${listingId}/suspend`, {
        method: 'PUT',
        body: { reason: 'Violação dos Termos e Diretrizes de Moderação UCM Pemba' }
      });
      if (res.success) {
        showToast('Anúncio suspenso com sucesso. Anúncio ocultado do feed público.', 'info');
        if (selectedReport) setSelectedReport(null);
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao suspender anúncio.', 'error');
    }
  }

  async function handleSuspendUser(userId) {
    if (!window.confirm('ATENÇÃO: Pretende suspender esta conta de estudante? Todos os seus anúncios ativos serão ocultados e a sessão será revogada imediatamente.')) return;
    try {
      const res = await fetchApi(`/admin/users/${userId}/suspend`, {
        method: 'PUT',
        body: { reason: 'Padrão contínuo de má conduta ou comportamento abusivo' }
      });
      if (res.success) {
        showToast('Utilizador suspenso com sucesso. Acesso bloqueado.', 'warning');
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao suspender utilizador.', 'error');
    }
  }

  async function handleReactivateUser(userId) {
    if (!window.confirm('Pretende reativar o acesso deste utilizador na plataforma?')) return;
    try {
      const res = await fetchApi(`/admin/users/${userId}/reactivate`, { method: 'PUT' });
      if (res.success) {
        showToast('Conta do utilizador reativada com sucesso!', 'success');
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao reativar utilizador.', 'error');
    }
  }

  async function handleIgnoreReport(reportId) {
    try {
      const res = await fetchApi(`/admin/reports/${reportId}/ignore`, { method: 'PUT' });
      if (res.success) {
        showToast('Denúncia arquivada como alarme falso. Anúncio mantido no feed.', 'info');
        if (selectedReport) setSelectedReport(null);
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao arquivar denúncia.', 'error');
    }
  }

  async function handleToggleRole(userItem) {
    const newRole = userItem.role === 'admin' ? 'student' : 'admin';
    const actionLabel = newRole === 'admin' ? 'promover a Administrador' : 'alterar para Estudante';
    if (!window.confirm(`Tem certeza de que pretende ${actionLabel} o utilizador "${userItem.full_name}" (${userItem.email})?`)) return;

    try {
      const res = await fetchApi(`/admin/users/${userItem.id}/role`, {
        method: 'PUT',
        body: { role: newRole }
      });
      if (res.success) {
        showToast(`Cargo alterado para ${newRole.toUpperCase()} com sucesso!`, 'success');
        loadDashboard();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao alterar cargo do utilizador.', 'error');
    }
  }

  const stats = data?.stats || {};
  const listings = data?.recentListings || [];
  const users = data?.recentUsers || [];
  const reports = data?.reports || [];
  const auditLogs = data?.auditLogs || [];

  const pendingReports = reports.filter((r) => r.status === 'pending');

  const filteredReports = reports.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      r.reason?.toLowerCase().includes(term) ||
      r.details?.toLowerCase().includes(term) ||
      r.reporter?.full_name?.toLowerCase().includes(term) ||
      r.reporter?.email?.toLowerCase().includes(term) ||
      r.listing?.title?.toLowerCase().includes(term)
    );
  });

  const filteredListings = listings.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      item.title?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term) ||
      item.profiles?.full_name?.toLowerCase().includes(term) ||
      item.profiles?.email?.toLowerCase().includes(term) ||
      item.id?.toLowerCase().includes(term)
    );
  });

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      u.full_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.course?.toLowerCase().includes(term) ||
      u.id?.toLowerCase().includes(term)
    );
  });

  const filteredLogs = auditLogs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      log.action?.toLowerCase().includes(term) ||
      log.admin?.email?.toLowerCase().includes(term) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 pb-28">
      {/* Header com Identidade Institucional de Segurança e Moderação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-persian text-white rounded-2xl flex items-center justify-center shadow-lg shadow-persian/30">
            <ShieldAlert className="w-7 h-7 text-carrot" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Painel de Moderação Admin</h1>
              <span className="px-2.5 py-0.5 bg-carrot text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-xs">
                Camada de Segurança
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500">Auditoria & Proteção Anti-Fraude • UCM Pemba</p>
          </div>
        </div>

        {/* Botão de Recarregar Dados */}
        <button
          onClick={loadDashboard}
          className="px-4 py-2 bg-platinum hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors border border-slate-300/80 self-start sm:self-auto min-h-[44px]"
        >
          <RefreshCw className={`w-4 h-4 text-persian ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Barra de Pesquisa Global de Auditoria (Estudante por Nome/E-mail ou Anúncio por Título/ID) */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisa Global: Procurar Aluno por Nome/E-mail ou Material por Título/ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-persian focus:outline-none text-base sm:text-sm min-h-[48px] transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-3.5 p-1 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors min-h-[30px] min-w-[30px] flex items-center justify-center"
            title="Limpar pesquisa global"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Indicador de Filtro de Pesquisa Global no Admin */}
      {searchTerm.trim() && (
        <div className="flex items-center justify-between text-xs text-slate-600 px-3.5 py-2.5 bg-persian-light/60 rounded-2xl border border-persian/20 font-medium">
          <span>Pesquisa Global Ativa: "<strong className="text-slate-900">{searchTerm}</strong>"</span>
          <span className="font-extrabold text-persian">
            {activeTab === 'reports' && `${filteredReports.length} denúncia(s)`}
            {activeTab === 'listings' && `${filteredListings.length} material(ais)`}
            {activeTab === 'users' && `${filteredUsers.length} estudante(s)`}
            {activeTab === 'logs' && `${filteredLogs.length} registo(s) de log`}
          </span>
        </div>
      )}

      {/* Cartões de Estatísticas Rápidas de Saúde da Comunidade */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-persian" />
            <span className="text-[10px] font-bold px-2 py-0.5 bg-persian-light text-persian rounded-full">Comunidade</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total_users || 0}</p>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estudantes Registados</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">Mercado</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total_listings || 0}</p>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Materiais no Feed</p>
        </div>

        {/* Fila de Denúncias Pendentes (Com indicador de prioridade em Vermelho/Carrot) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500 text-white rounded-full animate-pulse">
              Crítico
            </span>
          </div>
          <p className="text-2xl font-black text-rose-600">{stats.pending_reports || pendingReports.length || 0}</p>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Denúncias Pendentes</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">Sucesso</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total_completed_sales || 0}</p>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Transações Concluídas</p>
        </div>
      </div>

      {/* Navegação por Abas do Painel de Administração */}
      <div className="flex space-x-2 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-none">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-3 font-extrabold text-xs rounded-t-xl transition-all flex items-center space-x-2 whitespace-nowrap min-h-[44px] ${
            activeTab === 'reports'
              ? 'bg-persian text-white border-b-2 border-carrot shadow-sm'
              : 'bg-platinum text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Flag className="w-4 h-4 text-carrot" />
          <span>Denúncias ({pendingReports.length})</span>
          {pendingReports.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block ml-1" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-3 font-extrabold text-xs rounded-t-xl transition-all flex items-center space-x-2 whitespace-nowrap min-h-[44px] ${
            activeTab === 'listings'
              ? 'bg-persian text-white border-b-2 border-carrot shadow-sm'
              : 'bg-platinum text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Moderação de Anúncios ({listings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 font-extrabold text-xs rounded-t-xl transition-all flex items-center space-x-2 whitespace-nowrap min-h-[44px] ${
            activeTab === 'users'
              ? 'bg-persian text-white border-b-2 border-carrot shadow-sm'
              : 'bg-platinum text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gestão de Utilizadores ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-3 font-extrabold text-xs rounded-t-xl transition-all flex items-center space-x-2 whitespace-nowrap min-h-[44px] ${
            activeTab === 'logs'
              ? 'bg-persian text-white border-b-2 border-carrot shadow-sm'
              : 'bg-platinum text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-400" />
          <span>Logs de Auditoria ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: FILA DE DENÚNCIAS PENDENTES (/admin/reports) */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-rose-500" /> Fila de Denúncias Pendentes
              </h2>
              <p className="text-xs text-slate-500">Itens e contas sinalizados pelos estudantes para verificação da moderação</p>
            </div>
            <span className="text-xs font-black px-3 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200">
              {reports.length} Registo(s)
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Sem denúncias pendentes de moderação!</p>
              <p className="text-xs text-slate-500">A comunidade UCM Pemba está em conformidade com as diretrizes de segurança.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <div key={report.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                        report.status === 'pending'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : report.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {report.status === 'pending' ? 'Pendente' : report.status === 'resolved' ? 'Resolvido' : 'Ignorado'}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-sm">
                        Motivo: <span className="text-rose-600">{report.reason}</span>
                      </h3>
                    </div>

                    {report.listing && (
                      <p className="text-xs font-bold text-slate-700">
                        Anúncio Denunciado: <span className="text-persian">{report.listing.title}</span> ({report.listing.price_mzn} MZN)
                      </p>
                    )}

                    <p className="text-xs text-slate-500">
                      <strong>Denunciante:</strong> {report.reporter?.full_name || 'Estudante UCM'} ({report.reporter?.email || 'N/D'})
                    </p>
                    {report.details && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        "{report.details}"
                      </p>
                    )}
                  </div>

                  {/* Ações de Moderação */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="px-3.5 py-2 bg-persian hover:bg-persian-hover text-white font-bold rounded-xl text-xs flex items-center transition-colors min-h-[44px]"
                    >
                      <Info className="w-4 h-4 mr-1.5" /> Analisar Caso
                    </button>

                    {report.listing_id && (
                      <>
                        <button
                          onClick={() => handleDeleteListing(report.listing_id)}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center transition-colors shadow-xs min-h-[44px]"
                          title="Apagar Anúncio Definitivamente"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" /> Apagar Item
                        </button>

                        <button
                          onClick={() => handleSuspendListing(report.listing_id)}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center transition-colors border border-rose-200 min-h-[44px]"
                        >
                          <EyeOff className="w-4 h-4 mr-1.5" /> Suspender
                        </button>
                      </>
                    )}

                    {report.status === 'pending' && (
                      <button
                        onClick={() => handleIgnoreReport(report.id)}
                        className="px-3.5 py-2 bg-platinum hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center transition-colors border border-slate-300/80 min-h-[44px]"
                      >
                        <Check className="w-4 h-4 mr-1 text-slate-500" /> Ignorar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MODERAÇÃO GLOBAL DE ANÚNCIOS (/admin/listings) */}
      {activeTab === 'listings' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-persian" /> Auditoria Geral de Materiais Publicados
            </h2>
            <span className="text-xs font-bold text-slate-500">Total: {listings.length} item(ns)</span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredListings.map((item) => (
              <div key={item.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-slate-900 text-sm">{item.title}</h3>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase ${
                      item.status === 'removed' || item.status === 'suspended'
                        ? 'bg-rose-100 text-rose-800'
                        : item.status === 'sold'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.status === 'removed' || item.status === 'suspended' ? 'Suspenso / Oculto' : item.status === 'sold' ? 'Vendido' : item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Preço: <strong>{item.price_mzn} MZN</strong> • Publicado por: <strong>{item.profiles?.full_name || 'Estudante'}</strong> ({item.profiles?.email || 'N/D'})
                  </p>
                  <p className="text-[11px] text-slate-400">ID do Anúncio: {item.id}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {/* Botão de Apagar Anúncio (Disponível sempre para o Administrador) */}
                  <button
                    onClick={() => handleDeleteListing(item.id)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center transition-all shadow-xs min-h-[44px]"
                    title="Apagar Anúncio Definitivamente do Sistema"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" /> Apagar
                  </button>

                  {/* Alternância: Ocultar / Suspender vs Reativar */}
                  {item.status !== 'removed' && item.status !== 'suspended' ? (
                    <button
                      onClick={() => handleSuspendListing(item.id)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center transition-colors border border-rose-200 min-h-[44px]"
                      title="Ocultar do Feed do Marketplace"
                    >
                      <EyeOff className="w-4 h-4 mr-1.5" /> Ocultar do Feed
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivateListing(item.id)}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold rounded-xl text-xs flex items-center transition-colors min-h-[44px]"
                      title="Reativar Anúncio no Feed"
                    >
                      <RotateCcw className="w-4 h-4 mr-1.5" /> Reativar
                    </button>
                  )}

                  <a
                    href={`/item/${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-platinum hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center min-h-[44px]"
                    title="Ver página pública do anúncio"
                  >
                    <ExternalLink className="w-4 h-4 mr-1 text-persian" /> Ver Item
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: GESTÃO DE UTILIZADORES & PROTEÇÃO CONTRA FRAUDE (/admin/users) */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-persian" /> Contas Institucionais Registadas
            </h2>
            <span className="text-xs font-bold text-slate-500">Comunidade UCM Pemba</span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredUsers.map((u) => (
              <div key={u.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-slate-900 text-sm">{u.full_name}</h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                      u.role === 'admin' ? 'bg-persian text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : 'Estudante'}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                      u.status === 'suspended' ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {u.status === 'suspended' ? 'Conta Suspensa' : 'Conta Ativa'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    E-mail: <strong>{u.email}</strong> • Curso: {u.course || 'FGTI'}
                  </p>
                  <p className="text-[11px] text-slate-400">ID de Utilizador: {u.id}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {/* Botão de Alternância de Cargo (Student <-> Admin) */}
                  <button
                    onClick={() => handleToggleRole(u)}
                    className="px-3.5 py-2 bg-persian-light text-persian hover:bg-persian hover:text-white font-extrabold rounded-xl text-xs flex items-center transition-colors min-h-[44px]"
                    title="Promover a Admin ou alterar cargo"
                  >
                    <ShieldCheck className="w-4 h-4 mr-1 text-carrot" />
                    <span>{u.role === 'admin' ? 'Tornar Estudante' : 'Tornar Admin'}</span>
                  </button>

                  {u.status === 'suspended' ? (
                    <button
                      onClick={() => handleReactivateUser(u.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center transition-colors min-h-[44px]"
                    >
                      <UserCheck className="w-4 h-4 mr-1.5" /> Reativar Conta
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSuspendUser(u.id)}
                      className="px-4 py-2 bg-rose-900/10 hover:bg-rose-900/20 text-rose-800 font-bold rounded-xl text-xs flex items-center transition-colors border border-rose-800/30 min-h-[44px]"
                    >
                      <UserX className="w-4 h-4 mr-1.5" /> Suspender Utilizador
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: LOGS DE AUDITORIA IMUTÁVEIS (/admin/logs) */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center">
                <Lock className="w-5 h-5 mr-2 text-amber-500" /> Registo Imutável de Decisões dos Moderadores (Audit Logs)
              </h2>
              <p className="text-xs text-slate-500">Histórico de ações disciplinares para prevenção de abuso de autoridade</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              Apenas Leitura
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-xs font-bold text-slate-400">
              Ainda não existem registos de auditoria efetuados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Data / Hora</th>
                    <th className="py-3 px-3">Moderador (Quem)</th>
                    <th className="py-3 px-3">Ação Efetuada</th>
                    <th className="py-3 px-3">Alvo / Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {new Date(log.created_at).toLocaleString('pt-PT')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {log.details?.admin_email || log.admin?.email || 'admin@ucm.ac.mz'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${
                          log.action === 'DELETE_LISTING'
                            ? 'bg-rose-700 text-white'
                            : log.action === 'SUSPEND_LISTING'
                            ? 'bg-rose-100 text-rose-800'
                            : log.action === 'SUSPEND_USER'
                            ? 'bg-rose-900 text-white'
                            : log.action === 'REACTIVATE_LISTING' || log.action === 'REACTIVATE_USER'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {JSON.stringify(log.details || { target_id: log.target_id })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE ANÁLISE DE DENÚNCIA DETALHADA */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center">
                <Flag className="w-5 h-5 mr-2 text-rose-500" /> Análise do Caso de Moderação
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                <p className="font-bold text-rose-800 text-sm mb-1">Motivo da Denúncia: {selectedReport.reason}</p>
                <p className="text-slate-600">"{selectedReport.details || 'Sem comentários adicionais fornecidos pelo estudante.'}"</p>
              </div>

              {selectedReport.listing && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900">Anúncio Alvo: {selectedReport.listing.title}</p>
                  <p className="text-slate-500">Preço: {selectedReport.listing.price_mzn} MZN • ID: {selectedReport.listing.id}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block uppercase font-bold">Denunciante</span>
                  <span className="font-bold text-slate-800">{selectedReport.reporter?.full_name}</span>
                  <span className="block text-slate-500">{selectedReport.reporter?.email}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block uppercase font-bold">Autor do Anúncio</span>
                  <span className="font-bold text-slate-800">{selectedReport.reported_user?.full_name || 'Estudante'}</span>
                  <span className="block text-slate-500">{selectedReport.reported_user?.email || 'N/D'}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => handleIgnoreReport(selectedReport.id)}
                className="px-4 py-2.5 bg-platinum hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs min-h-[44px]"
              >
                Ignorar (Alarme Falso)
              </button>

              {selectedReport.listing_id && (
                <>
                  <button
                    onClick={() => handleSuspendListing(selectedReport.listing_id)}
                    className="px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-xs min-h-[44px] flex items-center"
                  >
                    <EyeOff className="w-4 h-4 mr-1.5" /> Suspender
                  </button>

                  <button
                    onClick={() => handleDeleteListing(selectedReport.listing_id)}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 min-h-[44px] flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" /> Apagar Definitivamente
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

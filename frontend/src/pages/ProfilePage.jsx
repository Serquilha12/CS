import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchApi } from '../services/api';
import { User, Mail, GraduationCap, MapPin, Phone, LogOut, Trash2, Tag, Edit3, Save, TrendingUp, PiggyBank, CheckCircle2, Clock, Pencil } from 'lucide-react';
import { UCM_COURSES } from '../constants';

export function ProfilePage() {
  const { user, logout } = useContext(AuthContext);
  const { showToast } = useToast();
  const [myListings, setMyListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState({
    totalVolumeMovedMzn: 0,
    totalMoneySavedMzn: 0,
    completedSalesCount: 0,
    completedPurchasesCount: 0,
    totalCompletedTransactions: 0
  });

  const [formData, setFormData] = useState({
    full_name: user?.full_name || 'Estudante UCM',
    course: user?.course || 'Licenciatura em Tecnologias da Informação',
    campus: user?.campus || 'Campus de Pemba',
    phone_number: user?.phone_number || ''
  });

  useEffect(() => {
    loadMyListings();
    loadUserStats();
  }, []);

  async function loadMyListings() {
    try {
      setLoadingListings(true);
      const res = await fetchApi('/listings/my-listings');
      if (res.success) {
        setMyListings(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingListings(false);
    }
  }

  async function loadUserStats() {
    try {
      const res = await fetchApi('/auth/stats');
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (e) {
      console.error('Erro ao carregar estatísticas do utilizador:', e);
    }
  }

  const MOZ_PHONE_REGEX = /^(\+?258\s?)?8[2-7]\d{7}$/;

  async function handleSaveProfile(e) {
    e.preventDefault();

    const cleanName = formData.full_name.trim();
    const nameWords = cleanName.split(/\s+/).filter(Boolean);

    if (nameWords.length < 2 || !/^[a-zA-ZÀ-ÿ\s'-]+$/.test(cleanName)) {
      showToast('Por favor, introduza o seu nome completo (pelo menos Nome e Apelido).', 'warning');
      return;
    }

    if (formData.phone_number) {
      const sanitizedPhone = formData.phone_number.replace(/\s+/g, '');
      if (!MOZ_PHONE_REGEX.test(sanitizedPhone)) {
        showToast('Número de telefone inválido. Utilize formato moçambicano (+258 82/83/84/85/86/87...).', 'warning');
        return;
      }
    }

    try {
      const res = await fetchApi('/auth/profile', {
        method: 'PUT',
        body: {
          ...formData,
          full_name: cleanName.replace(/\s+/g, ' '),
          phone_number: formData.phone_number?.trim() || null
        }
      });
      if (res.success) {
        showToast('Perfil atualizado com sucesso!', 'success');
        setIsEditing(false);
      }
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar perfil.', 'error');
    }
  }

  async function handleDeleteListing(listingId) {
    if (!window.confirm('Tem certeza de que pretende apagar este anúncio?')) return;

    try {
      const res = await fetchApi(`/listings/${listingId}`, { method: 'DELETE' });
      if (res.success) {
        showToast('Anúncio removido com sucesso.', 'info');
        setMyListings((prev) => prev.filter((item) => item.id !== listingId));
      }
    } catch (err) {
      showToast(err.message || 'Erro ao apagar anúncio.', 'error');
    }
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-slate-500">
        Por favor, inicie sessão para visualizar o seu perfil.
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6 pb-24">
      {/* Cartão de Perfil do Estudante */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative space-y-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-ucm-emerald text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800">{user?.full_name || 'Estudante UCM'}</h1>
            <p className="text-xs text-slate-500 flex items-center">
              <Mail className="w-3.5 h-3.5 mr-1 text-ucm-emerald" /> {user?.email}
            </p>
            <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-50 text-ucm-darkEmerald text-[11px] font-bold rounded-full border border-emerald-200">
              Estudante Verificado UCM
            </span>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Editar Perfil"
          >
            <Edit3 className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Formulário de Edição */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                placeholder="Ex: Ancha Jussa"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm min-h-[44px]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Nome e apelido para identificação institucional</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Curso</label>
              <select
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm min-h-[44px]"
              >
                {UCM_COURSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Telemóvel (Contacto em Moçambique)</label>
              <input
                type="tel"
                placeholder="+258 84 123 4567"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm min-h-[44px]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Ex: +258 84 123 4567 ou 841234567 (Tchumene/Vodacom/Tmcel/Movitel)</span>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-ucm-emerald text-white font-semibold rounded-xl text-sm shadow-md flex items-center justify-center min-h-[44px]"
            >
              <Save className="w-4 h-4 mr-2" /> Guardar Alterações
            </button>
          </form>
        ) : (
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-2">
            <p className="flex items-center">
              <GraduationCap className="w-4 h-4 mr-2 text-slate-400" />
              <strong>Curso:</strong> {user?.course || 'Tecnologias da Informação'}
            </p>
            <p className="flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-slate-400" />
              <strong>Campus:</strong> {user?.campus || 'Campus de Pemba'}
            </p>
            {user?.phone_number && (
              <p className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-slate-400" />
                <strong>Contacto:</strong> {user.phone_number}
              </p>
            )}
          </div>
        )}

        {/* Botão de Terminar Sessão */}
        <button
          onClick={logout}
          className="w-full py-3 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold rounded-2xl text-xs flex items-center justify-center transition-colors border border-rose-200 min-h-[44px]"
        >
          <LogOut className="w-4 h-4 mr-2" /> Terminar Sessão
        </button>
      </div>

      {/* Cartões Estatísticos do Painel Pessoal */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Estatísticas do Painel Pessoal</h2>

        <div className="grid grid-cols-3 gap-3">
          {/* Card 1: Volume Movimentado */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between space-y-2">
            <div className="p-2 bg-emerald-50 text-ucm-emerald rounded-xl w-fit">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Volume Movimentado</p>
              <p className="text-base font-extrabold text-slate-800">{stats.totalVolumeMovedMzn} <span className="text-xs font-bold text-ucm-emerald">MZN</span></p>
            </div>
          </div>

          {/* Card 2: Dinheiro Poupado */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between space-y-2">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl w-fit">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Dinheiro Poupado</p>
              <p className="text-base font-extrabold text-slate-800">{stats.totalMoneySavedMzn} <span className="text-xs font-bold text-sky-600">MZN</span></p>
            </div>
          </div>

          {/* Card 3: Negócios Concluídos */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between space-y-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl w-fit">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Concluídos</p>
              <p className="text-base font-extrabold text-slate-800">{stats.totalCompletedTransactions} <span className="text-xs font-semibold text-slate-400">itens</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Secção Meus Anúncios Publicados */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Meus Anúncios Publicados</h2>

        {loadingListings ? (
          <div className="p-4 text-center text-slate-400 text-xs">A carregar anúncios...</div>
        ) : myListings.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 text-xs text-slate-500">
            Ainda não publicou nenhum anúncio no mercado.
          </div>
        ) : (
          <div className="space-y-3">
            {myListings.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={item.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'}
                    alt={item.title}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{item.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        item.status === 'negotiating'
                          ? 'bg-amber-100 text-amber-800'
                          : item.status === 'reserved'
                          ? 'bg-indigo-100 text-indigo-800'
                          : item.status === 'sold'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.status === 'negotiating' ? 'Em Negociação' : item.status === 'reserved' ? 'Reservado' : item.status === 'sold' ? 'Vendido' : 'Ativo'}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-ucm-emerald">
                      {item.price_mzn} MZN
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDeleteListing(item.id)}
                    className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Apagar Anúncio"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

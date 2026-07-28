import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchApi } from '../services/api';
import { User, Mail, GraduationCap, MapPin, Phone, LogOut, Trash2, Tag, Edit3, Save } from 'lucide-react';
import { UCM_COURSES } from '../constants';

export function ProfilePage() {
  const { user, logout } = useContext(AuthContext);
  const { showToast } = useToast();
  const [myListings, setMyListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    full_name: user?.full_name || 'Estudante UCM',
    course: user?.course || 'Licenciatura em Tecnologias da Informação',
    campus: user?.campus || 'Campus de Pemba',
    phone_number: user?.phone_number || ''
  });

  useEffect(() => {
    loadMyListings();
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

  async function handleSaveProfile(e) {
    e.preventDefault();
    try {
      const res = await fetchApi('/auth/profile', {
        method: 'PUT',
        body: formData
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
    <div className="max-w-xl mx-auto p-4 space-y-6">
      {/* Cartão de Perfil do Estudante */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative space-y-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-ucm-emerald text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-md">
            {user.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800">{user.full_name}</h1>
            <p className="text-xs text-slate-500 flex items-center">
              <Mail className="w-3.5 h-3.5 mr-1 text-ucm-emerald" /> {user.email}
            </p>
            <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-50 text-ucm-darkEmerald text-[11px] font-bold rounded-full border border-emerald-200">
              Estudante Verificado UCM
            </span>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
            title="Editar Perfil"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário de Edição */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Curso</label>
              <select
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm"
              >
                {UCM_COURSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Telemóvel (Contacto)</label>
              <input
                type="tel"
                placeholder="+258 84 123 4567"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-ucm-emerald text-white font-semibold rounded-xl text-sm shadow-md flex items-center justify-center"
            >
              <Save className="w-4 h-4 mr-2" /> Guardar Alterações
            </button>
          </form>
        ) : (
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-2">
            <p className="flex items-center">
              <GraduationCap className="w-4 h-4 mr-2 text-slate-400" />
              <strong>Curso:</strong> {user.course || 'Tecnologias da Informação'}
            </p>
            <p className="flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-slate-400" />
              <strong>Campus:</strong> {user.campus || 'Campus de Pemba'}
            </p>
            {user.phone_number && (
              <p className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-slate-400" />
                <strong>Contacto:</strong> {user.phone_number}
              </p>
            )}
          </div>
        )}

        <button
          onClick={logout}
          className="w-full py-3 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold rounded-2xl text-xs flex items-center justify-center transition-colors border border-rose-200"
        >
          <LogOut className="w-4 h-4 mr-2" /> Terminar Sessão
        </button>
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
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{item.title}</h3>
                    <span className="text-xs font-extrabold text-ucm-emerald">
                      {item.price_mzn} MZN
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteListing(item.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Apagar Anúncio"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

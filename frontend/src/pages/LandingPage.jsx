import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, KeyRound, Repeat, BookOpen, LogIn, UserPlus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UCM_COURSES } from '../constants';
import { fetchApi } from '../services/api';

export function LandingPage() {
  const { login, register } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isLoginModal, setIsLoginModal] = useState(false);
  const [isRegisterModal, setIsRegisterModal] = useState(false);
  const [isForgotModal, setIsForgotModal] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [regData, setRegData] = useState({
    email: '',
    password: '',
    full_name: '',
    course: UCM_COURSES[0]
  });
  const [forgotEmail, setForgotEmail] = useState('');

  async function handleLoginSubmit(e) {
    e.preventDefault();

    if (!loginData.email.toLowerCase().endsWith('@ucm.ac.mz')) {
      showToast('O e-mail deve ser obrigatoriamente um e-mail institucional da UCM (@ucm.ac.mz).', 'warning');
      return;
    }

    try {
      const user = await login(loginData.email, loginData.password);
      showToast('Sessão iniciada com sucesso!', 'success');
      if (user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/marketplace');
      }
    } catch (err) {
      showToast(err.message || 'Falha ao iniciar sessão. Verifique os seus dados.', 'error');
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();

    if (!regData.email.toLowerCase().endsWith('@ucm.ac.mz')) {
      showToast('Apenas e-mails com a extensão @ucm.ac.mz podem criar conta.', 'warning');
      return;
    }

    try {
      await register(regData);
      showToast('Conta UCM criada com sucesso! Bem-vindo à CampusStore.', 'success');
      navigate('/marketplace');
    } catch (err) {
      showToast(err.message || 'Erro ao criar conta. Tente novamente.', 'error');
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    try {
      const res = await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: { email: forgotEmail }
      });
      if (res.success) {
        showToast('Instruções enviadas para o seu e-mail institucional.', 'success');
        setIsForgotModal(false);
      }
    } catch (err) {
      showToast(err.message || 'Erro ao solicitar redefinição.', 'error');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6">
      {/* Header Minimalista com Ícone de Economia Circular / Livros */}
      <header className="flex items-center justify-between py-4 max-w-md mx-auto w-full">
        <div className="flex items-center space-x-2.5">
          <div className="w-11 h-11 bg-slate-900 text-amber-400 rounded-2xl flex items-center justify-center font-bold text-xl shadow-md border border-slate-800">
            <Repeat className="w-6 h-6 text-ucm-emerald" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-xl text-slate-800 tracking-tight">CampusStore</span>
              <BookOpen className="w-4 h-4 text-ucm-emerald" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Economia Circular Académica</p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 bg-emerald-100 text-ucm-darkEmerald rounded-full border border-emerald-200">
          UCM Pemba
        </span>
      </header>

      {/* Proposta de Valor Central */}
      <main className="max-w-md mx-auto text-center my-auto py-8 space-y-6">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-ucm-darkEmerald rounded-full text-xs font-bold border border-emerald-200 shadow-xs">
          <GraduationCap className="w-4 h-4 text-ucm-emerald" />
          <span>Exclusivo para a Comunidade UCM</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
          Poupe até <span className="text-ucm-emerald">40%</span> no seu material académico
        </h1>

        <p className="text-slate-600 text-sm leading-relaxed max-w-sm mx-auto">
          O marketplace digital interno para compra, venda, troca, doação e empréstimo de materiais entre estudantes da UCM Pemba.
        </p>

        {/* APENAS 2 BOTÕES PRINCIPAIS DE ENTRADA (Mínimo 44px touch targets) */}
        <div className="pt-4 space-y-3">
          {/* Botão 1: Registar / Cadastro em Destaque (Azul Escuro UCM) */}
          <button
            onClick={() => setIsRegisterModal(true)}
            className="w-full min-h-[48px] py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg shadow-slate-900/20 transition-all text-base flex items-center justify-center"
          >
            <UserPlus className="w-5 h-5 mr-2 text-ucm-emerald" />
            Criar Conta com E-mail UCM
          </button>

          {/* Botão 2: Login de Contorno Elegante para Estudantes Registados */}
          <button
            onClick={() => setIsLoginModal(true)}
            className="w-full min-h-[48px] py-3.5 px-6 bg-white border-2 border-slate-200 hover:border-ucm-emerald text-slate-700 hover:text-ucm-darkEmerald font-bold rounded-2xl transition-all text-base flex items-center justify-center shadow-xs"
          >
            <LogIn className="w-5 h-5 mr-2 text-slate-500" />
            Já tenho Conta — Entrar
          </button>
        </div>
      </main>

      {/* Footer Minimalista */}
      <footer className="text-center py-4 border-t border-slate-200 text-xs text-slate-400">
        © 2026 CampusStore — Universidade Católica de Moçambique (Pemba).
      </footer>

      {/* Modal de Login */}
      {isLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
              <LogIn className="w-6 h-6 mr-2 text-ucm-emerald" /> Entrar na Conta
            </h2>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">E-mail Institucional (@ucm.ac.mz)</label>
                <input
                  type="email"
                  required
                  placeholder="estudante@ucm.ac.mz"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Palavra-passe</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginModal(false);
                    setIsForgotModal(true);
                  }}
                  className="text-xs font-semibold text-ucm-emerald hover:underline py-1"
                >
                  Esqueci-me da palavra-passe
                </button>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLoginModal(false)}
                  className="w-1/2 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl text-sm min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 bg-ucm-emerald text-white font-semibold rounded-xl text-sm shadow-md min-h-[44px]"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Registo */}
      {isRegisterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
              <UserPlus className="w-6 h-6 mr-2 text-ucm-emerald" /> Criar Conta UCM
            </h2>
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ancha Jussa"
                  value={regData.full_name}
                  onChange={(e) => setRegData({ ...regData, full_name: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Curso UCM</label>
                <select
                  value={regData.course}
                  onChange={(e) => setRegData({ ...regData, course: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                >
                  {UCM_COURSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">E-mail Institucional (@ucm.ac.mz)</label>
                <input
                  type="email"
                  required
                  placeholder="estudante@ucm.ac.mz"
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  className={`w-full p-3 border rounded-xl text-sm min-h-[44px] ${
                    regData.email.length > 0 && !regData.email.toLowerCase().endsWith('@ucm.ac.mz')
                      ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-ucm-emerald'
                  }`}
                />
                {regData.email.length > 0 && !regData.email.toLowerCase().endsWith('@ucm.ac.mz') && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600 flex items-center">
                    ❌ Acesso exclusivo para contas institucionais da UCM (@ucm.ac.mz)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Palavra-passe (min 6 caracteres)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModal(false)}
                  className="w-1/2 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl text-sm min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!regData.email.toLowerCase().endsWith('@ucm.ac.mz') || regData.password.length < 6 || !regData.full_name.trim()}
                  className={`w-1/2 py-3 font-bold rounded-xl text-sm min-h-[44px] transition-all ${
                    regData.email.toLowerCase().endsWith('@ucm.ac.mz') && regData.password.length >= 6 && regData.full_name.trim()
                      ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Registar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Esqueci-me da Palavra-passe */}
      {isForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center space-x-2 mb-4">
              <KeyRound className="w-6 h-6 text-ucm-emerald" />
              <h2 className="text-xl font-bold text-slate-800">Recuperar Senha</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Insira o seu e-mail institucional. Enviaremos um link direto para redefinir a palavra-passe.
            </p>
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">E-mail @ucm.ac.mz</label>
                <input
                  type="email"
                  required
                  placeholder="estudante@ucm.ac.mz"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModal(false)}
                  className="w-1/2 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl text-sm min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 bg-ucm-emerald text-white font-semibold rounded-xl text-sm shadow-md min-h-[44px]"
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

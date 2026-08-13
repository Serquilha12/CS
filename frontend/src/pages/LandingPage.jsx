import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, KeyRound, Repeat, BookOpen, LogIn, UserPlus, 
  Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, X, ShieldCheck
} from 'lucide-react';
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

  // Estados de Palavra-passe Visível
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Estado de Carregamento nos Formulários
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [regData, setRegData] = useState({
    email: '',
    password: '',
    full_name: '',
    course: UCM_COURSES[0]
  });
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotSuccess, setIsForgotSuccess] = useState(false);

  // Validação em Tempo Real de E-mail UCM com RegEx estrito
  const UCM_EMAIL_REGEX = /^[\w-\.]+@ucm\.ac\.mz$/i;
  const isLoginEmailValid = UCM_EMAIL_REGEX.test(loginData.email.trim());
  const isRegEmailValid = UCM_EMAIL_REGEX.test(regData.email.trim());

  async function handleLoginSubmit(e) {
    e.preventDefault();

    if (!isLoginEmailValid) {
      showToast('O e-mail deve ser obrigatoriamente um e-mail institucional da UCM (@ucm.ac.mz).', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(loginData.email.toLowerCase().trim(), loginData.password);
      showToast('Sessão iniciada com sucesso!', 'success');
      if (user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/marketplace');
      }
    } catch (err) {
      showToast(err.message || 'Falha ao iniciar sessão. Verifique os seus dados.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();

    if (!isRegEmailValid) {
      showToast('Apenas e-mails com a extensão @ucm.ac.mz podem criar conta.', 'warning');
      return;
    }

    if (regData.password.length < 6) {
      showToast('A palavra-passe deve ter pelo menos 6 caracteres.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        ...regData,
        email: regData.email.toLowerCase().trim()
      });
      showToast('Conta UCM criada com sucesso! Bem-vindo à CampusStore.', 'success');
      navigate('/marketplace');
    } catch (err) {
      showToast(err.message || 'Erro ao criar conta. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    if (!forgotEmail.toLowerCase().trim().endsWith('@ucm.ac.mz')) {
      showToast('Insira um e-mail institucional válido (@ucm.ac.mz).', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: { email: forgotEmail.toLowerCase().trim() }
      });
      if (res.success) {
        showToast('Instruções enviadas para o seu e-mail institucional.', 'success');
        setIsForgotSuccess(true);
      }
    } catch (err) {
      showToast(err.message || 'Erro ao solicitar redefinição.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6">
      {/* Header Minimalista */}
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

        {/* Botões Principais de Entrada */}
        <div className="pt-4 space-y-3">
          <button
            onClick={() => {
              setIsRegisterModal(true);
              setIsLoginModal(false);
            }}
            className="w-full min-h-[48px] py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg shadow-slate-900/20 transition-all text-base flex items-center justify-center cursor-pointer"
          >
            <UserPlus className="w-5 h-5 mr-2 text-ucm-emerald" />
            Criar Conta com E-mail UCM
          </button>

          <button
            onClick={() => {
              setIsLoginModal(true);
              setIsRegisterModal(false);
            }}
            className="w-full min-h-[48px] py-3.5 px-6 bg-white border-2 border-slate-200 hover:border-ucm-emerald text-slate-700 hover:text-ucm-darkEmerald font-bold rounded-2xl transition-all text-base flex items-center justify-center shadow-xs cursor-pointer"
          >
            <LogIn className="w-5 h-5 mr-2 text-slate-500" />
            Já tenho Conta — Entrar
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-slate-200 text-xs text-slate-400">
        © 2026 CampusStore — Universidade Católica de Moçambique (Pemba).
      </footer>

      {/* MODAL DE LOGIN PROFISSIONAL */}
      {isLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in duration-200">
            {/* Botão Fechar */}
            <button
              onClick={() => setIsLoginModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho */}
            <div className="mb-6">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
                <LogIn className="w-6 h-6 text-ucm-emerald" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Entrar na Conta</h2>
              <p className="text-xs text-slate-500 mt-1">Aceda ao marketplace académico seguro da UCM Pemba.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  E-mail Institucional (@ucm.ac.mz)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="estudante@ucm.ac.mz"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className={`w-full p-3.5 pr-10 border rounded-xl text-base sm:text-sm transition-all focus:outline-none min-h-[46px] ${
                      loginData.email.length > 0
                        ? isLoginEmailValid
                          ? 'border-emerald-500 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                          : 'border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400'
                        : 'border-slate-300 focus:ring-2 focus:ring-ucm-emerald'
                    }`}
                  />
                  {loginData.email.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isLoginEmailValid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                      )}
                    </div>
                  )}
                </div>
                {loginData.email.length > 0 && !isLoginEmailValid && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600">
                    O e-mail deve terminar obrigatoriamente com @ucm.ac.mz
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Palavra-passe</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginModal(false);
                      setIsForgotModal(true);
                    }}
                    className="text-xs font-bold text-ucm-emerald hover:underline"
                  >
                    Esqueceu-se?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full p-3.5 pr-11 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[46px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isLoginEmailValid || !loginData.password}
                className={`w-full py-3.5 px-4 font-bold rounded-xl text-sm min-h-[48px] shadow-md transition-all flex items-center justify-center mt-2 cursor-pointer ${
                  isSubmitting || !isLoginEmailValid || !loginData.password
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-ucm-emerald hover:bg-ucm-darkEmerald text-white'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    A autenticar...
                  </>
                ) : (
                  'Entrar na Conta'
                )}
              </button>

              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Ainda não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginModal(false);
                      setIsRegisterModal(true);
                    }}
                    className="font-bold text-slate-900 hover:text-ucm-emerald underline ml-1"
                  >
                    Criar Conta UCM
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE REGISTO PROFISSIONAL */}
      {isRegisterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsRegisterModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <div className="w-12 h-12 bg-slate-900 text-ucm-emerald rounded-2xl flex items-center justify-center mb-3">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Criar Conta UCM</h2>
              <p className="text-xs text-slate-500 mt-1">Exclusivo para estudantes e docentes com e-mail institucional.</p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Ex: Ancha Jussa"
                  value={regData.full_name}
                  onChange={(e) => setRegData({ ...regData, full_name: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Curso UCM</label>
                <select
                  value={regData.course}
                  onChange={(e) => setRegData({ ...regData, course: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[44px] bg-white"
                >
                  {UCM_COURSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">E-mail Institucional (@ucm.ac.mz)</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="estudante@ucm.ac.mz"
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    className={`w-full p-3 pr-10 border rounded-xl text-base sm:text-sm focus:outline-none min-h-[44px] ${
                      regData.email.length > 0
                        ? isRegEmailValid
                          ? 'border-emerald-500 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                          : 'border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400'
                        : 'border-slate-300 focus:ring-2 focus:ring-ucm-emerald'
                    }`}
                  />
                  {regData.email.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isRegEmailValid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                      )}
                    </div>
                  )}
                </div>
                {regData.email.length > 0 && !isRegEmailValid && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600 flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                    Apenas e-mails com @ucm.ac.mz são permitidos
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Palavra-passe (min 6 caracteres)</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    className="w-full p-3 pr-11 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[46px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {regData.password.length > 0 && regData.password.length < 6 && (
                  <p className="mt-1 text-[11px] font-medium text-amber-600">
                    A palavra-passe deve ter pelo menos 6 caracteres.
                  </p>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Proteção de dados: O seu e-mail institucional é verificado para garantir transações 100% seguras no campus.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isRegEmailValid || regData.password.length < 6 || !regData.full_name.trim()}
                className={`w-full py-3.5 px-4 font-bold rounded-xl text-sm min-h-[48px] shadow-md transition-all flex items-center justify-center cursor-pointer ${
                  isSubmitting || !isRegEmailValid || regData.password.length < 6 || !regData.full_name.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2 text-ucm-emerald" />
                    A criar conta...
                  </>
                ) : (
                  'Registar Conta UCM'
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500">
                  Já possui conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterModal(false);
                      setIsLoginModal(true);
                    }}
                    className="font-bold text-ucm-emerald hover:underline ml-1"
                  >
                    Iniciar Sessão
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RECUPERAÇÃO DE PALAVRA-PASSE */}
      {isForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setIsForgotModal(false);
                setIsForgotSuccess(false);
              }}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {isForgotSuccess ? (
              <div className="text-center py-3">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Instruções Enviadas!</h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Enviámos um link seguro de reposição para{' '}
                  <span className="font-bold text-slate-900">{forgotEmail}</span>.
                </p>

                <div className="my-4 p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-left text-xs text-amber-900 leading-relaxed flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Dica de Segurança UCM:</strong> Verifique a caixa de entrada do seu e-mail da universidade. Se não encontrar a mensagem em alguns instantes, verifique também a pasta de <strong>Spam / Lixo Eletrónico</strong>.</span>
                </div>


                <button
                  type="button"
                  onClick={() => {
                    setIsForgotModal(false);
                    setIsForgotSuccess(false);
                    setIsLoginModal(true);
                  }}
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm min-h-[46px] shadow-md transition-all cursor-pointer"
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-3">
                    <KeyRound className="w-6 h-6 text-amber-600" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Recuperar Palavra-passe</h2>
                  <p className="text-xs text-slate-500 mt-1">Insira o e-mail institucional registado para receber o link de reposição.</p>
                </div>

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">E-mail @ucm.ac.mz</label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="estudante@ucm.ac.mz"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full p-3.5 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[46px]"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotModal(false);
                        setIsLoginModal(true);
                      }}
                      className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm min-h-[46px] transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !forgotEmail.toLowerCase().trim().endsWith('@ucm.ac.mz')}
                      className={`w-1/2 py-3 font-bold rounded-xl text-sm min-h-[46px] shadow-md transition-all flex items-center justify-center ${
                        isSubmitting || !forgotEmail.toLowerCase().trim().endsWith('@ucm.ac.mz')
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-ucm-emerald hover:bg-ucm-darkEmerald text-white'
                      }`}
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Link'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


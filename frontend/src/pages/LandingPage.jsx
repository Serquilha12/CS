import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, KeyRound, Repeat, BookOpen, LogIn, UserPlus, 
  Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, X, ShieldCheck,
  MessageSquare, Sparkles, ArrowRight, Check, HeartHandshake, CheckCheck, Calculator
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-3 sm:p-6 lg:p-8 relative overflow-x-hidden selection:bg-ucm-emerald selection:text-white">
      
      {/* 1. PROFUNDIDADE & MATERIAIS: Mesh Gradients Suaves nos Cantos Superiores */}
      <div 
        className="absolute -top-32 -left-32 w-72 sm:w-[520px] h-72 sm:h-[520px] bg-gradient-to-br from-sky-200/50 via-blue-200/30 to-transparent rounded-full blur-3xl pointer-events-none -z-10" 
        aria-hidden="true" 
      />
      <div 
        className="absolute -top-24 -right-24 w-72 sm:w-[480px] h-72 sm:h-[480px] bg-gradient-to-bl from-teal-200/40 via-emerald-200/30 to-transparent rounded-full blur-3xl pointer-events-none -z-10" 
        aria-hidden="true" 
      />
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] sm:w-[600px] h-[500px] sm:h-[600px] bg-gradient-to-tr from-sky-100/30 via-indigo-50/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" 
        aria-hidden="true" 
      />

      {/* 1. CABEÇALHO PREMIUM: Flutuante com Glassmorphism, Logo Oficial e Ações Rápidas */}
      <header className="flex items-center justify-between py-2.5 sm:py-3 px-4 sm:px-6 max-w-4xl mx-auto w-full bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/5 rounded-2xl sm:rounded-3xl sticky top-3 sm:top-4 z-40 transition-all duration-300">
        
        {/* Identidade / Marca com Logo Oficial */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="h-9 sm:h-10 px-2 sm:px-2.5 bg-slate-900/5 border border-slate-900/5 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 hover:scale-105 transition-transform duration-200">
            <img 
              src="/logo.png" 
              alt="CampusStore" 
              className="h-5 sm:h-6 w-auto object-contain" 
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight truncate">
                Campus<span className="text-ucm-emerald">Store</span>
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Economia Circular
            </p>
          </div>
        </div>

        {/* Lado Direito: Link Cadastrar */}
        <div className="flex items-center shrink-0 ml-2">
          <button
            onClick={() => {
              setIsRegisterModal(true);
              setIsLoginModal(false);
            }}
            className="text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            Cadastrar
          </button>
        </div>
      </header>

      {/* 2. TIPOGRAFIA DE ALTO CALIBRE: Hero Section Responsiva */}
      <main className="max-w-4xl mx-auto text-center my-auto py-6 sm:py-12 px-1 sm:px-2 flex flex-col items-center w-full">
        
        {/* Badge Exclusivo */}
        <div className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 bg-white/80 backdrop-blur-md text-ucm-darkEmerald rounded-full text-[11px] sm:text-xs font-bold border border-emerald-200/80 shadow-xs mb-4 sm:mb-5 max-w-full truncate">
          <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ucm-emerald shrink-0" />
          <span className="truncate">Exclusivo para a Comunidade Universitária</span>
        </div>

        {/* Título de Alto Impacto */}
        <h1 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-snug sm:leading-tight max-w-2xl mx-auto">
          Poupe no seu <span className="bg-gradient-to-r from-ucm-emerald via-blue-600 to-indigo-600 bg-clip-text text-transparent">material académico</span>
        </h1>

        {/* Subtítulo Equilibrado */}
        <p className="text-slate-600 text-xs sm:text-base leading-relaxed max-w-lg mx-auto mt-3 sm:mt-4 font-normal px-2 sm:px-0">
          O marketplace interno e seguro para compra, venda, troca e doação de manuais, calculadoras e diversos materiais didaticos entre estudantes.
        </p>

        {/* 3. MICRO-INTERAÇÕES: Botão Único de Entrar com Efeito Squishy */}
        <div className="pt-5 sm:pt-6 w-full max-w-xs flex justify-center">
          <button
            onClick={() => {
              setIsLoginModal(true);
              setIsRegisterModal(false);
            }}
            className="w-full min-h-[48px] py-3.5 px-6 bg-slate-900 hover:bg-slate-800 active:scale-[0.97] text-white font-bold rounded-2xl shadow-lg shadow-slate-900/15 transition-all duration-200 text-sm sm:text-base flex items-center justify-center cursor-pointer group"
          >
            <LogIn className="w-5 h-5 mr-2 text-ucm-emerald group-hover:scale-110 transition-transform" />
            <span>Entrar na Conta</span>
          </button>
        </div>

        {/* 4. LAYOUT BENTO BOX: Totalmente Responsivo & Sem Emojis */}
        <section className="w-full mt-10 sm:mt-14 text-left">
          <div className="text-center mb-5 sm:mb-6">
            <span className="text-[11px] sm:text-xs font-bold text-ucm-emerald tracking-wider uppercase">Vantagens Exclusivas</span>
            <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">Concebido para a realidade do Campus</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            
            {/* Cartão 1 (Bento Largo - Chat Integrado & Mockup Flutuante) */}
            <div className="md:col-span-2 bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl p-5 sm:p-7 ring-1 ring-slate-900/5 shadow-bento hover:shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-ucm-emerald rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-1 bg-blue-50 text-ucm-emerald rounded-full border border-blue-100">
                    Negociação Instantânea
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Chat Interno em Tempo Real</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md leading-relaxed">
                  Converse diretamente com colegas de turma, combine a entrega física no campus e negocie com privacidade sem expor o seu contacto pessoal.
                </p>
              </div>

              {/* Mockup com 2 Bolhas Flutuantes (Sem Emojis) */}
              <div className="mt-4 sm:mt-5 pt-3 border-t border-slate-100/80 space-y-2.5">
                {/* Bolha Comprador */}
                <div className="flex items-end space-x-2 animate-float-slow">
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                    AJ
                  </div>
                  <div className="bg-slate-100/90 text-slate-800 text-xs px-3 sm:px-3.5 py-2 rounded-2xl rounded-bl-xs max-w-[85%] sm:max-w-xs shadow-xs break-words">
                    <p className="text-[10px] font-semibold text-slate-500 mb-0.5">Colega de Direito</p>
                    Olá! Ainda tens o livro de Direito Constitucional da 2ª Edição?
                  </div>
                </div>

                {/* Bolha Vendedor */}
                <div className="flex items-end justify-end space-x-2 animate-float-slower">
                  <div className="bg-ucm-emerald text-white text-xs px-3 sm:px-3.5 py-2 rounded-2xl rounded-br-xs max-w-[85%] sm:max-w-xs shadow-md shadow-ucm-emerald/20 break-words">
                    Sim! Posso entregar amanhã às 10h em frente à Biblioteca Central.
                    <span className="inline-flex items-center justify-end w-full text-[9px] text-blue-200 text-right mt-0.5 space-x-0.5">
                      <span>10:15</span>
                      <CheckCheck className="w-3 h-3 text-blue-200 inline ml-1 shrink-0" />
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-ucm-darkEmerald text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                    Tu
                  </div>
                </div>
              </div>
            </div>

            {/* Cartão 2 (Bento Quadrado - Segurança Institucional) */}
            <div className="md:col-span-1 bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl p-5 sm:p-7 ring-1 ring-slate-900/5 shadow-bento hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">100% Universitário</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  Acesso estritamente restrito a estudantes e docentes com e-mail institucional <span className="font-semibold text-slate-700">@ucm.ac.mz</span>. Zero perfis falsos.
                </p>
              </div>

              <div className="mt-4 sm:mt-5 p-2.5 sm:p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl sm:rounded-2xl flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-900">Verificação Automática</span>
              </div>
            </div>

            {/* Cartão 3 (Bento Quadrado - Economia Circular) */}
            <div className="md:col-span-1 bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl p-5 sm:p-7 ring-1 ring-slate-900/5 shadow-bento hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-50 text-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3">
                  <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Economia Circular</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  Passe materiais de semestre a semestre, recupere parte do valor investido e apoie caloiros a preços justos.
                </p>
              </div>

              <div className="mt-4 sm:mt-5 p-2.5 sm:p-3 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl flex items-baseline justify-between">
                <span className="text-xs font-medium text-slate-500">Poupança Média</span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900">Até 40%</span>
              </div>
            </div>

            {/* Cartão 4 (Bento Largo - Categorias & Modalidades com Ícones Vetoriais) */}
            <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 ring-1 ring-slate-900/5 shadow-bento flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase tracking-wider">Multi-Modalidades</span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">Comprar, Vender, Trocar ou Doar</h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-md">
                  Manuais de Direito, calculadoras, computadores, documentos e muito mais.
                </p>
              </div>

              {/* Tags Profissionais com Ícones SVG (Sem Emojis) */}
              <div className="relative z-10 mt-4 sm:mt-5 flex flex-wrap gap-1.5 sm:gap-2">
                <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl text-[11px] sm:text-xs font-medium border border-white/10 transition-colors">
                  <BookOpen className="w-3.5 h-3.5 mr-1.5 text-blue-300 shrink-0" />
                  Manuais e Livros
                </span>
                <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl text-[11px] sm:text-xs font-medium border border-white/10 transition-colors">
                  <Calculator className="w-3.5 h-3.5 mr-1.5 text-amber-300 shrink-0" />
                  Calculadoras Científicas
                </span>
                <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl text-[11px] sm:text-xs font-medium border border-white/10 transition-colors">
                  <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-emerald-300 shrink-0" />
                  Partilha de Documentos e Slides
                </span>
                <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl text-[11px] sm:text-xs font-medium border border-white/10 transition-colors">
                  <HeartHandshake className="w-3.5 h-3.5 mr-1.5 text-rose-300 shrink-0" />
                  Doações e Emprestimos
                </span>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="text-center py-4 sm:py-6 border-t border-slate-200/80 text-xs text-slate-500 max-w-4xl mx-auto w-full mt-8 sm:mt-10">
        <p>© 2026 CampusStore — Universidade Católica de Moçambique (Pemba). Todos os direitos reservados.</p>
      </footer>

      {/* 5. ONBOARDING NATIVO: BOTTOM SHEET NO MOBILE & PREVENÇÃO DE CLS */}

      {/* MODAL / BOTTOM SHEET DE LOGIN */}
      {isLoginModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLoginModal(false);
          }}
        >
          <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-t-[28px] sm:rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/50 relative max-h-[85vh] overflow-y-auto overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-7 animate-in slide-in-from-bottom duration-300 sm:zoom-in-95">
            
            {/* Drag Handle / Pill para Mobile */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

            {/* Botão Fechar Acessível */}
            <button
              onClick={() => setIsLoginModal(false)}
              className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho */}
            <div className="mb-5 sm:mb-6">
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-2.5 text-ucm-emerald">
                <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">Entrar na Conta</h2>
              <p className="text-xs text-slate-500 mt-1">Aceda ao marketplace académico seguro da UCM Pemba.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3.5 sm:space-y-4">
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
                    className={`w-full p-3 sm:p-3.5 pr-10 border rounded-xl text-base sm:text-sm transition-all focus:outline-none min-h-[48px] ${
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

                {/* Prevenção de CLS: Altura reservada fixa com transição suave */}
                <div className="min-h-[20px] mt-1 flex items-center">
                  {loginData.email.length > 0 && !isLoginEmailValid ? (
                    <p className="text-[11px] font-bold text-rose-600 flex items-center animate-in fade-in duration-200">
                      <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                      O e-mail deve terminar obrigatoriamente com @ucm.ac.mz
                    </p>
                  ) : (
                    <span className="text-[10px] text-slate-400">Insira a sua credencial académica oficial</span>
                  )}
                </div>
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
                    className="text-xs font-bold text-ucm-emerald hover:underline py-1"
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
                    className="w-full p-3 sm:p-3.5 pr-11 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[48px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={showLoginPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botão Squishy com Feedback de Carregamento Integrado Sem CLS */}
              <button
                type="submit"
                disabled={isSubmitting || !isLoginEmailValid || !loginData.password}
                className={`w-full py-3.5 px-4 font-bold rounded-2xl text-sm min-h-[48px] shadow-md transition-all duration-200 active:scale-[0.97] flex items-center justify-center mt-2 relative cursor-pointer ${
                  isSubmitting || !isLoginEmailValid || !loginData.password
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed active:scale-100'
                    : 'bg-ucm-emerald hover:bg-ucm-darkEmerald text-white shadow-ucm-emerald/20 hover:shadow-lg'
                }`}
              >
                <span className={`flex items-center justify-center transition-opacity duration-200 ${isSubmitting ? 'opacity-0' : 'opacity-100'}`}>
                  Entrar na Conta
                </span>
                {isSubmitting && (
                  <span className="absolute inset-0 flex items-center justify-center space-x-2 text-white animate-in fade-in duration-200">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>A autenticar...</span>
                  </span>
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
                    className="font-bold text-slate-900 hover:text-ucm-emerald underline ml-1 py-1"
                  >
                    Criar Conta UCM
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL / BOTTOM SHEET DE REGISTO */}
      {isRegisterModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsRegisterModal(false);
          }}
        >
          <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-t-[28px] sm:rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/50 relative max-h-[85vh] overflow-y-auto overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-7 animate-in slide-in-from-bottom duration-300 sm:zoom-in-95">
            
            {/* Drag Handle para Mobile */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

            <button
              onClick={() => setIsRegisterModal(false)}
              className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 sm:mb-5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-slate-900 text-ucm-emerald rounded-2xl flex items-center justify-center mb-2.5">
                <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">Criar Conta UCM</h2>
              <p className="text-xs text-slate-500 mt-1">Exclusivo para estudantes e docentes com e-mail institucional.</p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3 sm:space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Ex: Ancha Jussa"
                  value={regData.full_name}
                  onChange={(e) => setRegData({ ...regData, full_name: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Curso UCM</label>
                <select
                  value={regData.course}
                  onChange={(e) => setRegData({ ...regData, course: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[48px] bg-white cursor-pointer"
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
                    className={`w-full p-3 pr-10 border rounded-xl text-base sm:text-sm focus:outline-none min-h-[48px] ${
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

                {/* Prevenção de CLS: Altura reservada fixa */}
                <div className="min-h-[20px] mt-1 flex items-center">
                  {regData.email.length > 0 && !isRegEmailValid ? (
                    <p className="text-[11px] font-bold text-rose-600 flex items-center animate-in fade-in duration-200">
                      <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                      Apenas e-mails com @ucm.ac.mz são permitidos
                    </p>
                  ) : (
                    <span className="text-[10px] text-slate-400">Verificação automática do domínio UCM</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Palavra-passe</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    className="w-full p-3 pr-11 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[48px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={showRegPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Prevenção de CLS: Altura reservada */}
                <div className="min-h-[20px] mt-1 flex items-center">
                  {regData.password.length > 0 && regData.password.length < 6 ? (
                    <p className="text-[11px] font-medium text-amber-600 animate-in fade-in duration-200">
                      A palavra-passe deve ter pelo menos 6 caracteres.
                    </p>
                  ) : (
                    <span className="text-[10px] text-slate-400">Segurança da conta UCM</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl text-xs text-slate-600 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>O seu e-mail institucional é verificado para garantir transações 100% seguras no campus de Pemba.</span>
              </div>

              {/* Botão Squishy com Feedback de Carregamento Integrado Sem CLS */}
              <button
                type="submit"
                disabled={isSubmitting || !isRegEmailValid || regData.password.length < 6 || !regData.full_name.trim()}
                className={`w-full py-3.5 px-4 font-bold rounded-2xl text-sm min-h-[48px] shadow-md transition-all duration-200 active:scale-[0.97] flex items-center justify-center relative cursor-pointer ${
                  isSubmitting || !isRegEmailValid || regData.password.length < 6 || !regData.full_name.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed active:scale-100'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20 hover:shadow-lg'
                }`}
              >
                <span className={`flex items-center justify-center transition-opacity duration-200 ${isSubmitting ? 'opacity-0' : 'opacity-100'}`}>
                  Registar Conta UCM
                </span>
                {isSubmitting && (
                  <span className="absolute inset-0 flex items-center justify-center space-x-2 text-white animate-in fade-in duration-200">
                    <Loader2 className="w-5 h-5 animate-spin text-ucm-emerald" />
                    <span>A criar conta...</span>
                  </span>
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
                    className="font-bold text-ucm-emerald hover:underline ml-1 py-1"
                  >
                    Iniciar Sessão
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL / BOTTOM SHEET DE RECUPERAÇÃO DE PALAVRA-PASSE */}
      {isForgotModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsForgotModal(false);
              setIsForgotSuccess(false);
            }
          }}
        >
          <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-t-[28px] sm:rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/50 relative max-h-[85vh] overflow-y-auto overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-7 animate-in slide-in-from-bottom duration-300 sm:zoom-in-95">
            
            {/* Drag Handle para Mobile */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

            <button
              onClick={() => {
                setIsForgotModal(false);
                setIsForgotSuccess(false);
              }}
              className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {isForgotSuccess ? (
              <div className="text-center py-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">Instruções Enviadas!</h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Enviámos um link seguro de reposição para{' '}
                  <span className="font-bold text-slate-900">{forgotEmail}</span>.
                </p>

                <div className="my-4 p-3 sm:p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl sm:rounded-2xl text-left text-xs text-amber-900 leading-relaxed flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Dica de Segurança UCM:</strong> Verifique a sua caixa de correio institucional. Caso não apareça de imediato, consulte a pasta de <strong>Spam / Lixo Eletrónico</strong>.</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotModal(false);
                    setIsForgotSuccess(false);
                    setIsLoginModal(true);
                  }}
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.97] text-white font-bold rounded-2xl text-sm min-h-[48px] shadow-md transition-all duration-200 cursor-pointer"
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 sm:mb-5">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-2.5">
                    <KeyRound className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">Recuperar Palavra-passe</h2>
                  <p className="text-xs text-slate-500 mt-1">Insira o e-mail institucional registado para receber o link de reposição.</p>
                </div>

                <form onSubmit={handleForgotSubmit} className="space-y-3.5 sm:space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">E-mail @ucm.ac.mz</label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="estudante@ucm.ac.mz"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full p-3 sm:p-3.5 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-ucm-emerald focus:outline-none min-h-[48px]"
                    />
                  </div>

                  <div className="flex space-x-2.5 sm:space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotModal(false);
                        setIsLoginModal(true);
                      }}
                      className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 active:scale-[0.97] text-slate-700 font-bold rounded-2xl text-sm min-h-[48px] transition-all duration-200"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !forgotEmail.toLowerCase().trim().endsWith('@ucm.ac.mz')}
                      className={`w-1/2 py-3 font-bold rounded-2xl text-sm min-h-[48px] shadow-md transition-all duration-200 active:scale-[0.97] flex items-center justify-center relative ${
                        isSubmitting || !forgotEmail.toLowerCase().trim().endsWith('@ucm.ac.mz')
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed active:scale-100'
                          : 'bg-ucm-emerald hover:bg-ucm-darkEmerald text-white'
                      }`}
                    >
                      <span className={`transition-opacity duration-200 ${isSubmitting ? 'opacity-0' : 'opacity-100'}`}>
                        Enviar Link
                      </span>
                      {isSubmitting && (
                        <span className="absolute inset-0 flex items-center justify-center text-white">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </span>
                      )}
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

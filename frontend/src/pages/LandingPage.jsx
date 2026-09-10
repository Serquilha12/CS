import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, KeyRound, Repeat, BookOpen, LogIn, UserPlus,
  Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, X, ShieldCheck,
  MessageSquare, Sparkles, ArrowRight, Check, HeartHandshake, CheckCheck,
  Calculator, Search, MapPin, Users, ArrowUpRight, FileText, Sparkle
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UCM_COURSES } from '../constants';
import { fetchApi } from '../services/api';
import { Logo } from '../components/Logo';
import { PasswordStrengthMeter, checkPasswordStrength } from '../components/PasswordStrengthMeter';

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
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

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
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(null);

  // Validação em Tempo Real de E-mail UCM com RegEx estrito
  const UCM_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@ucm\.ac\.mz$/i;
  const isLoginEmailValid = UCM_EMAIL_REGEX.test(loginData.email.trim());
  const isRegEmailValid = UCM_EMAIL_REGEX.test(regData.email.trim());

  // Validação de Nome Completo: Mínimo 2 palavras e apenas caracteres alfabéticos válidos
  const fullNameWords = regData.full_name.trim().split(/\s+/).filter(Boolean);
  const isFullNameValid =
    fullNameWords.length >= 2 &&
    /^[a-zA-ZÀ-ÿ\s'-]+$/.test(regData.full_name.trim()) &&
    regData.full_name.trim().length >= 4;

  // Validação em Tempo Real da Política de Palavra-passe Forte
  const { isStrong: isRegPasswordStrong } = checkPasswordStrength(regData.password);
  const doPasswordsMatch = regData.password.length > 0 && regData.password === regConfirmPassword;
  const isRegFormValid = isRegEmailValid && isFullNameValid && isRegPasswordStrong && doPasswordsMatch;

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
      const msg = (err?.message || '').toString().trim();
      const isGarbage =
        !msg ||
        msg === '{}' ||
        msg === '({})' ||
        msg === '[]' ||
        msg === '([])' ||
        (msg.startsWith('{') && msg.endsWith('}')) ||
        msg.includes('[object Object]');
      showToast(isGarbage ? 'Falha ao iniciar sessão. Verifique os seus dados de acesso.' : msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();

    if (!isRegEmailValid) {
      showToast('Apenas e-mails institucionais com a extensão @ucm.ac.mz podem criar conta.', 'warning');
      return;
    }

    if (!isFullNameValid) {
      showToast('Por favor, introduza o seu nome completo (pelo menos Nome e Apelido).', 'warning');
      return;
    }

    if (!isRegPasswordStrong) {
      showToast('A palavra-passe deve cumprir todos os 5 critérios de segurança.', 'warning');
      return;
    }

    if (!doPasswordsMatch) {
      showToast('As palavras-passe introduzidas não coincidem.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const emailSubmitted = regData.email.toLowerCase().trim();
      const res = await register({
        ...regData,
        full_name: regData.full_name.trim().replace(/\s+/g, ' '),
        email: emailSubmitted
      });

      if (res?.requiresEmailConfirmation) {
        setEmailConfirmationSent(emailSubmitted);
        setLoginData(prev => ({ ...prev, email: emailSubmitted }));
        setIsRegisterModal(false);
        setIsLoginModal(true);
        showToast(
          res.message || 'Link de ativação enviado! Verifique o seu correio institucional (@ucm.ac.mz).',
          'info',
          8000
        );
      } else {
        showToast('Conta criada com sucesso! Bem-vindo à CampusStore.', 'success');
        navigate('/marketplace');
      }
    } catch (err) {
      const msg = (err?.message || '').toString().trim();
      const isGarbage =
        !msg ||
        msg === '{}' ||
        msg === '({})' ||
        msg === '[]' ||
        msg === '([])' ||
        (msg.startsWith('{') && msg.endsWith('}')) ||
        msg.includes('[object Object]');
      showToast(isGarbage ? 'Erro ao criar conta no servidor. Por favor, tente novamente.' : msg, 'error');
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-x-hidden selection:bg-ucm-emerald selection:text-white">

      {/* MESH GRADIENTS SUAVES NOS CANTOS SUPERIORES */}
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

      {/* 1. CABEÇALHO FLUTUANTE PREMIUM COM GLASSMORPHISM */}
      <div className="w-full px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6">
        <header className="flex items-center justify-between py-2.5 sm:py-3 px-4 sm:px-6 max-w-5xl mx-auto w-full bg-white/85 backdrop-blur-xl border border-white/80 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/5 rounded-2xl sm:rounded-3xl sticky top-3 sm:top-4 z-40 transition-all duration-300">

          {/* Identidade / Marca com Logo Oficial em Gradiente */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="h-9 sm:h-10 px-2 sm:px-2.5 bg-slate-900/5 border border-slate-900/5 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 hover:scale-105 transition-transform duration-200">
              <Logo className="h-5 sm:h-6 w-auto" />
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

          {/* Lado Direito: Link Cadastrar com Estilização Sutil */}
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
      </div>

      {/* 2. HERO SECTION DE ALTO IMPACTO */}
      <main className="max-w-5xl mx-auto text-center my-auto py-8 sm:py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center w-full">

        {/* Badge Exclusivo */}
        <div className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-4 py-1.5 bg-white/80 backdrop-blur-md text-ucm-darkEmerald rounded-full text-[11px] sm:text-xs font-bold border border-emerald-200/80 shadow-xs mb-5 max-w-full">
          <GraduationCap className="w-4 h-4 text-ucm-emerald shrink-0" />
          <span className="truncate">Exclusivo para a Comunidade Universitária</span>
        </div>

        {/* Título Principal */}
        <h1 className="text-3xl xs:text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-snug sm:leading-[1.15] max-w-3xl mx-auto">
          Poupe no seu <span className="bg-gradient-to-r from-slate-950 via-ucm-emerald to-blue-600 bg-clip-text text-transparent">material académico</span>
        </h1>

        {/* Subtítulo Equilibrado */}
        <p className="text-slate-600 text-sm sm:text-lg leading-relaxed max-w-xl mx-auto mt-4 font-normal px-2 sm:px-0">
          O marketplace interno e seguro para compra, venda, troca e doação de manuais, calculadoras e diversos materiais didáticos entre estudantes.
        </p>

        {/* 3. MICRO-INTERAÇÕES: Botão Único de Entrar */}
        <div className="pt-6 sm:pt-8 w-full max-w-xs flex justify-center">
          <button
            onClick={() => {
              setIsLoginModal(true);
              setIsRegisterModal(false);
            }}
            className="w-full min-h-[50px] py-3.5 px-6 bg-slate-900 hover:bg-slate-800 active:scale-[0.97] text-white font-bold rounded-2xl shadow-xl shadow-slate-900/20 transition-all duration-200 text-base flex items-center justify-center cursor-pointer group"
          >
            <LogIn className="w-5 h-5 mr-2 text-ucm-emerald group-hover:scale-110 transition-transform" />
            <span>Entrar na Conta</span>
          </button>
        </div>

        {/* MÉTROCAS RÁPIDAS DE CONFIANÇA (TRUST STATS) */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-500">
          <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-slate-200/60 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Até 40% de Poupança</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-slate-200/60 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-slate-700">100% Verificado @ucm.ac.mz</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-slate-200/60 shadow-xs">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-slate-700">Entrega Direta no Campus</span>
          </div>
        </div>

        {/* 4. COMO FUNCIONA EM 3 PASSOS (FLOW INFOGRAPHIC) */}
        <section className="w-full mt-14 sm:mt-20 text-left">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-[11px] sm:text-xs font-bold text-ucm-emerald tracking-wider uppercase">Simples e Seguro</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Como funciona no Campus</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
              Três passos rápidos para comprar, vender ou doar materiais académicos sem intermediários.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">

            {/* Passo 01 */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/60 shadow-bento hover:shadow-xl transition-all duration-300 relative group flex flex-col justify-between">
              <div>
                <span className="text-4xl font-black text-slate-200 group-hover:text-blue-100 transition-colors">01</span>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center my-3">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Crie a sua Conta</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Valide o seu e-mail institucional @ucm.ac.mz. O acesso é exclusivo para a comunidade universitária.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] font-bold text-ucm-emerald">
                <span>Acesso Imediato</span>
                <Check className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Passo 02 */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/60 shadow-bento hover:shadow-xl transition-all duration-300 relative group flex flex-col justify-between">
              <div>
                <span className="text-4xl font-black text-slate-200 group-hover:text-amber-100 transition-colors">02</span>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center my-3">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Encontre ou Anuncie</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Pesquise manuais, calculadoras, Documentos e slides, ou fotografe os seus materiais parados para vender ou doar.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] font-bold text-amber-600">
                <span>4 Modalidades Disponíveis</span>
                <Check className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Passo 03 */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/60 shadow-bento hover:shadow-xl transition-all duration-300 relative group flex flex-col justify-between">
              <div>
                <span className="text-4xl font-black text-slate-200 group-hover:text-emerald-100 transition-colors">03</span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center my-3">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Negocie e Entregue</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Converse no chat interno seguro e marque a entrega física num dos pontos do campus: Em frente a biblioteca, Amendoeira ou Entrada de estudantes.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] font-bold text-emerald-600">
                <span>Zero Custos de Envio</span>
                <Check className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

          </div>
        </section>

        {/* 5. BENTO BOX: RECURSOS EXCLUSIVOS */}
        <section className="w-full mt-16 sm:mt-24 text-left">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-[11px] sm:text-xs font-bold text-ucm-emerald tracking-wider uppercase">Plataforma Dedicada</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Concebido para a realidade do Campus</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Cartão 1 (Bento Largo - Chat Integrado & Mockup Flutuante) */}
            <div className="md:col-span-2 bg-white/85 backdrop-blur-md rounded-3xl p-6 sm:p-8 ring-1 ring-slate-900/5 shadow-bento hover:shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-blue-50 text-ucm-emerald rounded-2xl flex items-center justify-center mb-3">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold px-3 py-1 bg-blue-50 text-ucm-emerald rounded-full border border-blue-100">
                    Negociação Instantânea
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Chat Interno em Tempo Real</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md leading-relaxed">
                  Converse diretamente com colegas de turma, combine a entrega física no campus e negocie com privacidade sem expor o seu contacto pessoal.
                </p>
              </div>

              {/* Mockup com 2 Bolhas Flutuantes (Sem Emojis) */}
              <div className="mt-6 pt-4 border-t border-slate-100/80 space-y-3">
                {/* Bolha Comprador */}
                <div className="flex items-end space-x-2.5 animate-float-slow">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center justify-center shrink-0">
                    AJ
                  </div>
                  <div className="bg-slate-100/90 text-slate-800 text-xs px-4 py-2.5 rounded-2xl rounded-bl-xs max-w-[85%] sm:max-w-xs shadow-xs break-words">
                    <p className="text-[10px] font-semibold text-slate-500 mb-0.5">Colega de Direito</p>
                    Olá! Ainda tens o livro de Direito Constitucional da 2ª Edição?
                  </div>
                </div>

                {/* Bolha Vendedor */}
                <div className="flex items-end justify-end space-x-2.5 animate-float-slower">
                  <div className="bg-ucm-emerald text-white text-xs px-4 py-2.5 rounded-2xl rounded-br-xs max-w-[85%] sm:max-w-xs shadow-md shadow-ucm-emerald/20 break-words">
                    Sim! Posso entregar amanhã às 10h em frente à Biblioteca Central.
                    <span className="inline-flex items-center justify-end w-full text-[9px] text-blue-200 text-right mt-1 space-x-0.5">
                      <span>10:15</span>
                      <CheckCheck className="w-3 h-3 text-blue-200 inline ml-1 shrink-0" />
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-ucm-darkEmerald text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                    Tu
                  </div>
                </div>
              </div>
            </div>

            {/* Cartão 2 (Bento Quadrado - Segurança Institucional) */}
            <div className="md:col-span-1 bg-white/85 backdrop-blur-md rounded-3xl p-6 sm:p-8 ring-1 ring-slate-900/5 shadow-bento hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">100% Universitário</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Acesso estritamente restrito a estudantes e docentes com e-mail institucional <span className="font-semibold text-slate-700">@ucm.ac.mz</span>. Zero perfis falsos.
                </p>
              </div>

              <div className="mt-6 p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-900">Verificação Automática</span>
              </div>
            </div>

            {/* Cartão 3 (Bento Quadrado - Economia Circular) */}
            <div className="md:col-span-1 bg-white/85 backdrop-blur-md rounded-3xl p-6 sm:p-8 ring-1 ring-slate-900/5 shadow-bento hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3">
                  <Repeat className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Economia Circular</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Passe materiais de semestre a semestre, recupere parte do valor investido e apoie caloiros a preços justos.
                </p>
              </div>

              <div className="mt-6 p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-baseline justify-between">
                <span className="text-xs font-medium text-slate-500">Poupança Média</span>
                <span className="text-base font-extrabold text-slate-900">Até 40%</span>
              </div>
            </div>

            {/* Cartão 4 (Bento Largo - Categorias & Modalidades com Ícones Vetoriais) */}
            <div className="md:col-span-2 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 ring-1 ring-slate-900/5 shadow-bento flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase tracking-wider">Multi-Modalidades</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">Comprar, Vender, Trocar ou Doar</h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed max-w-md">
                  Manuais de Direito, calculadoras, computadores, documentos e muito mais.
                </p>
              </div>

              {/* Tags Profissionais com Ícones SVG (Sem Emojis) */}
              <div className="relative z-10 mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl text-xs font-medium border border-white/10 transition-colors">
                  <BookOpen className="w-3.5 h-3.5 mr-1.5 text-blue-300 shrink-0" />
                  Manuais e Livros
                </span>
                <span className="inline-flex items-center px-3 py-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl text-xs font-medium border border-white/10 transition-colors">
                  <Calculator className="w-3.5 h-3.5 mr-1.5 text-amber-300 shrink-0" />
                  Calculadoras Científicas
                </span>
                <span className="inline-flex items-center px-3 py-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl text-xs font-medium border border-white/10 transition-colors">
                  <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-emerald-300 shrink-0" />
                  Partilha de Documentos e Slides
                </span>
                <span className="inline-flex items-center px-3 py-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl text-xs font-medium border border-white/10 transition-colors">
                  <HeartHandshake className="w-3.5 h-3.5 mr-1.5 text-rose-300 shrink-0" />
                  Doações e Emprestimos
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* 6. BANNER FINAL DE CHAMADA PARA AÇÃO (CTA BLOCK) */}
        <section className="w-full mt-16 sm:mt-24">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden border border-slate-800">
            <div className="max-w-xl mx-auto space-y-4 relative z-10">
              <span className="inline-flex items-center px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-blue-300 border border-white/10">
                Comece Hoje
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Pronto para poupar nas suas despesas académicas?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                Junte-se aos estudantes da UCM que já reutilizam materiais e economizam dinheiro todos os semestres.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setIsRegisterModal(true);
                    setIsLoginModal(false);
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 bg-ucm-emerald hover:bg-ucm-darkEmerald text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.97] text-sm cursor-pointer"
                >
                  Criar Conta Universitária
                </button>
                <button
                  onClick={() => {
                    setIsLoginModal(true);
                    setIsRegisterModal(false);
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl transition-all active:scale-[0.97] text-sm border border-white/10 cursor-pointer"
                >
                  Iniciar Sessão
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* 7. FOOTER ESTRUTURADO DE FECHAMENTO COMPLETO (SEM ESPAÇO VAZIO) */}
      <footer className="w-full bg-white/70 backdrop-blur-md border-t border-slate-200/80 mt-16 sm:mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-8 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5">
              <div className="h-7 w-7 px-1 bg-slate-900/5 rounded-lg flex items-center justify-center">
                <Logo className="h-4 w-auto" />
              </div>
              <span className="font-extrabold text-slate-800 text-sm tracking-tight">CampusStore</span>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] text-slate-400">Universidade Católica de Moçambique</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500">
              <button
                onClick={() => showToast('As trocas devem ser realizadas nos pontos de encontro oficiais do campus (Em frente a biblioteca, Amendoeira ou Entrada de estudantes).', 'info')}
                className="hover:text-slate-900 transition-colors"
              >
                Segurança no Campus
              </button>
              <span>•</span>
              <button
                onClick={() => showToast('Apenas e-mails institucionais verificados têm permissão para negociar.', 'info')}
                className="hover:text-slate-900 transition-colors"
              >
                Termos de Uso
              </button>
              <span>•</span>
              <button
                onClick={() => showToast('Os seus dados e contactos pessoais permanecem privados.', 'info')}
                className="hover:text-slate-900 transition-colors"
              >
                Privacidade
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-slate-400">
            © 2026 CampusStore — Plataforma independente desenvolvida para estudantes universitários da UCM Pemba.
          </div>
        </div>
      </footer>

      {/* 8. MODAIS / BOTTOM SHEETS */}

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

            {emailConfirmationSent && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-950">Link de Ativação Enviado!</p>
                  <p className="mt-0.5 text-emerald-800 leading-relaxed">
                    Enviámos um link de verificação para <span className="font-semibold underline">{emailConfirmationSent}</span>.
                    Por favor, aceda à sua caixa de correio da UCM e clique no link antes de iniciar sessão.
                  </p>
                </div>
              </div>
            )}

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
                    className={`w-full p-3 sm:p-3.5 pr-10 border rounded-xl text-base sm:text-sm transition-all focus:outline-none min-h-[48px] ${loginData.email.length > 0
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
                className={`w-full py-3.5 px-4 font-bold rounded-2xl text-sm min-h-[48px] shadow-md transition-all duration-200 active:scale-[0.97] flex items-center justify-center mt-2 relative cursor-pointer ${isSubmitting || !isLoginEmailValid || !loginData.password
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
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Ex: Ancha Jussa"
                    value={regData.full_name}
                    onChange={(e) => setRegData({ ...regData, full_name: e.target.value })}
                    className={`w-full p-3 pr-10 border rounded-xl text-base sm:text-sm focus:outline-none min-h-[48px] ${
                      regData.full_name.length > 0
                        ? isFullNameValid
                          ? 'border-emerald-500 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                          : 'border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400'
                        : 'border-slate-300 focus:ring-2 focus:ring-ucm-emerald'
                    }`}
                  />
                  {regData.full_name.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isFullNameValid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                      )}
                    </div>
                  )}
                </div>
                <div className="min-h-[20px] mt-1 flex items-center">
                  {regData.full_name.length > 0 && !isFullNameValid ? (
                    <p className="text-[11px] font-bold text-rose-600 flex items-center animate-in fade-in duration-200">
                      <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                      Introduza o nome completo com pelo menos Nome e Apelido
                    </p>
                  ) : (
                    <span className="text-[10px] text-slate-400">Pelo menos 2 palavras (Nome e Apelido)</span>
                  )}
                </div>
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
                    <span className="text-[10px] text-slate-400">Verificação automática do domínio institucional UCM</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Palavra-passe Forte</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres (A-Z, a-z, 0-9, !@#$)"
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    className={`w-full p-3 pr-11 border rounded-xl text-base sm:text-sm focus:outline-none min-h-[48px] ${
                      regData.password.length > 0
                        ? isRegPasswordStrong
                          ? 'border-emerald-500 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                          : 'border-amber-400 focus:ring-2 focus:ring-amber-400'
                        : 'border-slate-300 focus:ring-2 focus:ring-ucm-emerald'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                    aria-label={showRegPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Medidor e Checklist Dinâmica de Segurança */}
                <PasswordStrengthMeter password={regData.password} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirmar Palavra-passe</label>
                <div className="relative">
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Repita a palavra-passe criada"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className={`w-full p-3 pr-11 border rounded-xl text-base sm:text-sm focus:outline-none min-h-[48px] ${
                      regConfirmPassword.length > 0
                        ? doPasswordsMatch
                          ? 'border-emerald-500 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                          : 'border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400'
                        : 'border-slate-300 focus:ring-2 focus:ring-ucm-emerald'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                    aria-label={showRegConfirmPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  >
                    {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="min-h-[20px] mt-1 flex items-center">
                  {regConfirmPassword.length > 0 ? (
                    doPasswordsMatch ? (
                      <p className="text-[11px] font-bold text-emerald-600 flex items-center animate-in fade-in duration-200">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                        As palavras-passe coincidem
                      </p>
                    ) : (
                      <p className="text-[11px] font-bold text-rose-600 flex items-center animate-in fade-in duration-200">
                        <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                        As palavras-passe não coincidem
                      </p>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-400">Confirmação obrigatória para evitar erros</span>
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
                disabled={isSubmitting || !isRegFormValid}
                className={`w-full py-3.5 px-4 font-bold rounded-2xl text-sm min-h-[48px] shadow-md transition-all duration-200 active:scale-[0.97] flex items-center justify-center relative cursor-pointer ${
                  isSubmitting || !isRegFormValid
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
                      className={`w-1/2 py-3 font-bold rounded-2xl text-sm min-h-[48px] shadow-md transition-all duration-200 active:scale-[0.97] flex items-center justify-center relative ${isSubmitting || !forgotEmail.toLowerCase().trim().endsWith('@ucm.ac.mz')
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

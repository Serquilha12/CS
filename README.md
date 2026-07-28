# 🎓 CampusStore — Marketplace Digital Académico (UCM Pemba)

Sistema completo desenvolvido na **Arquitetura MVC (Model-View-Controller)** para compra, venda e troca de materiais académicos entre estudantes da **Universidade Católica de Moçambique (UCM - Pemba)**.

---

## 🏗️ Arquitetura do Sistema

```
s:\Projectos\CS\
├── database\                # Camada de Persistência e Segurança SQL
│   ├── schema.sql           # Tabelas (profiles, listings, reservations, chat, global_stats)
│   ├── rls_policies.sql     # Políticas de Row Level Security (RLS)
│   ├── triggers.sql         # Triggers PostgreSQL para estatísticas em tempo real
│   ├── indexes.sql          # Índices B-Tree otimizados (course, status, created_at)
│   └── seed.sql             # Dados iniciais de demonstração
│
├── backend\                 # Backend Express.js em Arquitetura MVC
│   ├── config/              # Configurações de Supabase, constantes e limites
│   ├── controllers/         # [Controller] Lógica de Controlo de Pedidos HTTP
│   ├── models / services/   # [Model] Serviços e Integração com Supabase
│   ├── routes/              # Encaminhamento de Rotas da API (/api/v1/...)
│   ├── middlewares/         # Autenticação JWT, Rate Limiting e Helmet
│   ├── websocket/           # Server WebSocket com Map<userId, Socket> para broadcast por curso
│   ├── app.js               # Configuração do Express
│   └── server.js            # Inicializador HTTP + WebSocket
│
└── frontend\                # [View] Camada de Visualização em React + Tailwind CSS
    ├── src/components/      # BottomNavigation, CreateListingWizard, SkeletonLoaders, Toast
    ├── src/context/         # AuthContext e WebSocketContext
    ├── src/hooks/           # useListings, useChat, useAuth
    ├── src/pages/           # LandingPage, Marketplace, ListingDetail, ChatPage, AdminDashboard (Lazy)
    └── index.html           # SEO (react-helmet) e Open Graph para WhatsApp
```

---

## ⚡ Principais Funcionalidades & Otimizações

1. **Segurança & Autenticação:**
   - Restrição estrita de e-mails ao domínio `@ucm.ac.mz`.
   - Sessões guardadas em **Cookies HttpOnly** para mitigar XSS.
   - Proteção contra DDoS e Força Bruta via `express-rate-limit` (5 logins/min, 10 anúncios/hora).
   - Validação de entrada de dados via `Zod`.
   - Cabeçalhos de segurança web via `helmet`.

2. **Base de Dados & Performance:**
   - **Row Level Security (RLS):** Garantia declarativa no PostgreSQL de que apenas o dono (`auth.uid() = owner_id`) pode alterar ou apagar o anúncio.
   - **Triggers em Tempo Real:** Atualização automática das métricas no Painel Admin quando uma transação for marcada como `completed`.
   - **Índices B-Tree:** Consultas ultrarrápidas filtradas por `course` e `status`.

3. **Tempo Real & Comunicação:**
   - Chat interno direto entre comprador e vendedor.
   - Servidor WebSocket inteligente (`Map<string, WebSocket>`) enviando alertas de novos materiais apenas para estudantes do respetivo curso.

4. **UX/UI Mobile-First:**
   - *Landing Page* minimalista sem distrações cognitivas.
   - *Bottom Navigation Bar* fixa com áreas de toque (*touch targets*) de 44px+.
   - Formulário *Wizard* em 3 passos para criação de anúncios sem abandono.
   - *Skeleton Loaders*, *Toasts* flutuantes e estados vazios amigáveis.
   - Divisão de código (*Code Splitting*) com `React.lazy()` para o módulo de Administração.

---

## 🚀 Como Executar o Projeto

### 1. Configurar a Base de Dados (Supabase / PostgreSQL)
Execute a seguinte ordem de ficheiros SQL na consola do seu Supabase ou PostgreSQL local:
```bash
database/schema.sql
database/rls_policies.sql
database/triggers.sql
database/indexes.sql
database/seed.sql
```

### 2. Iniciar o Backend Node.js
```bash
cd backend
npm install
cp .env.example .env   # Preencha com as suas chaves do Supabase
npm start
```
O servidor backend rodará em `http://localhost:5000` (API REST + WebSocket).

### 3. Iniciar o Frontend React
```bash
cd frontend
npm install
npm run dev
```
A aplicação web rodará em `http://localhost:5173`.

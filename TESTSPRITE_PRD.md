# Product Requirement Document (PRD) — CampusStore UCM Pemba
## Software Frontend & E2E Testing Suite for TestSprite AI

---

### 1. Document Overview & Objective
This Product Requirement Document (PRD) outlines the functional requirements, user journeys, authentication mechanisms, and UI/UX acceptance criteria for **CampusStore** — an academic circular economy web application tailored for students and faculty at **Universidade Católica de Moçambique (UCM Pemba)**.

This document is optimized for automated AI agent testing in **TestSprite** to generate and execute end-to-end (E2E) frontend test cases.

- **Target Web Application URL**: `https://campusstore-ucm.vercel.app` (or local dev `http://localhost:5173`)
- **Primary Domain**: Circular Economy Marketplace for Academic Materials (Books, Calculators, Lab Supplies, Uniforms)
- **Supported Viewports**:
  - Desktop: 1280 × 800px (Chrome / Firefox / Edge)
  - Mobile: 375 × 812px (iOS Safari / Android Chrome viewports)

---

### 2. User Roles & Test Credentials

| Role | Email Domain Constraint | Capabilities | Test Credentials |
| :--- | :--- | :--- | :--- |
| **Unauthenticated Guest** | None | View landing page, open login/register modals, test email validation | N/A |
| **Student User** | `@ucm.ac.mz` (Mandatory) | Browse marketplace, post listings, reserve items, chat in real-time, view profile stats | `estudante.teste@ucm.ac.mz` / `Senha123!` |
| **Administrator (Moderator)** | `@ucm.ac.mz` + `role: admin` | Moderate listings, manage flagged items, view platform analytics at `/admin` | `admin.pemba@ucm.ac.mz` / `AdminPass123!` |

---

### 3. Core Functional Requirements & Test Cases

#### Module 1: Authentication & Institutional Email Validation
- **Landing Page (`/`)**:
  - Must display primary value proposition: *"Poupe até 40% no seu material académico"*.
  - Must render two main touch targets (min height 48px): **"Criar Conta com E-mail UCM"** and **"Já tenho Conta — Entrar"**.
- **Real-Time Institutional Email Checking**:
  - The email input must enforce `@ucm.ac.mz`.
  - When typing a valid `@ucm.ac.mz` email, a green checkmark (`CheckCircle2`) must appear.
  - If a non-institutional email is entered (e.g. `user@gmail.com`), a red alert badge (`AlertCircle`) and message *"O e-mail deve terminar obrigatoriamente com @ucm.ac.mz"* must block form submission.
- **Password Visibility & Security**:
  - Login, registration, and reset password inputs must feature an `Eye`/`EyeOff` toggle button.
  - Password length must be validated (min 6 characters).
  - Submit buttons must show loading states (`Loader2` spinner) with disabled state during API call.
- **Password Reset Flow (`/reset-password`)**:
  - "Esqueceu-se?" trigger in login modal opens Password Recovery modal.
  - Entering a valid UCM email and submitting must trigger a success screen with instructions: *"Enviámos um link seguro de reposição... Verifique a pasta de Spam/Lixo Eletrónico"*.
  - Accessing `/reset-password` must render a dedicated password reset page with live matching validation for "Nova Palavra-passe" and "Confirmar Nova Palavra-passe".

#### Module 2: Marketplace Browsing & Search (`/marketplace`)
- **Navigation & Layout**:
  - Top bar with CampusStore logo, search bar, and filter triggers.
  - Filter by Categories: *Livros & Manuais*, *Calculadoras & Eletrónicos*, *Batas & Laboratório*, *Material de Desenho*, *Outros*.
  - Filter by Transaction Types: *Venda*, *Troca*, *Doação*, *Empréstimo*.
- **Search & Filtering Responsiveness**:
  - Typing keywords in search bar must filter listing cards dynamically without full page refresh.
  - Category badges must highlight active filters.
  - Empty search state must display a helpful empty state with "Limpar Filtros" button.
- **Listing Cards**:
  - Displays thumbnail image, title, price in Meticais (MZN) or transaction badge ("Grátis / Doação"), condition badge ("Novo", "Usado - Excelente"), course tag, and seller name.

#### Module 3: Listing Detail & Reservation Flow (`/item/:id`)
- **Detail View**:
  - Image gallery with full-resolution view.
  - Detailed metadata: Condition, Course, Campus Meeting Point (e.g., *Biblioteca Central - UCM Pemba*), Seller info.
- **Reservation Action**:
  - Clicking **"Reservar / Combinar Encontro"** opens reservation modal.
  - Student selects meeting location and proposed price/terms.
  - Submitting creates a pending transaction and redirects student to the chat thread with seller.

#### Module 4: New Listing Creation (`/anunciar`)
- **Modal / Page Form**:
  - Fields required: Title (min 3 chars), Description (min 10 chars), Category, Condition, Price (MZN), Transaction Type, Course, Location.
- **Image Upload & Compression**:
  - Supports image file upload.
  - Must compress images client-side before submission.
- **Validation**:
  - Submit button disabled until all mandatory fields are valid.
  - On creation, displays success toast *"Anúncio publicado com sucesso!"* and navigates to the new item detail page.

#### Module 5: Real-Time Chat & Direct Messaging (`/chat`)
- **Messaging Threads**:
  - Renders list of active conversations grouped by item/user.
  - Displays unread message indicators.
- **Real-Time Transmission**:
  - Messages sent must append instantly to the conversation view (WebSocket / Supabase Realtime).
  - Pressing Enter or clicking Send button dispatches message.

#### Module 6: Student Profile & Circular Economy Metrics (`/perfil`)
- **User Dashboard**:
  - Displays student name, course, UCM email, and member badge.
  - Impact Metrics Cards:
    - *Volume Movimentado (MZN)*
    - *Economia Estimada (MZN)* (Calculated as ~35% savings vs new retail).
    - *Transações Concluídas*.
- **Active & Past Listings**:
  - Tabs for "Meus Anúncios" and "Minhas Reservas".
  - Ability to mark item as "Concluído" or delete listing.

#### Module 7: Admin Moderation Panel (`/admin`)
- **Role Guard**:
  - Restricted to users with `role: 'admin'`. Non-admin users attempting to visit `/admin` must be redirected to `/marketplace`.
- **Moderation Actions**:
  - Dashboard statistics: Total users, total active listings, volume moved in campus.
  - Moderation queue: Approve or remove flagged listings.

---

### 4. Non-Functional Criteria for TestSprite Execution
- **Performance**: Initial page load under 2.5 seconds on 3G/4G network emulation.
- **Accessibility**: Touch targets >= 44×44px, visible focus states on keyboard navigation.
- **Error Handling**: Network failures or invalid inputs must trigger human-readable toast notifications via `ToastContext`.
- **Security**: JWT session cookie (`cs_token`) set with `httpOnly` and `sameSite: lax`. Auto-logout after 15 minutes of inactivity on shared campus computers.

---
*Created for TestSprite AI Automated Testing Execution — CampusStore UCM Pemba.*

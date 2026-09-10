# Templates Oficiais de E-mail em Português — CampusStore UCM Pemba

Estes modelos estão formatados com as variáveis padrão do Supabase (`{{ .ConfirmationURL }}`, `{{ .Token }}`, etc.) e prontos para serem colados diretamente no painel do Supabase:
**Supabase Dashboard** > **Authentication** > **Email Templates**.

---

## 1. Reset Password (Redefinir Palavra-passe)

### 📌 Assunto (Subject):
```text
Redefinição de Palavra-passe — CampusStore UCM Pemba
```

### ✉️ Corpo da Mensagem (Message Body):
```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Redefinição de Palavra-passe</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 20px; margin: 0; font-weight: 800; letter-spacing: -0.5px; }
    .header span { color: #10b981; font-size: 13px; font-weight: 600; display: block; margin-top: 4px; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .content p { font-size: 14px; color: #475569; margin-bottom: 20px; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { background: #059669; color: #ffffff !important; padding: 14px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(5,150,105,0.25); }
    .token-box { background: #f1f5f9; padding: 14px; border-radius: 10px; font-family: monospace; font-size: 18px; text-align: center; letter-spacing: 4px; font-weight: bold; color: #0f172a; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px 24px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CampusStore</h1>
      <span>Universidade Católica de Moçambique — Campus de Pemba</span>
    </div>
    <div class="content">
      <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Olá, caro(a) estudante / docente!</h2>
      <p>Recebemos um pedido para redefinir a palavra-passe associada à sua conta institucional.</p>
      <p>Para escolher uma nova palavra-passe forte e recuperar o seu acesso, clique no botão seguro abaixo:</p>
      
      <div class="btn-container">
        <a href="{{ .ConfirmationURL }}" class="btn">Redefinir a Minha Palavra-passe</a>
      </div>

      <p style="font-size: 12px; color: #64748b;">Se o botão acima não funcionar, copie e cole o seguinte endereço no seu navegador:<br>
      <a href="{{ .ConfirmationURL }}" style="color: #059669; word-break: break-all;">{{ .ConfirmationURL }}</a></p>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Se não solicitou esta alteração, ignore este e-mail. A sua palavra-passe permanecerá segura e inalterada.</p>
    </div>
    <div class="footer">
      CampusStore UCM Pemba • Mercado Académico e Economia Circular<br>
      Faculdade de Gestão de Turismo e Informática (FGTI)
    </div>
  </div>
</body>
</html>
```

---

## 2. Confirm Signup (Confirmação de Registo)

### 📌 Assunto (Subject):
```text
Ativação da sua Conta Institucional — CampusStore UCM
```

### ✉️ Corpo da Mensagem (Message Body):
```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Confirmação de Registo</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 20px; margin: 0; font-weight: 800; letter-spacing: -0.5px; }
    .header span { color: #10b981; font-size: 13px; font-weight: 600; display: block; margin-top: 4px; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .content p { font-size: 14px; color: #475569; margin-bottom: 20px; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { background: #059669; color: #ffffff !important; padding: 14px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(5,150,105,0.25); }
    .footer { background: #f8fafc; padding: 20px 24px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CampusStore</h1>
      <span>Universidade Católica de Moçambique — Campus de Pemba</span>
    </div>
    <div class="content">
      <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Bem-vindo(a) à CampusStore! 🎓</h2>
      <p>A sua conta foi registada com sucesso com o e-mail institucional da UCM.</p>
      <p>Para ativar a sua conta e começar a negociar livros, apontamentos e materiais no campus, confirme o seu e-mail clicando no botão abaixo:</p>
      
      <div class="btn-container">
        <a href="{{ .ConfirmationURL }}" class="btn">Confirmar o Meu E-mail Institucional</a>
      </div>

      <p style="font-size: 12px; color: #64748b;">Se o botão acima não funcionar, copie e cole o endereço no navegador:<br>
      <a href="{{ .ConfirmationURL }}" style="color: #059669; word-break: break-all;">{{ .ConfirmationURL }}</a></p>
    </div>
    <div class="footer">
      CampusStore UCM Pemba • Comunidade Académica de Pemba
    </div>
  </div>
</body>
</html>
```

---

## 3. Magic Link (Acesso Rápido)

### 📌 Assunto (Subject):
```text
Link de Acesso Rápido — CampusStore UCM Pemba
```

### ✉️ Corpo da Mensagem (Message Body):
```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Acesso Rápido</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #0f172a; padding: 30px 24px; text-align: center; color: white; }
    .content { padding: 30px 24px; font-size: 14px; color: #475569; line-height: 1.6; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { background: #059669; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">CampusStore UCM</h2>
    </div>
    <div class="content">
      <p>Clique no botão abaixo para iniciar sessão diretamente na sua conta da CampusStore Pemba:</p>
      <div class="btn-container">
        <a href="{{ .ConfirmationURL }}" class="btn">Entrar na CampusStore</a>
      </div>
      <p style="font-size: 12px; color: #94a3b8;">Se não solicitou este link, ignore esta mensagem com segurança.</p>
    </div>
  </div>
</body>
</html>
```

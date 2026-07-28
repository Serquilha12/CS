const authService = require('../services/authService');
const { registerSchema, loginSchema } = require('../utils/validators');

class AuthController {
  async register(req, res, next) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.registerUser(validatedData);

      if (result.session?.access_token) {
        res.cookie('cs_token', result.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Conta criada com sucesso! Pode aceder à plataforma.',
        data: {
          token: result.session?.access_token,
          user: result.user,
          profile: result.profile
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.loginUser(validatedData);

      if (result.session?.access_token) {
        res.cookie('cs_token', result.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Autenticação bem-sucedida',
        data: {
          token: result.session.access_token,
          user: result.user,
          profile: result.profile
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res) {
    res.clearCookie('cs_token');
    return res.status(200).json({ success: true, message: 'Sessão encerrada com sucesso.' });
  }

  async me(req, res, next) {
    try {
      const profile = await authService.getProfile(req.user.id);
      return res.status(200).json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { full_name, course, campus, phone_number } = req.body;
      const updated = await authService.updateProfile(req.user.id, { full_name, course, campus, phone_number });
      return res.status(200).json({ success: true, message: 'Perfil atualizado com sucesso!', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, error: 'Indique o seu e-mail institucional.' });
      await authService.forgotPassword(email);
      return res.status(200).json({
        success: true,
        message: 'Instruções de recuperação enviadas para o seu e-mail institucional UCM.'
      });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
      }
      await authService.resetPassword(req.user.id, password);
      return res.status(200).json({
        success: true,
        message: 'Palavra-passe redefinida com sucesso. Pode iniciar sessão.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();

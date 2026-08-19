class AuthController {
  constructor(authUseCases) {
    this.authUseCases = authUseCases;
  }

  register = async (req, res) => {
    try {
      const { nombre, email, password } = req.body;
      await this.authUseCases.register(nombre, email, password);
      res.status(201).json({ ok: true, message: 'Cuenta creada exitosamente.' });
    } catch (error) {
      if (error.message.includes('Ya existe')) return res.status(409).json({ error: error.message });
      res.status(400).json({ error: error.message });
    }
  }

  login = async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await this.authUseCases.login(email, password);
      req.session.userId = user.id;
      req.session.userName = user.nombre;
      req.session.userEmail = user.email;
      req.session.userRol = user.rol;
      res.json({ ok: true, user: { nombre: user.nombre, email: user.email, rol: user.rol } });
    } catch (error) {
      if (error.message.includes('incorrectos')) return res.status(401).json({ error: error.message });
      res.status(400).json({ error: error.message });
    }
  }

  session = (req, res) => {
    if (!req.session.userId) {
      return res.json({ authenticated: false });
    }
    res.json({
      authenticated: true,
      user: {
        nombre: req.session.userName,
        email: req.session.userEmail,
        rol: req.session.userRol
      },
    });
  }

  logout = (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  }

  changePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await this.authUseCases.changePassword(req.session.userId, currentPassword, newPassword);
      res.json({ ok: true, message: '¡Contraseña actualizada exitosamente!' });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  }
}

module.exports = AuthController;

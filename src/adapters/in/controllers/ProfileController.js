class ProfileController {
  constructor(profileUseCases) {
    this.profileUseCases = profileUseCases;
  }

  getProfile = async (req, res) => {
    try {
      const profile = await this.profileUseCases.getProfile(req.session.userId);
      res.json(profile);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  updateProfile = async (req, res) => {
    try {
      const { nombre, telefono, nacimiento } = req.body;
      const profile = await this.profileUseCases.updateProfile(req.session.userId, { nombre, telefono, nacimiento });
      if (nombre) req.session.userName = nombre.trim();
      res.json({ ok: true, profile });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = ProfileController;

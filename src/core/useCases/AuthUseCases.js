const bcrypt = require('bcryptjs');

class AuthUseCases {
  constructor(userRepository) {
    this.userRepo = userRepository;
  }

  async register(nombre, email, password) {
    if (!nombre || !email || !password) {
      throw new Error('Todos los campos son obligatorios.');
    }
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const hash = bcrypt.hashSync(password, 10);
    const user = await this.userRepo.create(nombre, email, hash);
    if (!user) {
      throw new Error('Ya existe una cuenta con ese correo electrónico.');
    }
    return user;
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Correo y contraseña son obligatorios.');
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      throw new Error('Correo o contraseña incorrectos.');
    }
    return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
  }

  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new Error('Completa todos los campos.');
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      throw new Error('La nueva contraseña debe tener al menos 8 caracteres, mayúscula, minúscula, número y símbolo especial.');
    }

    const user = await this.userRepo.findById(userId);
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      throw new Error('La contraseña actual es incorrecta.');
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    await this.userRepo.updatePassword(userId, hash);
    return true;
  }
}

module.exports = AuthUseCases;

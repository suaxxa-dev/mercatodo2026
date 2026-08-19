class ProfileUseCases {
  constructor(userRepository) {
    this.userRepo = userRepository;
  }

  async getProfile(userId) {
    const profile = await this.userRepo.findById(userId);
    if (!profile) throw new Error('Usuario no encontrado.');
    return profile;
  }

  async updateProfile(userId, data) {
    await this.userRepo.updateProfile(userId, data);
    return await this.userRepo.findById(userId);
  }
}

module.exports = ProfileUseCases;

class AddressUseCases {
  constructor(addressRepository) {
    this.addressRepo = addressRepository;
  }

  async getAddresses(userId) {
    return await this.addressRepo.getAddresses(userId);
  }

  async addAddress(userId, data) {
    if (!data.nombre || !data.calle || !data.ciudad) {
      throw new Error('Nombre, calle y ciudad son obligatorios.');
    }
    await this.addressRepo.addAddress(userId, data);
    return await this.addressRepo.getAddresses(userId);
  }

  async updateAddress(userId, addressId, data) {
    if (!data.nombre || !data.calle || !data.ciudad) {
      throw new Error('Nombre, calle y ciudad son obligatorios.');
    }
    const result = await this.addressRepo.updateAddress(userId, parseInt(addressId, 10), data);
    if (!result.ok) throw new Error(result.error);
    return await this.addressRepo.getAddresses(userId);
  }

  async deleteAddress(userId, addressId) {
    const result = await this.addressRepo.deleteAddress(userId, parseInt(addressId, 10));
    if (!result.ok) throw new Error(result.error);
    return await this.addressRepo.getAddresses(userId);
  }
}

module.exports = AddressUseCases;

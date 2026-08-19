class CartUseCases {
  constructor(cartRepository) {
    this.cartRepo = cartRepository;
  }

  async getCart(userId) {
    return await this.cartRepo.getCart(userId);
  }

  async addToCart(userId, itemData) {
    const { id, nombre, precioNum, precioLabel, img } = itemData;
    if (!id || !nombre || precioNum == null || !precioLabel || !img) {
      throw new Error('Datos del producto incompletos.');
    }
    await this.cartRepo.addToCart(userId, { id, nombre, precioNum, precioLabel, img });
    return await this.cartRepo.getCart(userId);
  }

  async updateQuantity(userId, productoId, qty) {
    await this.cartRepo.updateCartQty(userId, productoId, parseInt(qty, 10));
    return await this.cartRepo.getCart(userId);
  }

  async removeFromCart(userId, productoId) {
    await this.cartRepo.removeFromCart(userId, productoId);
    return await this.cartRepo.getCart(userId);
  }
}

module.exports = CartUseCases;

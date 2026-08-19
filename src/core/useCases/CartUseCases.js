class CartUseCases {
  constructor(cartRepository, productRepository) {
    this.cartRepo = cartRepository;
    this.productRepo = productRepository;
  }

  async getCart(userId) {
    return await this.cartRepo.getCart(userId);
  }

  async addToCart(userId, itemData) {
    const { id, nombre, precioNum, precioLabel, img } = itemData;
    if (!id || !nombre || precioNum == null || !precioLabel || !img) {
      throw new Error('Datos del producto incompletos.');
    }

    // Validar stock disponible
    if (this.productRepo) {
      const baseId = id.split('::')[0];
      const prod = await this.productRepo.getById(baseId);
      if (prod) {
        const currentCart = await this.cartRepo.getCart(userId);
        const existingItem = currentCart.find(x => x.id === id);
        const currentQty = existingItem ? existingItem.qty : 0;
        if (currentQty + 1 > prod.stock) {
          throw new Error(`Stock insuficiente. Solo hay ${prod.stock} unidad(es) disponible(s) de este producto.`);
        }
      }
    }

    await this.cartRepo.addToCart(userId, { id, nombre, precioNum, precioLabel, img });
    return await this.cartRepo.getCart(userId);
  }

  async updateQuantity(userId, productoId, qty) {
    const newQty = parseInt(qty, 10);
    if (!newQty || newQty < 1) {
      await this.cartRepo.removeFromCart(userId, productoId);
      return await this.cartRepo.getCart(userId);
    }

    // Validar stock disponible
    if (this.productRepo) {
      const baseId = productoId.split('::')[0];
      const prod = await this.productRepo.getById(baseId);
      if (prod && newQty > prod.stock) {
        throw new Error(`Stock insuficiente. Solo hay ${prod.stock} unidad(es) disponible(s) de este producto.`);
      }
    }

    await this.cartRepo.updateCartQty(userId, productoId, newQty);
    return await this.cartRepo.getCart(userId);
  }

  async removeFromCart(userId, productoId) {
    await this.cartRepo.removeFromCart(userId, productoId);
    return await this.cartRepo.getCart(userId);
  }
}

module.exports = CartUseCases;

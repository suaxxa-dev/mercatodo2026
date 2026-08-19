class OrderUseCases {
  constructor(orderRepository, cartRepository) {
    this.orderRepo = orderRepository;
    this.cartRepo = cartRepository;
  }

  async createOrder(userId) {
    const cart = await this.cartRepo.getCart(userId);
    if (!cart || cart.length === 0) {
      throw new Error('El carrito está vacío.');
    }

    const total = cart.reduce((sum, item) => sum + item.precioNum * item.qty, 0);
    const roundedTotal = Math.round(total * 100) / 100;
    
    // Generate Code
    const n = Math.floor(10000 + Math.random() * 90000);
    const codigo = 'MT-' + n;

    const orderId = await this.orderRepo.createOrder(userId, cart, roundedTotal, codigo);
    await this.cartRepo.clearCart(userId);

    return { id: orderId, codigo, total: roundedTotal };
  }

  async getOrders(userId) {
    return await this.orderRepo.getOrders(userId);
  }

  async updateStatus(userId, orderId, estado) {
    if (!estado) throw new Error('Estado requerido');
    const result = await this.orderRepo.updateOrderStatus(userId, parseInt(orderId, 10), estado);
    if (!result.ok) throw new Error(result.error);
    return true;
  }
}

module.exports = OrderUseCases;

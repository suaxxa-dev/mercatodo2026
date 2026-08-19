class CartController {
  constructor(cartUseCases) {
    this.cartUseCases = cartUseCases;
  }

  getCart = async (req, res) => {
    try {
      const cart = await this.cartUseCases.getCart(req.session.userId);
      res.json(cart);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  addToCart = async (req, res) => {
    try {
      const cart = await this.cartUseCases.addToCart(req.session.userId, req.body);
      res.json({ ok: true, cart });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  updateQuantity = async (req, res) => {
    try {
      const { qty } = req.body;
      const cart = await this.cartUseCases.updateQuantity(req.session.userId, req.params.productoId, qty);
      res.json({ ok: true, cart });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  removeFromCart = async (req, res) => {
    try {
      const cart = await this.cartUseCases.removeFromCart(req.session.userId, req.params.productoId);
      res.json({ ok: true, cart });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = CartController;

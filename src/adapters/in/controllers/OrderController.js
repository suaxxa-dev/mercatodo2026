class OrderController {
  constructor(orderUseCases) {
    this.orderUseCases = orderUseCases;
  }

  createOrder = async (req, res) => {
    try {
      const order = await this.orderUseCases.createOrder(req.session.userId);
      res.status(201).json({ ok: true, order });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  getOrders = async (req, res) => {
    try {
      const orders = await this.orderUseCases.getOrders(req.session.userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  updateStatus = async (req, res) => {
    try {
      const { estado } = req.body;
      await this.orderUseCases.updateStatus(req.session.userId, req.params.id, estado);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = OrderController;

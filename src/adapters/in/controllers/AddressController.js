class AddressController {
  constructor(addressUseCases) {
    this.addressUseCases = addressUseCases;
  }

  getAddresses = async (req, res) => {
    try {
      const addresses = await this.addressUseCases.getAddresses(req.session.userId);
      res.json(addresses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  addAddress = async (req, res) => {
    try {
      const addresses = await this.addressUseCases.addAddress(req.session.userId, req.body);
      res.status(201).json({ ok: true, addresses });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  }

  updateAddress = async (req, res) => {
    try {
      const addresses = await this.addressUseCases.updateAddress(req.session.userId, req.params.id, req.body);
      res.json({ ok: true, addresses });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  }

  deleteAddress = async (req, res) => {
    try {
      const addresses = await this.addressUseCases.deleteAddress(req.session.userId, req.params.id);
      res.json({ ok: true, addresses });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  }
}

module.exports = AddressController;

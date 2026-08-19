class ProductController {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  getProducts = async (req, res) => {
    try {
      const { cat, categoria, search, marca } = req.query;
      const filterCat = cat || categoria;
      const products = await this.productRepository.getAll({
        categoria: filterCat,
        search,
        marca
      });
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  getProductById = async (req, res) => {
    try {
      const product = await this.productRepository.getById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ProductController;

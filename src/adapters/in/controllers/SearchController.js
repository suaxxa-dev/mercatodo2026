class SearchController {
  constructor(searchUseCases) {
    this.searchUseCases = searchUseCases;
  }

  search = async (req, res) => {
    try {
      const result = await this.searchUseCases.search(req.query.q, req.query.sku, req.query.limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message, results: [], sku_exact: null });
    }
  }
}

module.exports = SearchController;

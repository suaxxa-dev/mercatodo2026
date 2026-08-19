class SearchUseCases {
  constructor(searchAdapter) {
    this.searchAdapter = searchAdapter;
  }

  async search(q, sku, limitParam) {
    const query = (q || '').trim();
    const skuQuery = (sku || '').trim();
    const limit = Math.min(parseInt(limitParam, 10) || 8, 20);

    if (!query && !skuQuery) {
      return { ok: true, results: [], sku_exact: null };
    }

    return await this.searchAdapter.search(query, skuQuery, limit);
  }
}

module.exports = SearchUseCases;

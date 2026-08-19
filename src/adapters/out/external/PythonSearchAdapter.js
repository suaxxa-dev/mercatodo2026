const nodeSearchAdapter = require('./NodeSearchAdapter');

class PythonSearchAdapter {
  async search(q, sku, limit) {
    return await nodeSearchAdapter.search(q, sku, limit);
  }
}

module.exports = new PythonSearchAdapter();

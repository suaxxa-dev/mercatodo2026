const path = require('path');
const fs = require('fs');
const productRepository = require('../database/ProductRepository');

function normalize(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokenize(text) {
  const norm = normalize(text).trim();
  return norm ? norm.split(/\s+/).filter(Boolean) : [];
}

function scoreProduct(product, tokens, rawQuery) {
  let score = 0;
  const normNombre = normalize(product.nombre || '');
  const normCat = normalize(product.cat || product.categoria || '');
  const normSku = normalize(product.sku || '');
  const normQ = normalize(rawQuery);

  // SKU exacto
  if (normSku === normQ) score += 100;

  // Nombre empieza por la query
  if (normNombre.startsWith(normQ)) score += 50;

  // Nombre contiene la query completa
  if (normNombre.includes(normQ)) score += 30;

  // Puntuación por token
  for (const t of tokens) {
    if (normNombre.includes(t)) score += 10;
    if (normCat.includes(t)) score += 5;
    if (normSku.includes(t)) score += 2;
  }

  return score;
}

class NodeSearchAdapter {
  constructor() {
    this.fallbackProducts = null;
  }

  _loadFallbackCatalog() {
    if (this.fallbackProducts) return this.fallbackProducts;
    try {
      const jsonPath = path.join(__dirname, 'catalogo_data.json');
      if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        this.fallbackProducts = data.productos || [];
      }
    } catch {
      this.fallbackProducts = [];
    }
    return this.fallbackProducts || [];
  }

  async _getAllProducts() {
    try {
      const dbProducts = await productRepository.getAll();
      if (dbProducts && dbProducts.length > 0) {
        return dbProducts.map(p => ({
          id: p.id,
          nombre: p.nombre,
          precioLabel: p.precio_label || p.precioLabel || (`$ ${new Intl.NumberFormat('es-CO').format(p.precio)}`),
          precio: p.precio,
          img: p.img,
          cat: (p.categoria || 'tecnologia').toUpperCase(),
          categoria: p.categoria,
          sku: p.sku || `SKU-${p.id.toUpperCase().slice(0, 8)}`,
          stock: p.stock
        }));
      }
    } catch (err) {
      console.warn('[NodeSearchAdapter] Fallback a JSON debido a:', err.message);
    }
    return this._loadFallbackCatalog();
  }

  async search(q, sku, limit = 8) {
    const catalog = await this._getAllProducts();
    const cleanLimit = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 30);
    let results = [];
    let skuExact = null;

    // 1. Búsqueda por SKU exacto
    if (sku && sku.trim()) {
      const normSkuQuery = normalize(sku.trim());
      for (const p of catalog) {
        if (normalize(p.sku) === normSkuQuery) {
          skuExact = p;
          break;
        }
      }
    }

    // 2. Búsqueda por texto libre
    if (q && q.trim()) {
      const rawQ = q.trim();
      const tokens = tokenize(rawQ);

      if (tokens.length > 0) {
        // Filtrar candidatos con al menos 1 coincidencia en nombre, categoría o SKU
        const candidates = [];
        for (const p of catalog) {
          const normNombre = normalize(p.nombre || '');
          const normCat = normalize(p.cat || p.categoria || '');
          const normSku = normalize(p.sku || '');

          const hit = tokens.some(t =>
            normNombre.includes(t) || normCat.includes(t) || normSku.includes(t)
          );

          if (hit) {
            candidates.push(p);
          }
        }

        // Puntuación y ordenamiento
        const scored = candidates.map(p => ({
          score: scoreProduct(p, tokens, rawQ),
          product: p
        }));

        scored.sort((a, b) => b.score - a.score);
        results = scored.slice(0, cleanLimit).map(s => s.product);
      }
    }

    // Si hay coincidencia de SKU exacto y no está en resultados, anteponerlo
    if (skuExact && !results.some(p => p.id === skuExact.id)) {
      results.unshift(skuExact);
      results = results.slice(0, cleanLimit);
    }

    return {
      ok: true,
      results,
      sku_exact: skuExact
    };
  }
}

module.exports = new NodeSearchAdapter();

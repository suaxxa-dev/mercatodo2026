const { spawn } = require('child_process');
const path = require('path');

class PythonSearchAdapter {
  search(q, sku, limit) {
    return new Promise((resolve, reject) => {
      const params = JSON.stringify({ q, sku, limit });
      const pyPath = path.join(__dirname, 'search.py');
      const py = spawn('python', [pyPath, params]);

      let stdout = '';
      let stderr = '';

      py.stdout.on('data', chunk => { stdout += chunk; });
      py.stderr.on('data', chunk => { stderr += chunk; });

      const timer = setTimeout(() => {
        py.kill();
        resolve({ ok: false, error: 'Timeout en motor de búsqueda', results: [], sku_exact: null });
      }, 5000);

      py.on('close', code => {
        clearTimeout(timer);
        try {
          const data = JSON.parse(stdout);
          resolve(data);
        } catch {
          console.error('[search.py stderr]', stderr);
          resolve({ ok: false, error: 'Error en motor de búsqueda', results: [], sku_exact: null });
        }
      });
    });
  }
}

module.exports = new PythonSearchAdapter();

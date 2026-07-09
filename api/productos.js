/* =========================================================
   OVERDRIVE — API /api/productos (Vercel)
   GET  → catálogo (público)
   PUT  → reemplaza el catálogo (solo admin)
   ========================================================= */
const { leerBD, guardarBD, CLAVE_ADMIN } = require('../lib/db.js');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const bd = await leerBD();
    return res.status(200).json(bd.productos);
  }

  if (req.method === 'PUT') {
    if (req.headers['x-clave-admin'] !== CLAVE_ADMIN) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const lista = req.body;
    if (!Array.isArray(lista)) {
      return res.status(400).json({ error: 'Se esperaba una lista' });
    }
    const bd = await leerBD();
    bd.productos = lista;
    await guardarBD(bd);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Método no permitido' });
};

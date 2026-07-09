/* =========================================================
   OVERDRIVE — API /api/login (Vercel)
   POST → valida la contraseña del panel de administración
   ========================================================= */
const { CLAVE_ADMIN } = require('../lib/db.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const { clave } = req.body || {};
  if (clave === CLAVE_ADMIN) {
    return res.status(200).json({ ok: true });
  }
  res.status(401).json({ error: 'Contraseña incorrecta' });
};

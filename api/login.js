/* =========================================================
   OVERDRIVE — API /api/login (Vercel)
   POST → valida la contraseña del panel de administración

   Seguridad: máximo 8 intentos fallidos por IP cada 10 minutos
   (protege contra ataques de fuerza bruta) y comparación de la
   clave en tiempo constante.
   ========================================================= */
const { cuerpoJSON, claveValida, ipDe, demasiadosEventos, registrarEvento } = require('../lib/db.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const ip = ipDe(req);
  if (await demasiadosEventos('login', ip, 8)) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera 10 minutos y vuelve a probar.' });
  }

  const { clave } = cuerpoJSON(req) || {};
  if (claveValida(clave)) {
    return res.status(200).json({ ok: true });
  }

  await registrarEvento('login', ip, 600);
  res.status(401).json({ error: 'Contraseña incorrecta' });
};

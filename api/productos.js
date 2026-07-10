/* =========================================================
   OVERDRIVE — API /api/productos (Vercel)
   GET  → catálogo (público)
   PUT  → reemplaza el catálogo (solo admin)

   Seguridad: la clave de admin se compara en tiempo constante,
   los intentos con clave errada cuentan para el bloqueo por IP,
   y todo el catálogo pasa por el validador antes de guardarse.
   ========================================================= */
const { leerBD, guardarBD, cuerpoJSON, claveValida, ipDe, demasiadosEventos, registrarEvento } = require('../lib/db.js');
const { sanearProductos } = require('../lib/validar.js');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const bd = await leerBD();
    return res.status(200).json(bd.productos);
  }

  if (req.method === 'PUT') {
    const ip = ipDe(req);
    if (await demasiadosEventos('login', ip, 8)) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera 10 minutos.' });
    }
    if (!claveValida(req.headers['x-clave-admin'])) {
      await registrarEvento('login', ip, 600);
      return res.status(401).json({ error: 'No autorizado' });
    }

    const resultado = sanearProductos(cuerpoJSON(req));
    if (resultado.error) {
      return res.status(400).json({ error: resultado.error });
    }

    const bd = await leerBD();
    bd.productos = resultado.productos;
    await guardarBD(bd);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Método no permitido' });
};

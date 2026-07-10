/* =========================================================
   OVERDRIVE — API /api/mensajes (Vercel)
   POST   → guarda un mensaje del formulario (público)
   GET    → lista los mensajes (solo admin)
   DELETE → borra un mensaje por id (solo admin)

   Seguridad: cada mensaje pasa por el validador, se aceptan
   máximo 5 mensajes por IP cada 10 minutos (anti-spam) y la
   bandeja guarda máximo 200 mensajes (los más antiguos salen).
   ========================================================= */
const { leerBD, guardarBD, cuerpoJSON, claveValida, ipDe, demasiadosEventos, registrarEvento } = require('../lib/db.js');
const { sanearMensaje } = require('../lib/validar.js');

const MAX_MENSAJES_GUARDADOS = 200;

module.exports = async (req, res) => {
  const ip = ipDe(req);

  if (req.method === 'POST') {
    if (await demasiadosEventos('mensajes', ip, 5)) {
      return res.status(429).json({ error: 'Has enviado demasiados mensajes seguidos. Espera unos minutos.' });
    }

    const resultado = sanearMensaje(cuerpoJSON(req));
    if (resultado.error) {
      return res.status(400).json({ error: resultado.error });
    }

    const bd = await leerBD();
    bd.mensajes.unshift({
      id: Date.now(),
      ...resultado.mensaje,
      fecha: new Date().toLocaleString('es-CL')
    });
    bd.mensajes = bd.mensajes.slice(0, MAX_MENSAJES_GUARDADOS);
    await guardarBD(bd);
    await registrarEvento('mensajes', ip, 600);
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'GET') {
    if (await demasiadosEventos('login', ip, 8)) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera 10 minutos.' });
    }
    if (!claveValida(req.headers['x-clave-admin'])) {
      await registrarEvento('login', ip, 600);
      return res.status(401).json({ error: 'No autorizado' });
    }
    const bd = await leerBD();
    return res.status(200).json(bd.mensajes);
  }

  if (req.method === 'DELETE') {
    if (await demasiadosEventos('login', ip, 8)) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera 10 minutos.' });
    }
    if (!claveValida(req.headers['x-clave-admin'])) {
      await registrarEvento('login', ip, 600);
      return res.status(401).json({ error: 'No autorizado' });
    }
    const id = Number(req.query.id);
    const bd = await leerBD();
    bd.mensajes = bd.mensajes.filter(m => m.id !== id);
    await guardarBD(bd);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Método no permitido' });
};

/* =========================================================
   OVERDRIVE — API /api/mensajes (Vercel)
   POST   → guarda un mensaje del formulario (público)
   GET    → lista los mensajes (solo admin)
   DELETE → borra un mensaje por id (solo admin)
   ========================================================= */
const { leerBD, guardarBD, CLAVE_ADMIN } = require('../lib/db.js');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const m = req.body || {};
    if (!m.nombre || !m.correo || !m.telefono || !m.mensaje) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    const bd = await leerBD();
    bd.mensajes.unshift({
      id: Date.now(),
      nombre: String(m.nombre).slice(0, 120),
      correo: String(m.correo).slice(0, 120),
      telefono: String(m.telefono).slice(0, 40),
      productos: Array.isArray(m.productos)
        ? m.productos.map(p => String(p).slice(0, 120))
        : ['Consulta general'],
      mensaje: String(m.mensaje).slice(0, 2000),
      fecha: new Date().toLocaleString('es-CL')
    });
    await guardarBD(bd);
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'GET') {
    if (req.headers['x-clave-admin'] !== CLAVE_ADMIN) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const bd = await leerBD();
    return res.status(200).json(bd.mensajes);
  }

  if (req.method === 'DELETE') {
    if (req.headers['x-clave-admin'] !== CLAVE_ADMIN) {
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

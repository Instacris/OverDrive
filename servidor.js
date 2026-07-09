/* =========================================================
   GRITO NEGRO — Servidor con base de datos
   Uso: node servidor.js  →  http://localhost:4173

   Sirve la página y además expone una API REST cuya
   información vive en el archivo "datos.json" (la base de
   datos). Así los cambios del panel de administración los
   ven TODOS los visitantes, desde cualquier dispositivo
   conectado al servidor.
   ========================================================= */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { PRODUCTOS_INICIALES } = require('./js/catalogo-inicial.js');

const PUERTO = 4173;
const RAIZ = __dirname;
const RUTA_BD = path.join(RAIZ, 'datos.json');

/* Contraseña del panel de administración (vive solo en el servidor) */
const CLAVE_ADMIN = 'fantasma123';

/* ---------- Base de datos (archivo datos.json) ---------- */
function leerBD() {
  try {
    return JSON.parse(fs.readFileSync(RUTA_BD, 'utf8'));
  } catch {
    const inicial = { productos: PRODUCTOS_INICIALES, mensajes: [] };
    guardarBD(inicial);
    return inicial;
  }
}

function guardarBD(datos) {
  fs.writeFileSync(RUTA_BD, JSON.stringify(datos, null, 2), 'utf8');
}

/* ---------- Utilidades HTTP ---------- */
function responderJSON(respuesta, codigo, datos) {
  respuesta.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' });
  respuesta.end(JSON.stringify(datos));
}

function leerCuerpo(peticion) {
  return new Promise((resolver, rechazar) => {
    let cuerpo = '';
    peticion.on('data', trozo => {
      cuerpo += trozo;
      if (cuerpo.length > 1e6) { rechazar(new Error('Cuerpo demasiado grande')); peticion.destroy(); }
    });
    peticion.on('end', () => {
      try { resolver(cuerpo ? JSON.parse(cuerpo) : {}); }
      catch { rechazar(new Error('JSON inválido')); }
    });
  });
}

function esAdmin(peticion) {
  return peticion.headers['x-clave-admin'] === CLAVE_ADMIN;
}

/* ---------- API ---------- */
async function manejarAPI(peticion, respuesta, ruta, consulta) {
  // Iniciar sesión del administrador
  if (ruta === '/api/login' && peticion.method === 'POST') {
    const { clave } = await leerCuerpo(peticion);
    if (clave === CLAVE_ADMIN) return responderJSON(respuesta, 200, { ok: true });
    return responderJSON(respuesta, 401, { error: 'Contraseña incorrecta' });
  }

  // Catálogo: leer (público) y reemplazar (solo admin)
  if (ruta === '/api/productos' && peticion.method === 'GET') {
    return responderJSON(respuesta, 200, leerBD().productos);
  }
  if (ruta === '/api/productos' && peticion.method === 'PUT') {
    if (!esAdmin(peticion)) return responderJSON(respuesta, 401, { error: 'No autorizado' });
    const lista = await leerCuerpo(peticion);
    if (!Array.isArray(lista)) return responderJSON(respuesta, 400, { error: 'Se esperaba una lista' });
    const bd = leerBD();
    bd.productos = lista;
    guardarBD(bd);
    return responderJSON(respuesta, 200, { ok: true });
  }

  // Mensajes: enviar (público), leer y borrar (solo admin)
  if (ruta === '/api/mensajes' && peticion.method === 'POST') {
    const m = await leerCuerpo(peticion);
    if (!m.nombre || !m.correo || !m.telefono || !m.mensaje) {
      return responderJSON(respuesta, 400, { error: 'Faltan campos obligatorios' });
    }
    const bd = leerBD();
    bd.mensajes.unshift({
      id: Date.now(),
      nombre: String(m.nombre).slice(0, 120),
      correo: String(m.correo).slice(0, 120),
      telefono: String(m.telefono).slice(0, 40),
      productos: Array.isArray(m.productos) ? m.productos.map(p => String(p).slice(0, 120)) : ['Consulta general'],
      mensaje: String(m.mensaje).slice(0, 2000),
      fecha: new Date().toLocaleString('es-CL')
    });
    guardarBD(bd);
    return responderJSON(respuesta, 201, { ok: true });
  }
  if (ruta === '/api/mensajes' && peticion.method === 'GET') {
    if (!esAdmin(peticion)) return responderJSON(respuesta, 401, { error: 'No autorizado' });
    return responderJSON(respuesta, 200, leerBD().mensajes);
  }
  if (ruta === '/api/mensajes' && peticion.method === 'DELETE') {
    if (!esAdmin(peticion)) return responderJSON(respuesta, 401, { error: 'No autorizado' });
    const id = Number(consulta.get('id'));
    const bd = leerBD();
    bd.mensajes = bd.mensajes.filter(m => m.id !== id);
    guardarBD(bd);
    return responderJSON(respuesta, 200, { ok: true });
  }

  responderJSON(respuesta, 404, { error: 'Ruta de API no encontrada' });
}

/* ---------- Archivos estáticos ---------- */
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon'
};

function servirArchivo(respuesta, ruta) {
  let archivo = path.normalize(path.join(RAIZ, ruta === '/' ? 'index.html' : ruta));

  // URLs limpias (igual que en Vercel): /admin sirve admin.html
  if (!fs.existsSync(archivo) && !path.extname(archivo) && fs.existsSync(archivo + '.html')) {
    archivo += '.html';
  }

  if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
    respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    respuesta.end('404 — No encontrado');
    return;
  }

  respuesta.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(archivo).pipe(respuesta);
}

/* ---------- Servidor ---------- */
http.createServer(async (peticion, respuesta) => {
  const url = new URL(peticion.url, `http://localhost:${PUERTO}`);
  const ruta = decodeURIComponent(url.pathname);

  try {
    if (ruta.startsWith('/api/')) {
      await manejarAPI(peticion, respuesta, ruta, url.searchParams);
    } else {
      servirArchivo(respuesta, ruta);
    }
  } catch (error) {
    responderJSON(respuesta, 500, { error: error.message });
  }
}).listen(PUERTO, () => {
  console.log(`Overdrive corriendo en http://localhost:${PUERTO}`);
  console.log(`Base de datos: ${RUTA_BD}`);
});

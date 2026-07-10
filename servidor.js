/* =========================================================
   OVERDRIVE — Servidor local con base de datos
   Uso: node servidor.js  →  http://localhost:4173

   Sirve la página y expone la misma API que Vercel, con las
   mismas capas de seguridad: cabeceras protectoras, validación
   de datos y límite de intentos de login por IP. La información
   vive en el archivo "datos.json" (solo para pruebas locales).
   ========================================================= */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PRODUCTOS_INICIALES } = require('./js/catalogo-inicial.js');
const { sanearProductos, sanearMensaje } = require('./lib/validar.js');

const PUERTO = 4173;
const RAIZ = __dirname;
const RUTA_BD = path.join(RAIZ, 'datos.json');
const MAX_MENSAJES_GUARDADOS = 200;

/* Contraseña del panel de administración (vive solo en el servidor) */
const CLAVE_ADMIN = 'fantasma123';

/* ---------- Cabeceras de seguridad (las mismas que en Vercel) ---------- */
const CABECERAS_SEGURIDAD = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data:; " +
    "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};

/* ---------- Seguridad: comparación en tiempo constante ---------- */
function claveValida(entrada) {
  const a = Buffer.from(String(entrada ?? ''));
  const b = Buffer.from(CLAVE_ADMIN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- Seguridad: límite de intentos por IP (en memoria) ---------- */
const eventos = new Map();

function demasiadosEventos(tipo, ip, maximo) {
  const registro = eventos.get(`${tipo}:${ip}`);
  if (!registro || Date.now() > registro.expira) return false;
  return registro.n >= maximo;
}

function registrarEvento(tipo, ip, ventanaSegundos) {
  const clave = `${tipo}:${ip}`;
  const registro = eventos.get(clave);
  if (!registro || Date.now() > registro.expira) {
    eventos.set(clave, { n: 1, expira: Date.now() + ventanaSegundos * 1000 });
  } else {
    registro.n++;
  }
}

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
  respuesta.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    ...CABECERAS_SEGURIDAD
  });
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

function ipDe(peticion) {
  return peticion.socket.remoteAddress || 'desconocida';
}

/* ---------- API ---------- */
async function manejarAPI(peticion, respuesta, ruta, consulta) {
  const ip = ipDe(peticion);

  // Iniciar sesión del administrador (con límite de intentos)
  if (ruta === '/api/login' && peticion.method === 'POST') {
    if (demasiadosEventos('login', ip, 8)) {
      return responderJSON(respuesta, 429, { error: 'Demasiados intentos. Espera 10 minutos y vuelve a probar.' });
    }
    const { clave } = await leerCuerpo(peticion);
    if (claveValida(clave)) return responderJSON(respuesta, 200, { ok: true });
    registrarEvento('login', ip, 600);
    return responderJSON(respuesta, 401, { error: 'Contraseña incorrecta' });
  }

  // Catálogo: leer (público) y reemplazar (solo admin, con validación)
  if (ruta === '/api/productos' && peticion.method === 'GET') {
    return responderJSON(respuesta, 200, leerBD().productos);
  }
  if (ruta === '/api/productos' && peticion.method === 'PUT') {
    if (demasiadosEventos('login', ip, 8)) {
      return responderJSON(respuesta, 429, { error: 'Demasiados intentos. Espera 10 minutos.' });
    }
    if (!claveValida(peticion.headers['x-clave-admin'])) {
      registrarEvento('login', ip, 600);
      return responderJSON(respuesta, 401, { error: 'No autorizado' });
    }
    const resultado = sanearProductos(await leerCuerpo(peticion));
    if (resultado.error) return responderJSON(respuesta, 400, { error: resultado.error });
    const bd = leerBD();
    bd.productos = resultado.productos;
    guardarBD(bd);
    return responderJSON(respuesta, 200, { ok: true });
  }

  // Mensajes: enviar (público, anti-spam), leer y borrar (solo admin)
  if (ruta === '/api/mensajes' && peticion.method === 'POST') {
    if (demasiadosEventos('mensajes', ip, 5)) {
      return responderJSON(respuesta, 429, { error: 'Has enviado demasiados mensajes seguidos. Espera unos minutos.' });
    }
    const resultado = sanearMensaje(await leerCuerpo(peticion));
    if (resultado.error) return responderJSON(respuesta, 400, { error: resultado.error });
    const bd = leerBD();
    bd.mensajes.unshift({
      id: Date.now(),
      ...resultado.mensaje,
      fecha: new Date().toLocaleString('es-CL')
    });
    bd.mensajes = bd.mensajes.slice(0, MAX_MENSAJES_GUARDADOS);
    guardarBD(bd);
    registrarEvento('mensajes', ip, 600);
    return responderJSON(respuesta, 201, { ok: true });
  }
  if (ruta === '/api/mensajes' && peticion.method === 'GET') {
    if (demasiadosEventos('login', ip, 8)) {
      return responderJSON(respuesta, 429, { error: 'Demasiados intentos. Espera 10 minutos.' });
    }
    if (!claveValida(peticion.headers['x-clave-admin'])) {
      registrarEvento('login', ip, 600);
      return responderJSON(respuesta, 401, { error: 'No autorizado' });
    }
    return responderJSON(respuesta, 200, leerBD().mensajes);
  }
  if (ruta === '/api/mensajes' && peticion.method === 'DELETE') {
    if (demasiadosEventos('login', ip, 8)) {
      return responderJSON(respuesta, 429, { error: 'Demasiados intentos. Espera 10 minutos.' });
    }
    if (!claveValida(peticion.headers['x-clave-admin'])) {
      registrarEvento('login', ip, 600);
      return responderJSON(respuesta, 401, { error: 'No autorizado' });
    }
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
    // Página 404 personalizada (la misma que usa Vercel)
    const pagina404 = path.join(RAIZ, '404.html');
    if (fs.existsSync(pagina404)) {
      respuesta.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...CABECERAS_SEGURIDAD });
      fs.createReadStream(pagina404).pipe(respuesta);
    } else {
      respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...CABECERAS_SEGURIDAD });
      respuesta.end('404 — No encontrado');
    }
    return;
  }

  respuesta.writeHead(200, {
    'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream',
    ...CABECERAS_SEGURIDAD
  });
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

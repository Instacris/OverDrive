/* =========================================================
   OVERDRIVE — Conexión a la base de datos en la nube
   La usan las funciones de /api/ cuando el sitio corre en Vercel.
   Guarda TODO el estado (productos + mensajes) como un único
   objeto JSON en Redis Cloud (integración de Vercel Storage).
   ========================================================= */
const Redis = require('ioredis');
const { PRODUCTOS_INICIALES } = require('../js/catalogo-inicial.js');

/* Vercel inyecta esta variable al conectar la base de datos
   (integración "Redis" / Redis Cloud, pestaña Storage). */
const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error(
    'Falta la base de datos: conecta un almacén Redis en Vercel ' +
    '(pestaña Storage) y vuelve a desplegar.'
  );
}

const CLAVE_DB = 'overdrive:db';

/* Contraseña del panel. En Vercel se define como variable de
   entorno CLAVE_ADMIN; si no, usa este valor por defecto. */
const CLAVE_ADMIN = process.env.CLAVE_ADMIN || 'fantasma123';

/* Reutilizamos la misma conexión entre invocaciones de una función
   "tibia" (evita abrir una conexión nueva en cada petición, lo que
   agotaría rápido el límite de conexiones del plan gratuito). */
let cliente = null;
function obtenerCliente() {
  if (!cliente) {
    cliente = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 8000
    });
    cliente.on('error', () => {}); // Evita que un error de red tumbe el proceso
  }
  return cliente;
}

async function leerBD() {
  const redis = obtenerCliente();
  const crudo = await redis.get(CLAVE_DB);

  let datos = null;
  try {
    datos = crudo ? JSON.parse(crudo) : null;
  } catch { /* datos corruptos: se regeneran abajo */ }

  if (!datos || !Array.isArray(datos.productos)) {
    datos = { productos: PRODUCTOS_INICIALES, mensajes: [] };
    await redis.set(CLAVE_DB, JSON.stringify(datos));
  }
  return datos;
}

async function guardarBD(datos) {
  const redis = obtenerCliente();
  await redis.set(CLAVE_DB, JSON.stringify(datos));
}

module.exports = { leerBD, guardarBD, CLAVE_ADMIN };

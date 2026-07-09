/* =========================================================
   OVERDRIVE — Conexión a la base de datos en la nube
   La usan las funciones de /api/ cuando el sitio corre en Vercel.
   Guarda TODO el estado (productos + mensajes) como un único
   objeto JSON en Upstash Redis (base de datos gratuita de Vercel).
   ========================================================= */
const { Redis } = require('@upstash/redis');
const { PRODUCTOS_INICIALES } = require('../js/catalogo-inicial.js');

/* Vercel inyecta estas variables al conectar la base de datos.
   Aceptamos ambos nombres posibles (KV_* o UPSTASH_*) para que
   funcione sin importar cómo las nombre Vercel. */
const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error(
    'Falta la base de datos: conecta un almacén Redis (Upstash) en Vercel ' +
    '(pestaña Storage) y vuelve a desplegar.'
  );
}

const redis = new Redis({ url, token });
const CLAVE_DB = 'overdrive:db';

/* Contraseña del panel. En Vercel se define como variable de
   entorno CLAVE_ADMIN; si no, usa este valor por defecto. */
const CLAVE_ADMIN = process.env.CLAVE_ADMIN || 'fantasma123';

async function leerBD() {
  let datos = await redis.get(CLAVE_DB);
  if (!datos || !Array.isArray(datos.productos)) {
    datos = { productos: PRODUCTOS_INICIALES, mensajes: [] };
    await redis.set(CLAVE_DB, datos);
  }
  return datos;
}

async function guardarBD(datos) {
  await redis.set(CLAVE_DB, datos);
}

module.exports = { leerBD, guardarBD, CLAVE_ADMIN };

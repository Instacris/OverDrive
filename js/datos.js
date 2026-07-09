/* =========================================================
   GRITO NEGRO — Capa de datos compartida (tienda + admin)

   Modo normal: habla con la API del servidor (node servidor.js),
   cuya información vive en la base de datos "datos.json". Así los
   cambios del administrador los ven todos los visitantes.

   Modo respaldo: si la página se abre sin servidor (doble clic al
   archivo), todo sigue funcionando con localStorage en este navegador.
   ========================================================= */

const CLAVE_PRODUCTOS = 'gritonegro_productos_v2';
const CLAVE_MENSAJES  = 'gritonegro_mensajes_v1';
const CLAVE_SESION    = 'gritonegro_sesion_admin';

/* Contraseña usada SOLO en modo respaldo sin servidor.
   Con servidor, la contraseña real vive en servidor.js */
const CLAVE_ADMIN_LOCAL = 'fantasma123';

let modoLocal = false; // Se activa solo si la API no responde

async function llamarAPI(ruta, opciones = {}) {
  const respuesta = await fetch(ruta, {
    ...opciones,
    // Las cabeceras van DESPUÉS de ...opciones para que la mezcla
    // (Content-Type + clave de admin) no se pierda. Sin Content-Type,
    // Vercel no interpreta el cuerpo JSON y el guardado falla.
    headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) }
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    throw new Error(cuerpo.error || `Error ${respuesta.status}`);
  }
  return respuesta.json();
}

function cabeceraAdmin() {
  return { 'x-clave-admin': sessionStorage.getItem(CLAVE_SESION) || '' };
}

/* ---------- Sesión de administrador ---------- */
async function iniciarSesionAdmin(clave) {
  if (!modoLocal) {
    try {
      await llamarAPI('/api/login', { method: 'POST', body: JSON.stringify({ clave }) });
      sessionStorage.setItem(CLAVE_SESION, clave);
      return true;
    } catch (error) {
      if (error.message.includes('incorrecta')) return false;
      modoLocal = true; // El servidor no está disponible: pasamos a modo local
    }
  }
  if (clave === CLAVE_ADMIN_LOCAL) {
    sessionStorage.setItem(CLAVE_SESION, clave);
    return true;
  }
  return false;
}

function haySesion() {
  return Boolean(sessionStorage.getItem(CLAVE_SESION));
}

function cerrarSesion() {
  sessionStorage.removeItem(CLAVE_SESION);
}

/* ---------- Productos ---------- */
async function obtenerProductos() {
  if (!modoLocal) {
    try {
      return await llamarAPI('/api/productos');
    } catch {
      modoLocal = true;
    }
  }
  return obtenerProductosLocal();
}

async function guardarProductos(lista) {
  if (!modoLocal) {
    try {
      await llamarAPI('/api/productos', {
        method: 'PUT',
        headers: cabeceraAdmin(),
        body: JSON.stringify(lista)
      });
      return;
    } catch (error) {
      if (error.message.includes('autorizado')) throw error;
      modoLocal = true;
    }
  }
  localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(lista));
}

async function restaurarCatalogo() {
  await guardarProductos(PRODUCTOS_INICIALES);
}

/* ---------- Mensajes del formulario de contacto ---------- */
async function enviarMensaje(datos) {
  if (!modoLocal) {
    try {
      await llamarAPI('/api/mensajes', { method: 'POST', body: JSON.stringify(datos) });
      return;
    } catch (error) {
      if (error.message.includes('obligatorios')) throw error;
      modoLocal = true;
    }
  }
  const mensajes = obtenerMensajesLocal();
  mensajes.unshift({ id: Date.now(), fecha: new Date().toLocaleString('es-CL'), ...datos });
  localStorage.setItem(CLAVE_MENSAJES, JSON.stringify(mensajes));
}

async function obtenerMensajes() {
  if (!modoLocal) {
    try {
      return await llamarAPI('/api/mensajes', { headers: cabeceraAdmin() });
    } catch (error) {
      if (error.message.includes('autorizado')) throw error;
      modoLocal = true;
    }
  }
  return obtenerMensajesLocal();
}

async function borrarMensaje(id) {
  if (!modoLocal) {
    try {
      await llamarAPI(`/api/mensajes?id=${id}`, { method: 'DELETE', headers: cabeceraAdmin() });
      return;
    } catch (error) {
      if (error.message.includes('autorizado')) throw error;
      modoLocal = true;
    }
  }
  const mensajes = obtenerMensajesLocal().filter(m => m.id !== id);
  localStorage.setItem(CLAVE_MENSAJES, JSON.stringify(mensajes));
}

/* ---------- Respaldo local (sin servidor) ---------- */
function obtenerProductosLocal() {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE_PRODUCTOS));
    if (Array.isArray(lista)) return lista;
  } catch { /* datos corruptos: se regeneran */ }
  localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(PRODUCTOS_INICIALES));
  return structuredClone(PRODUCTOS_INICIALES);
}

function obtenerMensajesLocal() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_MENSAJES)) || [];
  } catch {
    return [];
  }
}

/* ---------- Utilidades ---------- */
function precioFinal(producto) {
  return Math.round(producto.precio * (1 - producto.oferta / 100));
}

function formatoCLP(valor) {
  return '$' + Number(valor).toLocaleString('es-CL');
}

function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = String(texto ?? '');
  return div.innerHTML;
}

/* Devuelve la imagen del producto (foto si tiene, dibujo SVG si no) */
function figuraProducto(p, clase = '') {
  if (p.imagen) {
    return `<img src="${escaparHTML(p.imagen)}" alt="${escaparHTML(p.nombre)}" class="${clase}" loading="lazy">`;
  }
  return iconoSVG(p.icono);
}

/* ---------- Iconos SVG (respaldo para productos sin foto) ---------- */
function iconoSVG(tipo) {
  switch (tipo) {
    case 'tunica':
      return `
      <svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M60 6 C38 6 28 26 27 46 L14 142 L106 142 L93 46 C92 26 82 6 60 6Z"
              fill="#1a1a21" stroke="#34343f" stroke-width="2"/>
        <ellipse cx="60" cy="42" rx="19" ry="24" fill="#050507"/>
        <path d="M60 24 C51 24 47 32 47.5 41 C48 51 53 60 60 64 C67 60 72 51 72.5 41 C73 32 69 24 60 24Z" fill="#e8e8e2"/>
        <path d="M54 37 C51.5 39.5 52 44.5 54.5 46 C56.5 45 57 40 55.8 37.4 C55.2 36 54.8 36.6 54 37Z" fill="#0a0a0d"/>
        <path d="M66 37 C68.5 39.5 68 44.5 65.5 46 C63.5 45 63 40 64.2 37.4 C64.8 36 65.2 36.6 66 37Z" fill="#0a0a0d"/>
        <path d="M60 49 C57.5 51 57 57 58.5 61 C59 62.6 61 62.6 61.5 61 C63 57 62.5 51 60 49Z" fill="#0a0a0d"/>
        <path d="M30 96 L90 96 L91 106 L29 106Z" fill="#0d0d11" stroke="#34343f" stroke-width="1.5"/>
      </svg>`;
    case 'guantes':
      return `
      <svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M42 138 L42 74 C42 70 40 66 36 62 L26 51 C22 46 25 39 31 40 C34 40.5 36 43 38 45.5 L46 55 L46 26 C46 18 58 18 58 26 L58 50 L64 50 L64 20 C64 12 76 12 76 20 L76 50 L82 50 L82 26 C82 19 93 19 93 26 L93 88 C93 104 86 112 82 120 L82 138 Z"
              fill="#1a1a21" stroke="#34343f" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M42 118 L82 118" stroke="#e11d2e" stroke-width="3"/>
      </svg>`;
    case 'cuchillo':
      return `
      <svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M60 8 C74 30 76 58 74 84 L58 84 C52 56 52 30 60 8Z"
              fill="#c9ccd4" stroke="#8f939e" stroke-width="1.5"/>
        <path d="M60 12 C60 40 59 62 59 82 L61 82 C62 60 63 38 60 12Z" fill="#8f939e"/>
        <rect x="50" y="84" width="30" height="8" rx="3" fill="#34343f"/>
        <rect x="56" y="92" width="18" height="48" rx="6" fill="#1a1a21" stroke="#34343f" stroke-width="2"/>
        <path d="M58 102 L74 102 M58 112 L74 112 M58 122 L74 122" stroke="#34343f" stroke-width="2"/>
      </svg>`;
    case 'mascara':
    default:
      return `
      <svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M60 6 C29 6 15 33 17 65 C19 99 37 133 60 145 C83 133 101 99 103 65 C105 33 91 6 60 6Z"
              fill="#e8e8e2" stroke="#c4c4bc" stroke-width="1.5"/>
        <path d="M39 50 C31 58 32 75 40 79 C47 76 49 59 45 49 C43 44 42 47 39 50Z" fill="#0a0a0d"/>
        <path d="M81 50 C89 58 88 75 80 79 C73 76 71 59 75 49 C77 44 78 47 81 50Z" fill="#0a0a0d"/>
        <path d="M60 86 C52 92 50 113 55 128 C57 134 63 134 65 128 C70 113 68 92 60 86Z" fill="#0a0a0d"/>
        <path d="M46 42 C48 38 52 36 55 37 M74 42 C72 38 68 36 65 37" stroke="#0a0a0d" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      </svg>`;
  }
}

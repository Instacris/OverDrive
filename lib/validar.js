/* =========================================================
   OVERDRIVE — Validación de datos (capa de seguridad)
   La usan el servidor local (servidor.js) y las funciones de
   Vercel (api/*.js). Revisa y limpia TODO lo que llega de
   afuera antes de guardarlo en la base de datos: así nadie
   puede inyectar datos malformados, gigantes o maliciosos.
   ========================================================= */

const CATEGORIAS_VALIDAS = ['Máscara', 'Uniforme', 'Accesorio'];
const ICONOS_VALIDOS = ['mascara', 'tunica', 'guantes', 'cuchillo'];

/* Revisa el catálogo completo que envía el panel de administración.
   Devuelve { productos } con los datos limpios, o { error } si algo
   no cumple las reglas. */
function sanearProductos(lista) {
  if (!Array.isArray(lista)) return { error: 'Se esperaba una lista de productos' };
  if (lista.length === 0) return { error: 'El catálogo no puede quedar vacío' };
  if (lista.length > 100) return { error: 'Máximo 100 productos en el catálogo' };

  const productos = [];
  for (const p of lista) {
    if (!p || typeof p !== 'object') return { error: 'Hay un producto con formato inválido' };

    const nombre     = String(p.nombre ?? '').trim().slice(0, 120);
    const materiales = String(p.materiales ?? '').trim().slice(0, 300);
    const categoria  = CATEGORIAS_VALIDAS.includes(p.categoria) ? p.categoria : null;
    const icono      = ICONOS_VALIDOS.includes(p.icono) ? p.icono : 'mascara';
    const imagen     = String(p.imagen ?? '').trim();
    const id     = Number(p.id);
    const precio = Math.round(Number(p.precio));
    const oferta = Math.round(Number(p.oferta ?? 0));
    const stock  = Math.round(Number(p.stock ?? 0));

    if (!nombre || !materiales) return { error: 'Todo producto necesita nombre y materiales' };
    if (!categoria) return { error: `Categoría no válida en «${nombre}»` };
    if (!Number.isFinite(id)) return { error: `Identificador no válido en «${nombre}»` };
    if (!Number.isFinite(precio) || precio < 0 || precio > 99999999) {
      return { error: `Precio no válido en «${nombre}»` };
    }
    if (!Number.isFinite(oferta) || oferta < 0 || oferta > 90) {
      return { error: `La oferta de «${nombre}» debe estar entre 0% y 90%` };
    }
    if (!Number.isFinite(stock) || stock < 0 || stock > 99999) {
      return { error: `Stock no válido en «${nombre}»` };
    }
    // Se aceptan dos formas de imagen:
    //  1) una foto de la carpeta del sitio (imagenes/…), o
    //  2) una foto subida por el administrador, guardada como data URI
    //     en base64 (con tope de tamaño para no saturar la base de datos).
    if (imagen) {
      const rutaLocal = !imagen.includes('..') &&
        /^imagenes\/[\w .%-]+\.(png|jpe?g|webp|gif)$/i.test(imagen);
      const subida =
        /^data:image\/(png|jpe?g|jpg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(imagen) &&
        imagen.length <= 500000; // ≈ 370 KB por imagen
      if (!rutaLocal && !subida) {
        return { error: `La imagen de «${nombre}» no es válida` };
      }
    }

    productos.push({ id, nombre, categoria, icono, imagen, materiales, precio, oferta, stock });
  }
  return { productos };
}

/* Revisa un mensaje del formulario de contacto público. */
function sanearMensaje(m) {
  if (!m || typeof m !== 'object') return { error: 'Mensaje inválido' };

  const nombre   = String(m.nombre ?? '').trim().slice(0, 120);
  const correo   = String(m.correo ?? '').trim().slice(0, 120);
  const telefono = String(m.telefono ?? '').trim().slice(0, 40);
  const texto    = String(m.mensaje ?? '').trim().slice(0, 2000);

  let productos = Array.isArray(m.productos) ? m.productos : [];
  productos = productos.slice(0, 15).map(p => String(p).trim().slice(0, 120)).filter(Boolean);
  if (productos.length === 0) productos = ['Consulta general'];

  if (nombre.length < 2) return { error: 'El nombre es demasiado corto' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: 'El correo electrónico no es válido' };
  if (!/^[+\d][\d\s().-]{6,}$/.test(telefono)) return { error: 'El teléfono no es válido' };
  if (texto.length < 5) return { error: 'El mensaje es demasiado corto' };

  return { mensaje: { nombre, correo, telefono, productos, mensaje: texto } };
}

module.exports = { sanearProductos, sanearMensaje };

/* =========================================================
   GRITO NEGRO — Lógica del panel de administración
   Todos los cambios se guardan en la base de datos del
   servidor (datos.json), por lo que los ven todos los
   visitantes de la tienda.
   ========================================================= */

let productosAdmin = [];
let mensajesAdmin = [];
let firmaPanel = ''; // Para no repintar (y borrar ediciones a medias) si nada cambió

/* ---------- Notificación flotante ---------- */
let temporizadorNotificacion = null;
function notificar(texto) {
  const caja = document.getElementById('notificacion');
  caja.textContent = texto;
  caja.classList.add('visible');
  clearTimeout(temporizadorNotificacion);
  temporizadorNotificacion = setTimeout(() => caja.classList.remove('visible'), 2600);
}

/* ---------- Subida de imágenes propias ----------
   Reescala la foto elegida a un tamaño razonable y la devuelve como
   data URI (base64), para guardarla dentro del producto sin subir
   archivos al servidor. Así el administrador puede usar sus propias
   fotos, no solo las de la lista fija. */
function reescalarImagen(archivo, maxLado = 900, calidad = 0.82) {
  return new Promise((resolve, reject) => {
    if (!archivo || !/^image\//.test(archivo.type)) { reject(new Error('El archivo no es una imagen.')); return; }
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('La imagen está dañada.'));
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxLado || h > maxLado) {
          const escala = Math.min(maxLado / w, maxLado / h);
          w = Math.round(w * escala); h = Math.round(h * escala);
        }
        const lienzo = document.createElement('canvas');
        lienzo.width = w; lienzo.height = h;
        const ctx = lienzo.getContext('2d');
        ctx.fillStyle = '#0a0a0d'; // fondo, por si la foto trae transparencia
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        let uri = lienzo.toDataURL('image/jpeg', calidad);
        if (uri.length > 480000) uri = lienzo.toDataURL('image/jpeg', 0.68); // recorta peso
        resolve(uri);
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

/* Imagen subida para el producto NUEVO (tiene prioridad sobre la lista) */
let imagenSubidaNueva = '';

function iniciarSubidaImagen() {
  const btn = document.getElementById('btn-subir-imagen');
  const input = document.getElementById('nueva-imagen-archivo');
  const vista = document.querySelector('.subir-imagen__vista');
  const preview = document.getElementById('nueva-imagen-preview');
  const quitar = document.getElementById('btn-quitar-imagen');
  const select = document.getElementById('nueva-imagen');
  if (!btn || !input) return;

  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const archivo = input.files && input.files[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    try {
      imagenSubidaNueva = await reescalarImagen(archivo);
      preview.src = imagenSubidaNueva;
      if (vista) vista.hidden = false;
      if (select) select.disabled = true; // la foto subida manda
      notificar('✔ Foto lista. Se usará al agregar el producto.');
    } catch (error) {
      notificar(`⚠ ${error.message}`);
    }
  });
  if (quitar) quitar.addEventListener('click', () => {
    imagenSubidaNueva = '';
    if (preview) preview.src = '';
    if (vista) vista.hidden = true;
    if (select) select.disabled = false;
  });
}

/* ---------- Sesión ---------- */
async function mostrarSegunSesion() {
  const login = document.getElementById('pantalla-login');
  const panel = document.getElementById('panel-admin');
  if (haySesion()) {
    login.style.display = 'none';
    panel.style.display = 'block';
    await cargarPanel();
  } else {
    login.style.display = 'flex';
    panel.style.display = 'none';
  }
}

function iniciarLogin() {
  const formulario = document.getElementById('formulario-login');
  const aviso = document.getElementById('aviso-login');

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    const clave = document.getElementById('clave').value;
    const resultado = await iniciarSesionAdmin(clave);
    if (resultado.ok) {
      await mostrarSegunSesion();
    } else {
      // Muestra el motivo real: clave errada o bloqueo por demasiados intentos
      aviso.className = 'aviso-formulario error';
      aviso.textContent = `⚠ ${resultado.error || 'Contraseña incorrecta.'}`;
      formulario.reset();
    }
  });

  document.getElementById('boton-salir').addEventListener('click', async () => {
    cerrarSesion();
    await mostrarSegunSesion();
  });
}

/* ---------- Carga de datos y pintado general ---------- */
async function cargarPanel() {
  let productos, mensajes;
  try {
    [productos, mensajes] = await Promise.all([
      obtenerProductos(),
      obtenerMensajes()
    ]);
  } catch (error) {
    notificar(`⚠ ${error.message}`);
    return;
  }

  // Si nada cambió, no repintamos: así no se pierde lo que
  // el administrador esté escribiendo en la tabla
  const firma = JSON.stringify([productos, mensajes]);
  if (firma === firmaPanel) return;
  firmaPanel = firma;

  productosAdmin = productos;
  mensajesAdmin = mensajes;
  pintarEstadisticas();
  pintarTabla();
  pintarMensajes();
}

/* ---------- Estadísticas ---------- */
function pintarEstadisticas() {
  const unidades = productosAdmin.reduce((suma, p) => suma + Number(p.stock), 0);
  const enOferta = productosAdmin.filter(p => p.oferta > 0).length;
  const agotados = productosAdmin.filter(p => p.stock <= 0).length;

  document.getElementById('estadisticas').innerHTML = `
    <div class="estadistica"><div class="valor">${productosAdmin.length}</div><div class="nombre">Productos en catálogo</div></div>
    <div class="estadistica"><div class="valor">${unidades}</div><div class="nombre">Unidades en stock</div></div>
    <div class="estadistica"><div class="valor rojo">${enOferta}</div><div class="nombre">Productos en oferta</div></div>
    <div class="estadistica"><div class="valor rojo">${agotados}</div><div class="nombre">Productos agotados</div></div>
    <div class="estadistica"><div class="valor">${mensajesAdmin.length}</div><div class="nombre">Mensajes recibidos</div></div>`;
}

/* ---------- Tabla de inventario ---------- */
function pintarTabla() {
  const cuerpo = document.getElementById('cuerpo-tabla');

  cuerpo.innerHTML = productosAdmin.map(p => `
    <tr data-id="${p.id}">
      <td>
        <div class="celda-producto">
          ${p.imagen ? `<img src="${escaparHTML(p.imagen)}" alt="" class="miniatura-admin">` : ''}
          <div>
            <div class="nombre-producto">${escaparHTML(p.nombre)}</div>
            <div class="categoria-mini">${escaparHTML(p.categoria)}</div>
          </div>
        </div>
      </td>
      <td><input type="text" class="campo-materiales" value="${escaparHTML(p.materiales)}"></td>
      <td><input type="number" class="campo-precio" min="0" step="10" value="${p.precio}"></td>
      <td><input type="number" class="campo-oferta" min="0" max="90" value="${p.oferta}"></td>
      <td class="precio-final-celda">${formatoCLP(precioFinal(p))}</td>
      <td><input type="number" class="campo-stock" min="0" value="${p.stock}"></td>
      <td>
        <div class="acciones-fila">
          <button class="boton boton-chico" data-imagen="${p.id}">🖼 Imagen</button>
          <button class="boton boton-rojo boton-chico" data-guardar="${p.id}">Guardar</button>
          <button class="boton boton-peligro boton-chico" data-eliminar="${p.id}">Eliminar</button>
        </div>
      </td>
    </tr>`).join('');

  // Guardar cambios de una fila
  cuerpo.querySelectorAll('[data-guardar]').forEach(boton => {
    boton.addEventListener('click', async () => {
      const fila = boton.closest('tr');
      const id = Number(fila.dataset.id);
      const producto = productosAdmin.find(p => p.id === id);
      if (!producto) return;

      const precio = Number(fila.querySelector('.campo-precio').value);
      const oferta = Number(fila.querySelector('.campo-oferta').value);
      const stock  = Number(fila.querySelector('.campo-stock').value);
      const materiales = fila.querySelector('.campo-materiales').value.trim();

      if (precio < 0 || stock < 0 || oferta < 0 || oferta > 90 || !materiales) {
        notificar('⚠ Revisa los valores: no se permiten negativos ni ofertas sobre 90%.');
        return;
      }

      Object.assign(producto, { precio, oferta, stock, materiales });
      try {
        await guardarProductos(productosAdmin);
      } catch (error) {
        notificar(`⚠ ${error.message}`);
        return;
      }
      await cargarPanel();
      notificar(`✔ «${producto.nombre}» actualizado.`);
    });
  });

  // Eliminar producto
  cuerpo.querySelectorAll('[data-eliminar]').forEach(boton => {
    boton.addEventListener('click', async () => {
      const id = Number(boton.dataset.eliminar);
      const producto = productosAdmin.find(p => p.id === id);
      if (!producto) return;
      if (!confirm(`¿Eliminar «${producto.nombre}» del catálogo?`)) return;
      try {
        await guardarProductos(productosAdmin.filter(p => p.id !== id));
      } catch (error) {
        notificar(`⚠ ${error.message}`);
        return;
      }
      await cargarPanel();
      notificar('🗑 Producto eliminado.');
    });
  });

  // Cambiar la imagen de una fila (sube una foto propia y actualiza la miniatura)
  cuerpo.querySelectorAll('[data-imagen]').forEach(boton => {
    boton.addEventListener('click', () => {
      const id = Number(boton.dataset.imagen);
      const producto = productosAdmin.find(p => p.id === id);
      if (!producto) return;

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp';
      input.addEventListener('change', async () => {
        const archivo = input.files && input.files[0];
        if (!archivo) return;
        try {
          producto.imagen = await reescalarImagen(archivo);
        } catch (error) {
          notificar(`⚠ ${error.message}`);
          return;
        }
        // Refresca la miniatura de esa fila sin repintar toda la tabla
        const fila = boton.closest('tr');
        const celda = fila.querySelector('.celda-producto');
        let mini = celda.querySelector('.miniatura-admin');
        if (!mini) {
          mini = document.createElement('img');
          mini.className = 'miniatura-admin';
          mini.alt = '';
          celda.prepend(mini);
        }
        mini.src = producto.imagen;
        notificar('✔ Imagen cargada. Pulsa «Guardar» en esa fila para aplicarla.');
      });
      input.click();
    });
  });
}

/* ---------- Agregar producto ---------- */
function llenarSelectorImagenes() {
  const selector = document.getElementById('nueva-imagen');

  const fotos = document.createElement('optgroup');
  fotos.label = 'Fotos disponibles';
  IMAGENES_DISPONIBLES.forEach(img => {
    const opcion = document.createElement('option');
    opcion.value = img.ruta;
    opcion.textContent = img.nombre;
    fotos.appendChild(opcion);
  });

  const dibujos = document.createElement('optgroup');
  dibujos.label = 'Dibujos';
  [['svg:mascara', 'Dibujo: máscara'], ['svg:tunica', 'Dibujo: túnica'],
   ['svg:guantes', 'Dibujo: guantes'], ['svg:cuchillo', 'Dibujo: cuchillo']].forEach(([valor, texto]) => {
    const opcion = document.createElement('option');
    opcion.value = valor;
    opcion.textContent = texto;
    dibujos.appendChild(opcion);
  });

  selector.appendChild(fotos);
  selector.appendChild(dibujos);
}

function iniciarAgregar() {
  const formulario = document.getElementById('formulario-agregar');

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    const nombre = document.getElementById('nuevo-nombre').value.trim();
    const materiales = document.getElementById('nuevos-materiales').value.trim();
    const precio = Number(document.getElementById('nuevo-precio').value);
    const oferta = Number(document.getElementById('nueva-oferta').value) || 0;
    const stock  = Number(document.getElementById('nuevo-stock').value) || 0;

    if (!nombre || !materiales || !(precio > 0)) {
      notificar('⚠ Completa nombre, materiales y un precio mayor a 0.');
      return;
    }
    if (oferta < 0 || oferta > 90 || stock < 0) {
      notificar('⚠ Revisa la oferta (0–90%) y el stock (no negativo).');
      return;
    }

    // Prioridad: foto propia subida por el administrador > opción de la lista.
    // La imagen de la lista puede ser una foto (imagenes/…) o un dibujo SVG.
    let icono = 'mascara';
    let imagen = '';
    if (imagenSubidaNueva) {
      imagen = imagenSubidaNueva;
    } else {
      const valorImagen = document.getElementById('nueva-imagen').value;
      if (valorImagen.startsWith('svg:')) icono = valorImagen.slice(4);
      else imagen = valorImagen;
    }

    const nuevaLista = [...productosAdmin, {
      id: Date.now(),
      nombre,
      categoria: document.getElementById('nueva-categoria').value,
      icono,
      imagen,
      materiales,
      precio,
      oferta,
      stock
    }];

    try {
      await guardarProductos(nuevaLista);
    } catch (error) {
      notificar(`⚠ ${error.message}`);
      return;
    }
    formulario.reset();
    // Limpia la foto subida y su vista previa para el próximo producto
    imagenSubidaNueva = '';
    const vistaSubida = document.querySelector('.subir-imagen__vista');
    if (vistaSubida) vistaSubida.hidden = true;
    const selImg = document.getElementById('nueva-imagen');
    if (selImg) selImg.disabled = false;
    await cargarPanel();
    notificar(`✔ «${nombre}» agregado al catálogo.`);
  });

  document.getElementById('boton-restaurar').addEventListener('click', async () => {
    if (!confirm('Esto reemplazará el catálogo actual por el original. ¿Continuar?')) return;
    try {
      await restaurarCatalogo();
    } catch (error) {
      notificar(`⚠ ${error.message}`);
      return;
    }
    await cargarPanel();
    notificar('↺ Catálogo restaurado.');
  });
}

/* ---------- Mensajes recibidos ---------- */
function pintarMensajes() {
  const lista = document.getElementById('lista-mensajes');

  if (mensajesAdmin.length === 0) {
    lista.innerHTML = '<p class="sin-datos">Aún no hay mensajes. Cuando alguien complete el formulario de la tienda, aparecerá aquí.</p>';
    return;
  }

  lista.innerHTML = mensajesAdmin.map(m => {
    // Los mensajes nuevos traen varios productos; los antiguos, solo uno
    const productos = m.productos || (m.producto ? [m.producto] : []);
    return `
    <div class="mensaje">
      <div class="cabecera-mensaje">
        <span class="remitente">${escaparHTML(m.nombre)}</span>
        <span class="fecha">${escaparHTML(m.fecha)}</span>
      </div>
      <div class="datos-contacto">
        <span>📧 ${escaparHTML(m.correo)}</span>
        <span>📱 ${escaparHTML(m.telefono)}</span>
      </div>
      ${productos.map(pr => `<span class="producto-interes">${escaparHTML(pr)}</span>`).join(' ')}
      <p class="cuerpo">${escaparHTML(m.mensaje)}</p>
      <div class="pie-mensaje">
        <button class="boton boton-peligro boton-chico" data-borrar-mensaje="${m.id}">Borrar</button>
      </div>
    </div>`;
  }).join('');

  lista.querySelectorAll('[data-borrar-mensaje]').forEach(boton => {
    boton.addEventListener('click', async () => {
      try {
        await borrarMensaje(Number(boton.dataset.borrarMensaje));
      } catch (error) {
        notificar(`⚠ ${error.message}`);
        return;
      }
      await cargarPanel();
      notificar('🗑 Mensaje borrado.');
    });
  });
}

/* ---------- Inicio ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  mostrarBannerDemo();
  // En demo, muestra la contraseña bajo el login para poder entrar a probar
  if (DEMO) {
    const form = document.getElementById('formulario-login');
    if (form && !document.querySelector('.pista-demo')) {
      const pista = document.createElement('p');
      pista.className = 'pista-demo';
      pista.innerHTML = '🔑 Demo — contraseña: <code>fantasma123</code>';
      form.appendChild(pista);
    }
  }
  iniciarLogin();
  llenarSelectorImagenes();
  iniciarAgregar();
  iniciarSubidaImagen();
  await mostrarSegunSesion();

  // Refresca el panel cada 10 segundos (solo en el sitio real con servidor)
  if (!DEMO) {
    setInterval(() => {
      if (haySesion()) cargarPanel().catch(() => {});
    }, 10000);
  }
});

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

    // La imagen puede ser una foto de la carpeta "imagenes" o un dibujo SVG
    const valorImagen = document.getElementById('nueva-imagen').value;
    const esDibujo = valorImagen.startsWith('svg:');

    const nuevaLista = [...productosAdmin, {
      id: Date.now(),
      nombre,
      categoria: document.getElementById('nueva-categoria').value,
      icono: esDibujo ? valorImagen.slice(4) : 'mascara',
      imagen: esDibujo ? '' : valorImagen,
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
  iniciarLogin();
  llenarSelectorImagenes();
  iniciarAgregar();
  await mostrarSegunSesion();

  // Refresca el panel cada 10 segundos para ver mensajes nuevos al instante
  setInterval(() => {
    if (haySesion()) cargarPanel().catch(() => {});
  }, 10000);
});

/* =========================================================
   GRITO NEGRO — Lógica de la tienda (perfil usuario)
   ========================================================= */

let filtroActivo = 'Todos';
let catalogoActual = [];      // Copia local del catálogo (se refresca desde el servidor)
let firmaCatalogo = '';       // Para repintar solo cuando algo cambió

/* Productos elegidos en la ventana emergente (por id) */
const seleccion = new Set();

/* ---------- Carga y refresco del catálogo ---------- */
async function cargarCatalogo() {
  const productos = await obtenerProductos();
  const firma = JSON.stringify(productos);
  if (firma === firmaCatalogo) return; // Nada cambió: no tocamos la página
  firmaCatalogo = firma;
  catalogoActual = productos;
  pintarCatalogo();
  pintarSeleccion();
}

/* ---------- Catálogo ---------- */
function etiquetaStock(stock) {
  if (stock <= 0)  return '<span class="stock stock-agotado">Agotado</span>';
  if (stock <= 3)  return `<span class="stock stock-bajo">¡Últimas ${stock} unidades!</span>`;
  return `<span class="stock stock-ok">En stock: ${stock}</span>`;
}

function tarjetaProducto(p) {
  const conOferta = p.oferta > 0;
  const agotado = p.stock <= 0;
  return `
    <article class="tarjeta ${agotado ? 'agotada' : ''}">
      ${conOferta ? `<span class="etiqueta-oferta">-${p.oferta}%</span>` : ''}
      <div class="figura">${figuraProducto(p)}</div>
      <span class="categoria">${escaparHTML(p.categoria)}</span>
      <h3>${escaparHTML(p.nombre)}</h3>
      <p class="materiales"><strong>Materiales:</strong> ${escaparHTML(p.materiales)}</p>
      <div class="precios">
        <span class="precio-actual">${formatoCLP(precioFinal(p))}</span>
        ${conOferta ? `<span class="precio-anterior">${formatoCLP(p.precio)}</span>` : ''}
      </div>
      <div class="pie">
        ${etiquetaStock(p.stock)}
        <button class="boton boton-rojo boton-chico" data-consultar="${p.id}" ${agotado ? 'disabled' : ''}>
          ${agotado ? 'Sin stock' : 'Consultar'}
        </button>
      </div>
    </article>`;
}

function pintarCatalogo() {
  const rejilla = document.getElementById('rejilla-catalogo');
  const visibles = filtroActivo === 'Todos'
    ? catalogoActual
    : catalogoActual.filter(p => p.categoria === filtroActivo);

  if (visibles.length === 0) {
    rejilla.innerHTML = '<p class="sin-datos" style="grid-column:1/-1;">No hay productos en esta categoría por ahora.</p>';
    return;
  }
  rejilla.innerHTML = visibles.map(tarjetaProducto).join('');

  // Botón "Consultar": agrega el producto a la selección y baja al formulario
  rejilla.querySelectorAll('[data-consultar]').forEach(boton => {
    boton.addEventListener('click', () => {
      seleccion.add(Number(boton.dataset.consultar));
      pintarSeleccion();
      document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/* ---------- Filtros ---------- */
function iniciarFiltros() {
  const contenedor = document.getElementById('filtros');
  contenedor.querySelectorAll('button').forEach(boton => {
    boton.addEventListener('click', () => {
      contenedor.querySelector('.activo')?.classList.remove('activo');
      boton.classList.add('activo');
      filtroActivo = boton.dataset.categoria;
      pintarCatalogo();
    });
  });
}

/* ---------- Foto principal: rotación con baño de sangre ---------- */
const FOTOS_HEROE = [
  'imagenes/creadorprincipal.png',
  'imagenes/autor2.png',
  'imagenes/autor3.png'
];

function iniciarRotacionHeroe() {
  const foto = document.getElementById('foto-rotativa');
  const cortina = document.getElementById('cortina-sangre');
  if (!foto || !cortina) return;

  // Precargamos las fotos para que el cambio sea instantáneo
  FOTOS_HEROE.forEach(ruta => { new Image().src = ruta; });

  let indice = 0;
  setInterval(() => {
    cortina.classList.add('activa');
    // A mitad de la caída de sangre (imagen tapada) cambiamos la foto
    setTimeout(() => {
      indice = (indice + 1) % FOTOS_HEROE.length;
      foto.src = FOTOS_HEROE[indice];
    }, 1000);
  }, 7000);

  cortina.addEventListener('animationend', () => cortina.classList.remove('activa'));
}

/* ---------- Ventana emergente de selección de productos ---------- */
function pintarListaModal() {
  const lista = document.getElementById('modal-lista');
  lista.innerHTML = catalogoActual.map(p => {
    const agotado = p.stock <= 0;
    const marcada = seleccion.has(p.id);
    const figura = p.imagen
      ? `<img src="${escaparHTML(p.imagen)}" alt="" loading="lazy">`
      : `<span class="mini-svg">${iconoSVG(p.icono)}</span>`;
    return `
      <label class="opcion-producto ${marcada ? 'seleccionada' : ''} ${agotado ? 'agotada' : ''}">
        <input type="checkbox" data-producto="${p.id}" ${marcada ? 'checked' : ''} ${agotado ? 'disabled' : ''}>
        ${figura}
        <span class="info">
          <span class="nombre-opcion">${escaparHTML(p.nombre)}</span><br>
          <span class="precio-opcion">${formatoCLP(precioFinal(p))}${agotado ? ' · Agotado' : ''}</span>
        </span>
        <span class="marca">✓</span>
      </label>`;
  }).join('');

  lista.querySelectorAll('input[data-producto]').forEach(casilla => {
    casilla.addEventListener('change', () => {
      const id = Number(casilla.dataset.producto);
      casilla.checked ? seleccion.add(id) : seleccion.delete(id);
      casilla.closest('.opcion-producto').classList.toggle('seleccionada', casilla.checked);
    });
  });
}

function pintarSeleccion() {
  const elegidos = catalogoActual.filter(p => seleccion.has(p.id));

  // El botón muestra cuántos hay elegidos
  document.getElementById('boton-elegir-productos').textContent =
    `🔪 Seleccionar productos (${elegidos.length})`;

  // Chips con opción de quitar
  const chips = document.getElementById('chips-productos');
  chips.innerHTML = elegidos.map(p => `
    <span class="chip">${escaparHTML(p.nombre)}
      <button type="button" data-quitar="${p.id}" aria-label="Quitar ${escaparHTML(p.nombre)}">✕</button>
    </span>`).join('');

  chips.querySelectorAll('[data-quitar]').forEach(boton => {
    boton.addEventListener('click', () => {
      seleccion.delete(Number(boton.dataset.quitar));
      pintarSeleccion();
    });
  });
}

function iniciarModal() {
  const modal = document.getElementById('modal-productos');

  document.getElementById('boton-elegir-productos').addEventListener('click', () => {
    pintarListaModal();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  });

  const cerrar = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
    pintarSeleccion();
  };

  document.getElementById('cerrar-modal').addEventListener('click', cerrar);
  document.getElementById('confirmar-seleccion').addEventListener('click', cerrar);

  document.getElementById('limpiar-seleccion').addEventListener('click', () => {
    seleccion.clear();
    pintarListaModal();
  });

  // Cerrar al hacer clic fuera de la ventana o con Escape
  modal.addEventListener('click', evento => {
    if (evento.target === modal) cerrar();
  });
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && !modal.hidden) cerrar();
  });
}

/* ---------- Formulario de contacto ---------- */
function iniciarFormulario() {
  const formulario = document.getElementById('formulario-contacto');
  const aviso = document.getElementById('aviso-formulario');

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();

    const nombre   = formulario.nombre.value.trim();
    const correo   = formulario.correo.value.trim();
    const telefono = formulario.telefono.value.trim();
    const mensaje  = formulario.mensaje.value.trim();

    // Validaciones
    aviso.className = 'aviso-formulario';
    if (!nombre || !correo || !telefono || !mensaje) {
      aviso.classList.add('error');
      aviso.textContent = '⚠ Completa todos los campos obligatorios (*).';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      aviso.classList.add('error');
      aviso.textContent = '⚠ El correo electrónico no tiene un formato válido.';
      return;
    }
    if (!/^[+\d][\d\s().-]{6,}$/.test(telefono)) {
      aviso.classList.add('error');
      aviso.textContent = '⚠ El teléfono debe tener al menos 7 dígitos.';
      return;
    }

    // Nombres de los productos elegidos (o consulta general si no eligió)
    const productos = catalogoActual
      .filter(p => seleccion.has(p.id))
      .map(p => p.nombre);

    try {
      await enviarMensaje({
        nombre,
        correo,
        telefono,
        productos: productos.length ? productos : ['Consulta general'],
        mensaje
      });
    } catch (error) {
      aviso.classList.add('error');
      aviso.textContent = `⚠ ${error.message || 'No pudimos enviar tu mensaje. Inténtalo de nuevo.'}`;
      return;
    }

    formulario.reset();
    seleccion.clear();
    pintarSeleccion();
    aviso.classList.add('exito');
    aviso.textContent = `✔ ¡Gracias ${nombre}! Recibimos tu mensaje y te contactaremos pronto a ${correo}.`;
  });
}

/* ---------- Inicio ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  iniciarFiltros();
  iniciarModal();
  iniciarFormulario();
  iniciarRotacionHeroe();
  await cargarCatalogo();

  // Consulta al servidor cada 8 segundos: si el administrador cambió
  // precios, ofertas o stock, la tienda se actualiza sola
  setInterval(() => cargarCatalogo().catch(() => {}), 8000);
});

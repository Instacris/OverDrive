/* =========================================================
   GRITO NEGRO — Catálogo inicial
   Este archivo lo usan el navegador (tienda y admin) y el
   servidor Node (para crear la base de datos la primera vez).
   ========================================================= */

const PRODUCTOS_INICIALES = [
  {
    id: 1,
    nombre: 'Máscara Ghostface Clásica',
    categoria: 'Máscara',
    icono: 'mascara',
    imagen: 'imagenes/Mascara3.png',
    materiales: 'Látex natural con acabado brillante, forro interior de algodón, elástico ajustable',
    precio: 14990,
    oferta: 0,
    stock: 12
  },
  {
    id: 2,
    nombre: 'Máscara Envejecida "Scream VI"',
    categoria: 'Máscara',
    icono: 'mascara',
    imagen: 'imagenes/mascara2.png',
    materiales: 'Látex grueso, pintura acrílica con acabado desgastado y texturizado',
    precio: 19990,
    oferta: 15,
    stock: 6
  },
  {
    id: 3,
    nombre: 'Túnica Clásica con Capucha',
    categoria: 'Uniforme',
    icono: 'tunica',
    imagen: 'imagenes/Uniforme2.jpg',
    materiales: 'Poliéster negro mate, costuras reforzadas, capucha amplia y bordes rasgados',
    precio: 22990,
    oferta: 10,
    stock: 10
  },
  {
    id: 4,
    nombre: 'Uniforme Urbano "Cazador"',
    categoria: 'Uniforme',
    icono: 'tunica',
    imagen: 'imagenes/Uniforme1.png',
    materiales: 'Ecocuero y poliéster, capucha estructurada, ideal para sesiones de fotos',
    precio: 34990,
    oferta: 0,
    stock: 5
  },
  {
    id: 5,
    nombre: 'Uniforme Completo Premium',
    categoria: 'Uniforme',
    icono: 'tunica',
    imagen: 'imagenes/Uniforme3.png',
    materiales: 'Poliéster escarchado con forro satinado, capucha desmontable, guantes incluidos',
    precio: 39990,
    oferta: 20,
    stock: 4
  },
  {
    id: 6,
    nombre: 'Uniforme Escarchado Edición Especial',
    categoria: 'Uniforme',
    icono: 'tunica',
    imagen: 'imagenes/uniforme4.png',
    materiales: 'Tela escarchada brillante, costuras dobles, largo hasta el suelo',
    precio: 44990,
    oferta: 0,
    stock: 3
  },
  {
    id: 7,
    nombre: 'Uniforme Nocturno con Guantes',
    categoria: 'Uniforme',
    icono: 'tunica',
    imagen: 'imagenes/Uniforme5.png',
    materiales: 'Poliéster grueso con caída amplia, guantes tácticos incluidos',
    precio: 37990,
    oferta: 10,
    stock: 6
  },
  {
    id: 8,
    nombre: 'Guantes Negros Táctiles',
    categoria: 'Accesorio',
    icono: 'guantes',
    imagen: 'imagenes/guantes.png',
    materiales: 'Cuero sintético, interior afelpado, compatibles con pantallas táctiles',
    precio: 6990,
    oferta: 0,
    stock: 20
  },
  {
    id: 9,
    nombre: 'Cuchillo de Utilería Clásico',
    categoria: 'Accesorio',
    icono: 'cuchillo',
    imagen: 'imagenes/cuchillo2.png',
    materiales: 'Goma EVA flexible (100% seguro), hoja con acabado metálico, mango texturizado',
    precio: 8990,
    oferta: 0,
    stock: 15
  },
  {
    id: 10,
    nombre: 'Cuchillo "Ensangrentado" de Utilería',
    categoria: 'Accesorio',
    icono: 'cuchillo',
    imagen: 'imagenes/Cuchillo1.png',
    materiales: 'Goma EVA flexible, pintura roja permanente efecto sangre (no mancha)',
    precio: 10990,
    oferta: 0,
    stock: 8
  }
];

/* Imágenes disponibles para asignar a productos nuevos desde el panel */
const IMAGENES_DISPONIBLES = [
  { ruta: 'imagenes/mascara2.png',  nombre: 'Foto: máscara envejecida' },
  { ruta: 'imagenes/Mascara3.png',  nombre: 'Foto: máscara clásica' },
  { ruta: 'imagenes/Uniforme1.png', nombre: 'Foto: uniforme urbano' },
  { ruta: 'imagenes/Uniforme2.jpg', nombre: 'Foto: túnica clásica' },
  { ruta: 'imagenes/Uniforme3.png', nombre: 'Foto: uniforme premium' },
  { ruta: 'imagenes/uniforme4.png', nombre: 'Foto: uniforme escarchado' },
  { ruta: 'imagenes/Uniforme5.png', nombre: 'Foto: uniforme nocturno' },
  { ruta: 'imagenes/guantes.png',   nombre: 'Foto: guantes' },
  { ruta: 'imagenes/Cuchillo1.png', nombre: 'Foto: cuchillo ensangrentado' },
  { ruta: 'imagenes/cuchillo2.png', nombre: 'Foto: cuchillo clásico' }
];

/* Permite que el servidor Node use este mismo archivo */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRODUCTOS_INICIALES, IMAGENES_DISPONIBLES };
}

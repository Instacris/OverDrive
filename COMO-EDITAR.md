# ✏️ Cómo editar la página Overdrive (desde VS Code)

Sí, puedes cambiar lo que quieras desde tu VS Code. Este es el circuito completo:
**editar → guardar → publicar**. Toda la web queda actualizada online en 1-2 minutos.

---

## 1. Abrir el proyecto

- Abre **VS Code** → *Archivo → Abrir carpeta…* → elige la carpeta `cosplay`.
- Verás a la izquierda todos los archivos. Los importantes:
  - `index.html` → la tienda (lo que ve el cliente)
  - `admin.html` → el panel de administración
  - `css/estilos.css` → colores, tamaños, estilos
  - `js/` → la lógica (catálogo, formulario, etc.)
  - `imagenes/` → las fotos

## 2. (Opcional) Probar en tu computador antes de publicar

Así ves los cambios sin afectar el sitio real:

1. Abre la terminal en VS Code (*Terminal → Nueva terminal*).
2. Escribe: `node servidor.js`
3. Abre en el navegador: `http://localhost:4173`
4. Cuando termines de mirar, cierra la terminal con `Ctrl + C`.

> Ojo: en tu computador los cambios del panel se guardan en un archivo local
> `datos.json`. Los cambios reales para todos se hacen en el sitio online.

## 3. Publicar los cambios (que se vean online)

Cuando estés conforme, hay dos formas. La más simple, con el **panel de la izquierda de VS Code** (el ícono que parece una ramita, "Source Control"):

1. Haz clic en ese ícono de *Source Control*.
2. Arriba, escribe un mensajito de qué cambiaste (ej. "Cambié el número de WhatsApp").
3. Haz clic en **✓ Commit**. Si pregunta, dile *"Yes"* a hacer stage de todo.
4. Haz clic en **Sync Changes** (o los tres puntos → *Push*).

Eso sube el cambio a GitHub, y Vercel **publica solo** en 1-2 minutos.
Recarga `https://overdrive-woad.vercel.app` y verás el cambio. ✅

*(Si prefieres la terminal, es lo mismo con: `git add .` → `git commit -m "lo que cambié"` → `git push`.)*

---

## Cosas fáciles que puedes cambiar tú mismo

| Quiero cambiar… | Dónde | Qué buscar |
|---|---|---|
| El número de WhatsApp | `index.html` | busca `56912345678` y ponlo el tuyo |
| Textos de la portada | `index.html` | el texto entre las etiquetas |
| Un precio/stock/oferta | El panel `/admin` | no hace falta tocar código |
| Colores del sitio | `css/estilos.css` | arriba, la sección `:root` (ej. `--rojo`) |
| La contraseña del panel | Vercel → Settings → Environment Variables | variable `CLAVE_ADMIN` |

> **Consejo:** cambia una cosa a la vez y publica. Si algo se ve raro, es fácil
> saber qué fue. Y como todo queda en GitHub, siempre se puede volver atrás.

---

## Si te complicas

Cualquier cambio más grande (una sección nueva, otra función, arreglar algo que
se rompió) me lo puedes pedir a mí y lo hago. No tienes que saber programar para
que la tienda siga creciendo. 🔪

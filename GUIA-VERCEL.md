# 🚀 Cómo subir Overdrive a Vercel (con base de datos)

Tu proyecto ya está preparado para Vercel. Cuando termines estos pasos, la
tienda quedará online en una dirección limpia tipo **`overdrive.vercel.app`**
(y el panel en **`overdrive.vercel.app/admin`**), y los cambios que hagas en el
panel los verán TODOS los visitantes, desde cualquier dispositivo.

> Solo haces esto una vez. Después, cada cambio se publica solo con `git push`
> o volviendo a arrastrar la carpeta.

---

## Paso 1 — Sube el código a Vercel

Igual que hiciste con tus otras páginas. La forma más común:

1. Crea un repositorio en GitHub y sube esta carpeta (`cosplay`).
2. En [vercel.com](https://vercel.com) → **Add New… → Project** → importa ese repo.
3. Vercel detecta todo solo (no cambies ninguna opción). Pon el nombre del
   proyecto: **overdrive** (así la URL será `overdrive.vercel.app`).
4. Haz clic en **Deploy** y espera. La tienda ya cargará, pero el **panel
   todavía no guardará** hasta terminar el Paso 2.

*(Alternativa por terminal: instala `npm i -g vercel`, entra a la carpeta y
ejecuta `vercel`. Sigue las preguntas.)*

---

## Paso 2 — Crea la base de datos (gratis)

1. Entra a tu proyecto en Vercel → pestaña **Storage**.
2. **Create Database** → elige la integración **Redis** (Redis Cloud) → **Continue**.
3. En **High Availability** elige **"None · free plan friendly"** (si no, no
   aparece el plan gratis). Selecciona el plan **Free — 30 MB** → **Create**.
4. Cuando pregunte a qué proyecto conectarla, elige **overdrive**, deja
   marcados **Production** y **Preview**, y confirma **Connect**.

Esto agrega automáticamente la variable secreta `REDIS_URL` a tu proyecto
(no tienes que copiar nada a mano).

---

## Paso 3 — Vuelve a desplegar

Para que las funciones tomen la base de datos recién conectada:

- En la pestaña **Deployments** → en el último despliegue, menú **⋯** →
  **Redeploy**.

¡Listo! Entra a `https://overdrive.vercel.app`:
- La primera vez, el catálogo se crea solo con los 10 productos iniciales.
- Abre `https://overdrive.vercel.app/admin`, contraseña **`fantasma123`**,
  cambia un precio y recarga la tienda: se actualiza para todos. 🎉

---

## Paso 4 (opcional pero recomendado) — Cambia la contraseña

Por defecto la clave del panel es `fantasma123`. Para ponerte una propia:

1. Proyecto en Vercel → **Settings → Environment Variables**.
2. Agrega una variable:
   - **Name:** `CLAVE_ADMIN`
   - **Value:** la contraseña que quieras
3. Guarda y haz **Redeploy** (Paso 3) para que tome efecto.

---

## Notas

- **Imágenes:** la carpeta `imagenes/` se sube tal cual, así que las fotos se ven online.
- **`servidor.js` y `datos.json`** son solo para probar en tu computador
  (`node servidor.js`). No se suben a Vercel (están en `.vercelignore`) y no
  hacen falta allá: Vercel usa las funciones de la carpeta `api/`.
- **Dominio propio:** si algún día quieres `www.overdrive.cl` en vez de
  `overdrive.vercel.app`, se conecta en Settings → Domains.

# Modo offline

La app abre y permite **registrar partes de trabajo y de parada sin internet**.
Los registros se guardan en la tablet (IndexedDB) y se envían solos al volver la conexión.

## Cómo funciona
- **Service worker** (`service-worker.template.js` → `dist/sw.js`, lo genera `vite.config.js` en cada build):
  guarda la app para que abra sin red. No toca las llamadas a la API.
- **Catálogos** (personal, unidades, ciclos, materiales, motivos, perfil): se descargan al iniciar sesión
  y se guardan; sin red se usan las últimas copias (`src/offline/catalogos.js`).
- **Registros nuevos** (`src/offline/registro.js`): con internet se envían directo; sin internet (o con
  señal que falla) quedan en la bandeja de salida con un número provisional `PEND-T-0001` / `PEND-P-0001`.
- **Sincronización** (`src/offline/sync.js`): al abrir, al volver el internet, al volver a la pestaña y
  cada 30 s si hay pendientes. Primero los partes de trabajo y luego las paradas. El número real lo asigna
  el servidor (`/siguiente-numero`) al enviar; las paradas ligadas a un parte pendiente se actualizan solas.
- **Pantalla "Pendientes"** (`/pendientes`): ver, editar, reintentar o eliminar lo que aún no se envió.

## Reglas que conviene conocer
- Hay que **iniciar sesión una vez con internet** (y dejar que cargue) antes de salir a trabajar sin señal.
- Sin internet **no** se puede: iniciar sesión, modificar/aprobar/eliminar registros ya enviados.
- Cada usuario ve y envía solo sus pendientes (el Admin ve y envía todos).
- Si la sesión vence antes de enviar, no se pierde nada: se inicia sesión otra vez y se envía.
- Al cerrar sesión con pendientes, la app avisa.

## Probarlo
El service worker solo se activa en la versión compilada:
```
npm run build
npm run preview
```
Abrir en Chrome/Edge, iniciar sesión con internet, luego DevTools → Network → *Offline* (o modo avión),
recargar y registrar un parte. Al quitar *Offline* debe aparecer "Se enviaron 1 registro...".

## Requisitos de despliegue
- La página debe servirse por **HTTPS** (o `localhost`); si no, el navegador no activa el service worker.
- El servidor web debe devolver `index.html` para cualquier ruta (SPA).
- `baseURL` de `src/api/axiosConfig.js` debe apuntar a la API real (hoy es `https://localhost:7009/api`,
  que en la tablet sería la propia tablet).

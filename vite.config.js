import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// Genera dist/sw.js (modo offline) a partir de service-worker.template.js,
// con la lista de archivos compilados para precachearlos. La versión cambia
// cuando cambia cualquier archivo, así el navegador actualiza el service worker.
function swOffline() {
  return {
    name: 'sw-offline',
    apply: 'build',
    generateBundle(_opciones, bundle) {
      const compilados = Object.keys(bundle)
        .filter((f) => !f.endsWith('.map'))
        .map((f) => '/' + f)
      // index.html no aparece en `bundle` en este punto del build: se agrega a mano,
      // si no, al refrescar sin conexión no hay página que abrir.
      const estaticos = [
        '/index.html',
        '/favicon.svg',
        '/manifest.webmanifest',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/icons/icon-512-maskable.png',
      ]
      const lista = [...new Set([...compilados, ...estaticos])].sort()
      const version = createHash('sha1').update(lista.join('|')).digest('hex').slice(0, 10)

      const plantilla = readFileSync(
        new URL('./service-worker.template.js', import.meta.url),
        'utf8'
      )
      const lineaVersion = 'const VERSION = "__VERSION__";'
      const lineaLista = 'const PRECACHE = __PRECACHE__;'
      if (!plantilla.includes(lineaVersion) || !plantilla.includes(lineaLista)) {
        this.error('service-worker.template.js: faltan las líneas VERSION / PRECACHE')
      }
      const source = plantilla
        .replace(lineaVersion, `const VERSION = ${JSON.stringify(version)};`)
        .replace(lineaLista, `const PRECACHE = ${JSON.stringify(lista, null, 2)};`)

      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), swOffline()],
})

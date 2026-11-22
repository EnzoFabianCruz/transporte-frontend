// Acceso mínimo a IndexedDB (sin librerías).
//  - "kv": copia de catálogos y listas para usarlos sin conexión.
//  - "outbox": registros creados sin conexión, pendientes de enviar.
const NOMBRE_DB = "transporte-offline";
const VERSION_DB = 1;

let promesaDb = null;

function abrir() {
  if (!promesaDb) {
    promesaDb = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB no está disponible en este navegador"));
        return;
      }
      const req = indexedDB.open(NOMBRE_DB, VERSION_DB);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv", { keyPath: "clave" });
        if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    promesaDb.catch(() => {
      promesaDb = null; // permite reintentar la próxima vez
    });
  }
  return promesaDb;
}

function operar(almacen, modo, accion) {
  return abrir().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(almacen, modo);
        const req = accion(tx.objectStore(almacen));
        let resultado;
        if (req) req.onsuccess = () => (resultado = req.result);
        tx.oncomplete = () => resolve(resultado);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export const kvGetEntrada = (clave) => operar("kv", "readonly", (s) => s.get(clave));
export const kvSet = (clave, valor) =>
  operar("kv", "readwrite", (s) => s.put({ clave, valor, guardadoEn: Date.now() }));

export const outboxTodos = () => operar("outbox", "readonly", (s) => s.getAll());
export const outboxGet = (id) => operar("outbox", "readonly", (s) => s.get(id));
export const outboxPut = (item) => operar("outbox", "readwrite", (s) => s.put(item));
export const outboxDelete = (id) => operar("outbox", "readwrite", (s) => s.delete(id));

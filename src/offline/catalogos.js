import api from "../api/axiosConfig";
import { kvGetEntrada, kvSet } from "./db";
import { esErrorDeRed, hayRed } from "./conexion";
import { usuarioActual } from "./outbox";

// Reemplazo directo de api.get(): con internet pide al servidor y guarda una
// copia en IndexedDB; sin internet devuelve la última copia guardada.
// Devuelve { data, desdeCache, guardadoEn } (se usa igual que res.data).
// La copia se guarda por usuario, porque algunas respuestas dependen de quién inició sesión.
const clave = (ruta, params) =>
  `cat:${usuarioActual()?.usuarioId ?? "anon"}:${ruta}?${JSON.stringify(params ?? {})}`;

async function leerCopia(k) {
  try {
    return await kvGetEntrada(k);
  } catch {
    return null; // sin IndexedDB
  }
}

// Con { esperarGuardado: true } (precarga) el error al guardar la copia se propaga:
// así solo se avisa "listo" cuando la copia realmente quedó guardada en la tablet.
export async function getCatalogo(ruta, config, { esperarGuardado = false } = {}) {
  const k = clave(ruta, config?.params);
  const copia = await leerCopia(k);

  // Sin conexión (modo avión / sin Wi-Fi): usar la copia al instante, sin esperar al servidor
  if (copia && !hayRed() && !esperarGuardado) {
    return { data: copia.valor, desdeCache: true, guardadoEn: copia.guardadoEn };
  }

  try {
    // Con copia guardada no vale la pena esperar 20 s si la señal es mala: 5 s y se usa la copia
    const cfg = copia && !esperarGuardado ? { timeout: 5000, ...config } : config;
    const res = await api.get(ruta, cfg);
    const guardado = kvSet(k, res.data);
    if (esperarGuardado) await guardado;
    else guardado.catch(() => {}); // si no se puede guardar, no afecta al usuario
    return { data: res.data, desdeCache: false };
  } catch (err) {
    if (!esErrorDeRed(err)) throw err;
    if (copia) return { data: copia.valor, desdeCache: true, guardadoEn: copia.guardadoEn };
    throw err;
  }
}

// Catálogos que necesitan los formularios; se descargan por adelantado con
// internet para que ya estén en la tablet cuando se pierda la señal.
const RUTAS_PRECARGA = [
  "/Usuarios/mi-perfil",
  "/Personal",
  "/Personal/operadores",
  "/Personal/supervisores",
  "/UnidadesTransporte",
  "/Ciclos",
  "/Materiales",
  "/Motivos",
];

// Devuelve null si no se pudo intentar o si no hay conexión con el servidor (no se muestra
// ningún aviso); si no, { fallidas: [rutas que el servidor rechazó o no se pudieron guardar] }.
// Listas "extra" que usa el formulario de parada para ligar un parte de trabajo real.
// Se descargan en segundo plano; si fallan no se avisa (no son obligatorias).
const RUTAS_OPCIONALES = ["/Formulario"];

export async function precargarCatalogos() {
  if (!hayRed() || !localStorage.getItem("token")) return null;
  const resultados = await Promise.allSettled(
    RUTAS_PRECARGA.map((r) => getCatalogo(r, undefined, { esperarGuardado: true }))
  );
  RUTAS_OPCIONALES.forEach((r) => getCatalogo(r).catch(() => {}));
  const rechazos = resultados.filter((r) => r.status === "rejected");
  if (rechazos.some((r) => esErrorDeRed(r.reason))) return null; // sin conexión: sin aviso
  const fallidas = RUTAS_PRECARGA.filter((_, i) => resultados[i].status === "rejected");
  return { fallidas };
}

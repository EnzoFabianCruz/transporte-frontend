import { useSyncExternalStore } from "react";
import { outboxTodos, outboxGet, outboxPut, outboxDelete } from "./db";
import { rolEsAdmin } from "../utils/permisos";

// Bandeja de salida: registros (partes/paradas) creados sin conexión.
// Forma de cada item:
//  { id, tipo: "parte"|"parada", numeroLocal, payload, form: {cabecera, detalles},
//    usuarioId, usuarioNombre, creadoEn, estado: "pendiente"|"error", mensaje, intentos }

let pendientes = [];
const oyentes = new Set();
const canal = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("transporte-outbox") : null;

function emitir() {
  oyentes.forEach((fn) => fn());
}

export async function recargarPendientes() {
  try {
    const todos = await outboxTodos();
    pendientes = (todos || []).sort((a, b) => a.creadoEn - b.creadoEn);
  } catch {
    // Sin IndexedDB: se conserva lo que haya en memoria
  }
  emitir();
  return pendientes;
}

if (canal) canal.onmessage = () => recargarPendientes();

const notificarOtrasPestanas = () => canal?.postMessage("cambio");

export const getPendientes = () => pendientes;

function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function usePendientes() {
  return useSyncExternalStore(suscribir, getPendientes, getPendientes);
}

// ---- Usuario actual (la tablet puede compartirse entre varios usuarios) ----
export function usuarioActual() {
  try {
    return JSON.parse(localStorage.getItem("usuario"));
  } catch {
    return null;
  }
}

// Cada usuario ve y sincroniza solo lo suyo; el Admin ve y sincroniza todo
export function pendientesPropios(lista = pendientes) {
  const u = usuarioActual();
  if (!u) return [];
  if (rolEsAdmin(u.rol)) return lista;
  return lista.filter((p) => p.usuarioId === u.usuarioId);
}

export function usePendientesPropios() {
  const todos = usePendientes();
  return pendientesPropios(todos);
}

// ---- Numeración local ----
// Mientras no hay servidor, el registro lleva un número provisional (PEND-T-0001).
// Al sincronizar se reemplaza por el número real que asigna el servidor.
export const esNumeroLocal = (n) => /^PEND-/.test(String(n ?? "").trim());

// Cada tipo lleva su propio contador: PEND-T-0001, PEND-T-0002... y PEND-P-0001, PEND-P-0002...
// Cuando la bandeja queda vacía (todo se envió) la numeración vuelve a empezar desde 1.
// Con registros pendientes nunca se reinicia, para que una parada no apunte por error a otro parte.
const CLAVE_SEQ = { parte: "offline_seq_parte", parada: "offline_seq_parada" };

function generarNumeroLocal(tipo, hayPendientes) {
  if (!hayPendientes) {
    localStorage.setItem(CLAVE_SEQ.parte, "0");
    localStorage.setItem(CLAVE_SEQ.parada, "0");
  }
  const clave = CLAVE_SEQ[tipo];
  const siguiente = (parseInt(localStorage.getItem(clave) || "0", 10) || 0) + 1;
  localStorage.setItem(clave, String(siguiente));
  return `PEND-${tipo === "parte" ? "T" : "P"}-${String(siguiente).padStart(4, "0")}`;
}

const nuevoId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const CAMPO_NUMERO = { parte: "numeroParte", parada: "numeroParada" };

export async function agregarPendiente({ tipo, payload, form, usuario }) {
  const campo = CAMPO_NUMERO[tipo];
  const existentes = await outboxTodos().catch(() => pendientes);
  const numeroLocal = generarNumeroLocal(tipo, (existentes || []).length > 0);
  const item = {
    id: nuevoId(),
    tipo,
    numeroLocal,
    payload: { ...payload, [campo]: numeroLocal },
    form: { ...form, cabecera: { ...form.cabecera, [campo]: numeroLocal } },
    usuarioId: usuario?.usuarioId ?? null,
    usuarioNombre: usuario?.nombre || usuario?.nombreUsuario || "",
    creadoEn: Date.now(),
    estado: "pendiente",
    mensaje: "",
    intentos: 0,
  };
  await outboxPut(item);
  await recargarPendientes();
  notificarOtrasPestanas();
  return item;
}

export const obtenerPendiente = (id) => outboxGet(id);

export async function actualizarPendiente(id, cambios) {
  const actual = await outboxGet(id);
  if (!actual) return null;
  const nuevo = { ...actual, ...cambios, id: actual.id };
  await outboxPut(nuevo);
  await recargarPendientes();
  notificarOtrasPestanas();
  return nuevo;
}

export async function eliminarPendiente(id) {
  await outboxDelete(id);
  await recargarPendientes();
  notificarOtrasPestanas();
}

// Parte de trabajo pendiente buscado por su número provisional (para las paradas)
export const partePendientePorNumero = (numero) =>
  pendientesPropios().find(
    (p) => p.tipo === "parte" && String(p.numeroLocal).trim() === String(numero ?? "").trim()
  ) || null;

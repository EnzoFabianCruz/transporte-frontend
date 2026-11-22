import { useSyncExternalStore } from "react";
import api from "../api/axiosConfig";
import { hayRed } from "./conexion";
import {
  getPendientes,
  recargarPendientes,
  actualizarPendiente,
  eliminarPendiente,
  pendientesPropios,
} from "./outbox";
import { procesarCola } from "./syncCore";
import { precargarCatalogos } from "./catalogos";

const RUTAS = {
  parte: {
    registrar: "/Formulario/registrar",
    siguiente: "/Formulario/siguiente-numero",
    campo: "numeroParte",
  },
  parada: {
    registrar: "/ParteParada/registrar",
    siguiente: "/ParteParada/siguiente-numero",
    campo: "numeroParada",
  },
};

const deps = {
  siguienteNumero: async (tipo) => {
    const r = RUTAS[tipo];
    const res = await api.get(r.siguiente);
    return res.data?.[r.campo];
  },
  registrar: async (tipo, payload) => (await api.post(RUTAS[tipo].registrar, payload)).data,
  guardar: (item) => actualizarPendiente(item.id, item),
  eliminar: eliminarPendiente,
  // Paradas guardadas que apuntan al parte provisional -> pasan a apuntar al número real
  reasignarReferencia: async (local, real) => {
    const dependientes = getPendientes().filter(
      (p) => p.tipo === "parada" && String(p.payload?.numeroParte ?? "").trim() === local
    );
    for (const p of dependientes) {
      await actualizarPendiente(p.id, {
        payload: { ...p.payload, numeroParte: real },
        form: { ...p.form, cabecera: { ...p.form.cabecera, numeroParte: real } },
      });
    }
  },
};

// ---- Estado observable (para la barra de conexión y para refrescar listas) ----
let estado = {
  sincronizando: false,
  sesionExpirada: false,
  ultimoResultado: null, // { enviados, errores, detenidoPor, en }
  version: 0, // sube cada vez que se envía algo; las listas lo usan para recargarse
  catalogos: null, // descarga de listas al iniciar sesión: { cargando } | { fallidas, en }
};
const oyentes = new Set();

function cambiarEstado(parcial) {
  estado = { ...estado, ...parcial };
  oyentes.forEach((fn) => fn());
}

const suscribir = (fn) => {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
};
export const useEstadoSync = () => useSyncExternalStore(suscribir, () => estado);

// Evita que dos pestañas envíen a la vez los mismos registros
function conBloqueo(fn) {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("transporte-sync", { ifAvailable: true }, (lock) =>
      lock ? fn() : null
    );
  }
  return fn();
}

export async function sincronizar({ incluirErrores = false } = {}) {
  if (!localStorage.getItem("token") || !hayRed() || estado.sincronizando) return null;

  return conBloqueo(async () => {
    cambiarEstado({ sincronizando: true });
    try {
      const todos = await recargarPendientes();
      const propios = pendientesPropios(todos);
      const cola = propios.filter((i) => incluirErrores || i.estado !== "error");
      if (cola.length === 0) {
        cambiarEstado({ sesionExpirada: false });
        return null;
      }

      const resultado = await procesarCola({ cola, todos, deps });
      await recargarPendientes();

      cambiarEstado({
        sesionExpirada: resultado.detenidoPor === "sesion",
        ultimoResultado: { ...resultado, en: Date.now() },
        version: estado.version + (resultado.enviados > 0 ? 1 : 0),
      });
      return resultado;
    } finally {
      cambiarEstado({ sincronizando: false });
    }
  });
}

// Marca un registro con error como pendiente otra vez y lo reenvía
export const reintentarListas = async () => {
  cambiarEstado({ catalogos: { cargando: true } });
  const r = await precargarCatalogos();
  cambiarEstado({ catalogos: r ? { ...r, en: Date.now() } : null });
};

export async function reintentar(id) {
  await actualizarPendiente(id, { estado: "pendiente", mensaje: "" });
  return sincronizar();
}

// Arranque: sincroniza al abrir la app, al volver el internet, al volver a la
// pestaña y cada 30 s mientras haya algo pendiente. Devuelve la función de limpieza.
export function iniciarSincronizacionAutomatica() {
  const hayPorEnviar = () => pendientesPropios().some((p) => p.estado !== "error");
  const intentar = () => {
    if (hayPorEnviar()) sincronizar();
  };

  // Al iniciar sesión / abrir la app: descarga las listas y avisa si los formularios quedaron listos
  const descargarListas = async () => {
    cambiarEstado({ catalogos: { cargando: true } });
    const r = await precargarCatalogos();
    if (!r) cambiarEstado({ catalogos: null });
    if (r) cambiarEstado({ catalogos: { ...r, en: Date.now() } });
  };
  cambiarEstado({ catalogos: null });
  recargarPendientes().then(() => {
    descargarListas();
    sincronizar();
  });

  const alVolverRed = () => {
    precargarCatalogos();
    sincronizar();
  };
  const alVolverAPestana = () => {
    if (document.visibilityState === "visible") intentar();
  };

  window.addEventListener("online", alVolverRed);
  document.addEventListener("visibilitychange", alVolverAPestana);
  const temporizador = setInterval(intentar, 30000);

  return () => {
    window.removeEventListener("online", alVolverRed);
    document.removeEventListener("visibilitychange", alVolverAPestana);
    clearInterval(temporizador);
  };
}

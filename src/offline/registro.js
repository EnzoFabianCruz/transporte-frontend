import api from "../api/axiosConfig";
import { esErrorDeRed, hayRed } from "./conexion";
import { agregarPendiente, actualizarPendiente, esNumeroLocal } from "./outbox";
import { sincronizar } from "./sync";

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

// Tiempo máximo para el intento directo: con señal mala es mejor guardar local y seguir
const TIMEOUT_ENVIO_MS = 10000;

/**
 * Registra un parte/parada nuevo. Con internet lo envía al servidor; si no hay
 * conexión (o la petición falla por red) lo guarda en la tablet para enviarlo después.
 * Si se pasa pendienteId, actualiza ese registro pendiente en vez de crear uno nuevo.
 * Devuelve { guardadoLocal }. Los errores del servidor (400, 403...) se propagan.
 */
export async function registrarConRespaldo({ tipo, payload, form, usuario, pendienteId }) {
  const ruta = RUTAS[tipo];
  let motivo = "red";

  if (!pendienteId && hayRed()) {
    try {
      const enviar = { ...payload };
      const numero = String(enviar[ruta.campo] ?? "").trim();
      if (!numero || esNumeroLocal(numero)) {
        const res = await api.get(ruta.siguiente, { timeout: TIMEOUT_ENVIO_MS });
        enviar[ruta.campo] = res.data?.[ruta.campo];
      }
      await api.post(ruta.registrar, enviar, { timeout: TIMEOUT_ENVIO_MS });
      return { guardadoLocal: false };
    } catch (err) {
      // Sin red, o sesión vencida: se guarda local para no perder lo digitado.
      // Cualquier otro error del servidor (400, 403...) se muestra al usuario.
      if (err.response?.status === 401) motivo = "sesion";
      else if (!esErrorDeRed(err)) throw err;
    }
  }

  try {
    if (pendienteId) {
      await actualizarPendiente(pendienteId, { payload, form, estado: "pendiente", mensaje: "" });
    } else {
      await agregarPendiente({ tipo, payload, form, usuario });
    }
  } catch {
    throw new Error(
      "No se pudo guardar el registro en la tablet. Revisa el espacio disponible o conéctate a internet."
    );
  }

  if (hayRed()) sincronizar(); // por si el internet ya volvió
  return { guardadoLocal: true, motivo };
}

// Lógica pura de sincronización (sin React ni red directa) para poder probarla.
// Recibe las dependencias por parámetro: siguienteNumero, registrar, guardar, eliminar.

const esTransitorio = (estado) => estado === 408 || estado === 429 || estado >= 500;

export function mensajeDeError(err) {
  const d = err?.response?.data;
  if (typeof d === "string" && d.trim() && d.length < 300) return d;
  if (d?.mensaje) return d.mensaje;
  if (d?.errors && typeof d.errors === "object") {
    const primeros = Object.values(d.errors).flat().filter(Boolean).slice(0, 3);
    if (primeros.length) return primeros.join(" · ");
  }
  if (d?.title) return d.title;
  return `El servidor rechazó el registro (HTTP ${err?.response?.status ?? "?"})`;
}

const CAMPO_NUMERO = { parte: "numeroParte", parada: "numeroParada" };

const esLocal = (n) => /^PEND-/.test(n);

// Copia del item (parada) apuntando al número real del parte de trabajo
const conParteReal = (item, real) => ({
  ...item,
  payload: { ...item.payload, numeroParte: real },
  form: item.form && { ...item.form, cabecera: { ...item.form.cabecera, numeroParte: real } },
});

/**
 * cola:  items a enviar en esta pasada.
 * todos: toda la bandeja (para saber de qué partes pendientes dependen las paradas).
 * Devuelve { enviados, errores, detenidoPor: null | "red" | "sesion" | "servidor" }.
 */
export async function procesarCola({ cola, todos, deps }) {
  const resultado = { enviados: 0, errores: 0, detenidoPor: null };

  // número provisional del parte -> número real asignado por el servidor
  const numerosReales = new Map();
  const partesPendientes = new Set(
    todos.filter((i) => i.tipo === "parte").map((i) => String(i.numeroLocal).trim())
  );

  // Primero los partes de trabajo (las paradas pueden depender de ellos), luego por antigüedad
  const ordenados = [...cola].sort((a, b) =>
    a.tipo === b.tipo ? a.creadoEn - b.creadoEn : a.tipo === "parte" ? -1 : 1
  );

  const guardarSiCambia = async (item, cambios) => {
    const cambio = Object.keys(cambios).some((k) => item[k] !== cambios[k]);
    if (cambio) await deps.guardar({ ...item, ...cambios });
  };

  for (let item of ordenados) {
    const campo = CAMPO_NUMERO[item.tipo];
    const ref = item.tipo === "parada" ? String(item.payload.numeroParte ?? "").trim() : "";

    // Parada ligada a un parte que ya se envió en esta pasada: usar su número real
    if (ref && numerosReales.has(ref)) item = conParteReal(item, numerosReales.get(ref));

    // Una parada ligada a un parte que aún no se envió espera a ese parte
    if (ref && partesPendientes.has(ref) && !numerosReales.has(ref)) {
      await guardarSiCambia(item, {
        mensaje: `Esperando que se envíe el parte de trabajo N° ${ref}`,
      });
      continue;
    }

    // Parada ligada a un parte provisional que ya no existe (se eliminó): no se puede enviar
    if (ref && esLocal(ref) && !partesPendientes.has(ref) && !numerosReales.has(ref)) {
      await deps.guardar({
        ...item,
        estado: "error",
        mensaje: `El parte de trabajo ${ref} ya no existe. Edita la parada y elige otro parte.`,
      });
      resultado.errores++;
      continue;
    }

    try {
      // El número real lo da el servidor al momento de enviar (nunca se envía el PEND-...)
      const nuevoNumero = await deps.siguienteNumero(item.tipo);
      if (!nuevoNumero) {
        await guardarSiCambia(item, {
          mensaje: "No se pudo obtener el siguiente número del servidor",
        });
        resultado.detenidoPor = "servidor";
        break;
      }

      const payload = { ...item.payload, [campo]: nuevoNumero };

      const respuesta = await deps.registrar(item.tipo, payload);

      if (item.tipo === "parte") {
        const real = String(respuesta?.[campo] ?? nuevoNumero).trim();
        const local = String(item.numeroLocal).trim();
        numerosReales.set(local, real);
        // Deja guardado el número real en las paradas que lo referencian (también las que
        // hoy están con error), para que un reintento posterior ya apunte al parte correcto
        await deps.reasignarReferencia?.(local, real);
      }
      await deps.eliminar(item.id);
      resultado.enviados++;
    } catch (err) {
      const estado = err?.response?.status;

      if (!err?.response) {
        resultado.detenidoPor = "red"; // sin internet: se reintenta luego, tal cual
        break;
      }
      if (estado === 401) {
        resultado.detenidoPor = "sesion";
        break;
      }
      if (esTransitorio(estado)) {
        await deps.guardar({
          ...item,
          intentos: (item.intentos || 0) + 1,
          mensaje: `El servidor no pudo procesarlo ahora (HTTP ${estado}). Se reintentará.`,
        });
        resultado.detenidoPor = "servidor";
        break;
      }
      // 400/403/404/409...: el servidor lo rechazó; requiere revisión del usuario
      await deps.guardar({
        ...item,
        estado: "error",
        intentos: (item.intentos || 0) + 1,
        mensaje: mensajeDeError(err),
      });
      resultado.errores++;
    }
  }

  return resultado;
}

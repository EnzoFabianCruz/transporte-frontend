export const CODIGO_SITUACION_REGISTRADO = "10";
export const CODIGO_SITUACION_APROBADO = "20";
export const CODIGO_SITUACION_ANULADO = "90";

export function esSituacionAnulada(situacion) {
  return situacion?.trim() === CODIGO_SITUACION_ANULADO;
}

export function esSituacionAprobada(situacion) {
  return situacion?.trim() === CODIGO_SITUACION_APROBADO;
}

// Solo se puede aprobar si está Registrado (10 o vacío); no si ya está Aprobado o Anulado
export function puedeAprobarse(situacion) {
  const valor = situacion?.trim();
  return !valor || valor === CODIGO_SITUACION_REGISTRADO;
}

export function estadoLabel(situacion) {
  if (esSituacionAnulada(situacion)) return "Anulado";
  if (esSituacionAprobada(situacion)) return "Aprobado";
  return "Registrado";
}

export function estadoBadgeClass(situacion) {
  if (esSituacionAnulada(situacion)) return "badge badge-anulado";
  if (esSituacionAprobada(situacion)) return "badge badge-aprobado";
  return "badge badge-registrado";
}
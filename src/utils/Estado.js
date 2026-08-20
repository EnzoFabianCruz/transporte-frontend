// Código de situación "90" = Anulado. Cualquier otro valor (o vacío) = Registrado.
export const CODIGO_SITUACION_ANULADO = "90";

export function esSituacionAnulada(situacion) {
  return situacion?.trim() === CODIGO_SITUACION_ANULADO;
}

export function estadoLabel(situacion) {
  return esSituacionAnulada(situacion) ? "Anulado" : "Registrado";
}

export function estadoBadgeClass(situacion) {
  return esSituacionAnulada(situacion) ? "badge badge-anulado" : "badge badge-registrado";
}
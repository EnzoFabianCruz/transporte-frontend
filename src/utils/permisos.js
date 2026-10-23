// Normaliza: sin tildes, sin espacios sobrantes, en minúsculas
export const normalizarRol = (r) =>
  (r || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const rolEsAdmin = (r) => normalizarRol(r).startsWith("admin");
export const rolEsSupervisor = (r) => normalizarRol(r).includes("supervis");

// Fecha local yyyy-MM-dd (toISOString usa UTC y en Lima puede dar el día siguiente)
const formatoFecha = (d) => {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
};

export const hoyLocal = () => formatoFecha(new Date());

export const ayerLocal = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatoFecha(d);
};

// Admin: siempre. Operador/Supervisor: solo si la fecha es hoy o ayer.
export const puedeModificarPorFecha = (rol, fecha) => {
  if (rolEsAdmin(rol)) return true;
  if (!fecha) return false;
  const f = String(fecha).substring(0, 10);
  return f === hoyLocal() || f === ayerLocal();
};

export const MENSAJE_SOLO_CONSULTA =
  "Solo se pueden modificar registros de hoy o de ayer. Este registro es de solo consulta.";
// Reconocimiento de las columnas que devuelve Sp_operaciones_parada_formato.
// Si el SP usa otro nombre para algún campo, agrégalo (en minúsculas y sin espacios,
// tildes ni guiones) a la lista de ese campo.
const CANDIDATOS = {
  parte: ["numeroparada", "numparada", "nroparada", "noparada", "numeroparte", "numparte", "nroparte", "noparte", "parte", "parada"],
  fecha: ["fechaparada", "fechaparte", "fecha"],
  turno: ["turno"],
  equipo: ["equipo", "codigounidad", "unidad", "volquete", "volq"],
  operador: ["operador", "nombreoperador", "operadorpor", "nombrecompleto"],
  supervisor: ["supervisor", "nombresupervisor", "supervisadopor"],
  placa: ["placa"],
  horaInicial: ["horainicial", "horainicio", "hinicial", "inicio"],
  horaFinal: ["horafinal", "horafin", "hfinal", "fin"],
  total: ["totalhoras", "tothoras", "totalhora", "total", "horas"],
  motivo: ["motivo", "descripcionmotivo", "nombremotivo", "desmotivo", "motivoparada"],
  observacion: ["observacion", "observaciond", "observaciones", "obs"],
};

const normalizar = (t) =>
  String(t)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Devuelve el nombre real de la columna que corresponde a cada campo (o null)
export function detectarColumnas(columnas) {
  const norm = columnas.map((c) => ({ real: c, n: normalizar(c) }));
  const mapa = {};
  const usadas = new Set();
  for (const [campo, candidatos] of Object.entries(CANDIDATOS)) {
    let hallada = null;
    for (const cand of candidatos) {
      hallada = norm.find((c) => c.n === cand && !usadas.has(c.real));
      if (hallada) break;
    }
    mapa[campo] = hallada ? hallada.real : null;
    if (hallada) usadas.add(hallada.real);
  }
  return mapa;
}


// Para mostrar el parte diario hacen falta, como mínimo, el N° de parte, la hora inicial y el motivo
export function puedeMostrarseComoParteDiario(columnas) {
  const m = detectarColumnas(columnas);
  return !!(m.parte && m.horaInicial && m.motivo);
}

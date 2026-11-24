import { detectarColumnas } from "../utils/parteDiarioColumnas";

// Vista "Parte diario de paradas": un bloque por parte con su cabecera
// (N° parte, fecha, turno, equipo, operador, supervisor, placa) y debajo sus paradas
// (hora inicial, hora final, total horas, motivo, observación).
//
// El SP devuelve filas planas (una por parada, con los datos del parte repetidos),
// así que aquí se agrupan por N° de parte. Las columnas se buscan por nombre en
// utils/parteDiarioColumnas.js; si el SP usa otro nombre, se agrega a su lista allí.
const vacio = (v) => v === null || v === undefined || String(v).trim() === "";

const texto = (v) => (vacio(v) ? "" : String(v).trim());

const RE_FECHA_HORA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

// dd/mm/yyyy sin pasar por Date (evita desfases de zona horaria)
function fechaCorta(v) {
  if (vacio(v)) return "";
  const m = RE_FECHA_HORA.exec(String(v)) || /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : texto(v);
}

// Horas: 16.45 (número) -> "16.45"; "16:45:00" -> "16:45"; fecha-hora ISO -> "16:45"
function formatearHora(v, rellenar = false) {
  if (vacio(v)) return "";
  if (typeof v === "number") {
    const t = v.toFixed(2);
    return rellenar ? t.padStart(5, "0") : t;
  }
  const s = String(v).trim();
  const iso = RE_FECHA_HORA.exec(s);
  if (iso) return `${iso[4]}:${iso[5]}`;
  if (/^\d{2}:\d{2}:\d{2}/.test(s)) return s.substring(0, 5);
  return s;
}

// El SP ya devuelve "Dia" / "Noche"; también se aceptan los códigos D / N
const etiquetaTurno = (v) => {
  const t = texto(v).toUpperCase();
  if (t === "D" || t === "DIA" || t === "DÍA") return "Día";
  if (t === "N" || t === "NOCHE") return "Noche";
  return texto(v);
};

export default function ParteDiarioParadas({ resultado }) {
  const m = detectarColumnas(resultado.columnas);

  // Agrupa preservando el orden en que llegan las filas
  const grupos = [];
  const porClave = new Map();
  resultado.filas.forEach((fila, i) => {
    const clave = texto(fila[m.parte]) || `fila-${i}`;
    let g = porClave.get(clave);
    if (!g) {
      g = { clave, cabecera: fila, paradas: [] };
      porClave.set(clave, g);
      grupos.push(g);
    }
    if (!vacio(fila[m.horaInicial]) || !vacio(fila[m.motivo])) g.paradas.push(fila);
  });

  const dato = (fila, campo) => (m[campo] ? fila[m[campo]] : null);

  return (
    <div className="pd">
      <h3 className="pd-titulo">
        Parte diario de paradas desde el {fechaCorta(resultado.fechaDesde)} al{" "}
        {fechaCorta(resultado.fechaHasta)}
      </h3>

      {grupos.length === 0 ? (
        <div className="empty-state">No hay datos para el rango seleccionado</div>
      ) : (
        <div className="pd-lista">
          {grupos.map((g) => (
            <section className="pd-parte" key={g.clave}>
              <div className="pd-cab">
                <div className="pd-item">
                  <span className="pd-label">N° Parte</span>
                  <span className="pd-valor cell-mono">{texto(g.cabecera[m.parte])}</span>
                </div>
                {m.fecha && (
                  <div className="pd-item">
                    <span className="pd-label">Fecha</span>
                    <span className="pd-valor">{fechaCorta(dato(g.cabecera, "fecha"))}</span>
                  </div>
                )}
                {m.turno && (
                  <div className="pd-item">
                    <span className="pd-label">Turno</span>
                    <span className="pd-valor">{etiquetaTurno(dato(g.cabecera, "turno"))}</span>
                  </div>
                )}
                {m.equipo && (
                  <div className="pd-item">
                    <span className="pd-label">Equipo</span>
                    <span className="pd-valor cell-mono">{texto(dato(g.cabecera, "equipo"))}</span>
                  </div>
                )}
                {m.operador && (
                  <div className="pd-item pd-item-ancho">
                    <span className="pd-label">Operador</span>
                    <span className="pd-valor">{texto(dato(g.cabecera, "operador"))}</span>
                  </div>
                )}
                {m.supervisor && (
                  <div className="pd-item pd-item-ancho">
                    <span className="pd-label">Supervisor</span>
                    <span className="pd-valor">{texto(dato(g.cabecera, "supervisor"))}</span>
                  </div>
                )}
                {m.placa && (
                  <div className="pd-item">
                    <span className="pd-label">Placa</span>
                    <span className="pd-valor cell-mono">{texto(dato(g.cabecera, "placa"))}</span>
                  </div>
                )}
              </div>

              <div className="pd-tabla-wrap">
                <table className="pd-tabla">
                  <thead>
                    <tr>
                      <th className="pd-col-hora">Hora inicial</th>
                      <th className="pd-col-hora">Hora final</th>
                      <th className="pd-col-hora">Total horas</th>
                      <th>Motivo</th>
                      <th>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.paradas.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="cell-muted">
                          Sin paradas registradas
                        </td>
                      </tr>
                    ) : (
                      g.paradas.map((p, i) => (
                        <tr key={i}>
                          <td className="pd-col-hora cell-mono">{formatearHora(dato(p, "horaInicial"))}</td>
                          <td className="pd-col-hora cell-mono">{formatearHora(dato(p, "horaFinal"))}</td>
                          <td className="pd-col-hora cell-mono">{formatearHora(dato(p, "total"), true)}</td>
                          <td>{texto(dato(p, "motivo"))}</td>
                          <td>{texto(dato(p, "observacion"))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
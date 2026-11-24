import { useRef, useState } from "react";
import api from "../api/axiosConfig";
import { esErrorDeRed, useOnline, MENSAJE_SIN_CONEXION } from "../offline/conexion";
import { hoyLocal } from "../utils/permisos";
import Layout from "../components/Layout";
import ParteDiarioParadas from "../components/ParteDiarioParadas";
import { puedeMostrarseComoParteDiario } from "../utils/parteDiarioColumnas";
import "../styles/Reportes.css";

// Reportes: SOLO con conexión. No usa getCatalogo ni IndexedDB, así que nada se guarda en la tablet.
const TIPOS = [
  { id: "horas", label: "Horas por fecha", usaTurno: false },
  { id: "produccion", label: "Producción", usaTurno: true },
  { id: "paradas", label: "Paradas", usaTurno: true },
];

const FORMATOS_PARADA = [
  { id: "parte", label: "Parte diario" },
  { id: "detalle", label: "Detalle" },
  { id: "resumen", label: "Resumen" },
];

const RE_FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

// Muestra fechas legibles y deja el resto de valores como vienen del SP
function formatearValor(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "number") return v.toLocaleString("es-PE", { maximumFractionDigits: 2 });
  if (typeof v === "string" && RE_FECHA_HORA.test(v)) {
    const d = new Date(v);
    if (isNaN(d)) return v;
    return v.substring(11, 19) === "00:00:00" ? d.toLocaleDateString() : d.toLocaleString();
  }
  return String(v);
}

export default function Reportes() {
  const enLinea = useOnline();

  const [tipo, setTipo] = useState("horas");
  const [fechaDesde, setFechaDesde] = useState(hoyLocal());
  const [fechaHasta, setFechaHasta] = useState(hoyLocal());
  const [turno, setTurno] = useState("T");
  const [formato, setFormato] = useState("parte");

  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const idPeticion = useRef(0); // para ignorar respuestas viejas si se genera otro reporte antes

  const tipoActual = TIPOS.find((t) => t.id === tipo);
  // En paradas, solo el "Parte diario" recibe turno; Detalle y Resumen solo reciben fechas
  const mostrarTurno = tipoActual.usaTurno && !(tipo === "paradas" && formato !== "parte");

  // Paradas en formato "Parte diario" -> vista agrupada por parte (si se reconocen las columnas)
  const esParteDiario =
    !!resultado &&
    resultado.reporte === "paradas" &&
    resultado.formato === "parte" &&
    puedeMostrarseComoParteDiario(resultado.columnas);

  const cambiarTipo = (id) => {
    idPeticion.current++;
    setTipo(id);
    setResultado(null);
    setError("");
    setCargando(false);
  };

  const generar = async () => {
    if (!enLinea) {
      setError(MENSAJE_SIN_CONEXION);
      return;
    }
    if (!fechaDesde || !fechaHasta) {
      setError("Debes indicar la fecha desde y la fecha hasta");
      return;
    }
    if (fechaDesde > fechaHasta) {
      setError("La fecha desde no puede ser mayor que la fecha hasta");
      return;
    }

    const miId = ++idPeticion.current;
    setCargando(true);
    setError("");
    setResultado(null);

    try {
      const params = { fechaDesde, fechaHasta };
      if (mostrarTurno) params.turno = turno;
      if (tipo === "paradas") params.formato = formato;

      // Los reportes pueden tardar: el timeout de 20 s de axiosConfig es para los formularios
      const resp = await api.get(`/Reportes/${tipo}`, { params, timeout: 180000 });
      if (miId !== idPeticion.current) return;
      setResultado(resp.data);
    } catch (err) {
      if (miId !== idPeticion.current) return;
      if (esErrorDeRed(err)) setError(MENSAJE_SIN_CONEXION);
      else if (err.response?.status === 401) setError("Tu sesión expiró, vuelve a iniciar sesión");
      else if (err.response?.status === 403) setError("No tienes permiso para ver los reportes");
      else {
        // Se muestra también el detalle técnico (error de SQL) para poder diagnosticar
        const d = err.response?.data;
        setError(
          d?.mensaje
            ? d.detalle
              ? `${d.mensaje}: ${d.detalle}`
              : d.mensaje
            : "No se pudo generar el reporte"
        );
      }
    } finally {
      if (miId === idPeticion.current) setCargando(false);
    }
  };

  return (
    <Layout title="Reportes">
      <div className="seccion-nav">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={"seccion-nav-link" + (tipo === t.id ? " is-active" : "")}
            onClick={() => cambiarTipo(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!enLinea && (
        <div className="message message-error">
          Los reportes solo están disponibles con conexión a internet.
        </div>
      )}

      <div className="searchbar">
        <div className="date-filter">
          <label className="cell-muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
            Desde
          </label>
          <input
            className="input"
            type="date"
            value={fechaDesde}
            max={fechaHasta || undefined}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>
        <div className="date-filter">
          <label className="cell-muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
            Hasta
          </label>
          <input
            className="input"
            type="date"
            value={fechaHasta}
            min={fechaDesde || undefined}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>

        {tipo === "paradas" && (
          <div className="date-filter">
            <label className="cell-muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
              Formato
            </label>
            <select
              className="select"
              value={formato}
              onChange={(e) => {
                setFormato(e.target.value);
                setResultado(null);
              }}
            >
              {FORMATOS_PARADA.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {mostrarTurno && (
          <div className="date-filter">
            <label className="cell-muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
              Turno
            </label>
            <select className="select" value={turno} onChange={(e) => setTurno(e.target.value)}>
              <option value="T">Todos</option>
              <option value="D">Día</option>
              <option value="N">Noche</option>
            </select>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={cargando || !enLinea}
          onClick={generar}
        >
          {cargando ? "Generando..." : "Generar"}
        </button>
      </div>

      {error && <div className="message message-error">{error}</div>}

      {resultado && esParteDiario && (
        <ParteDiarioParadas resultado={resultado} />
      )}

      {resultado && !esParteDiario && (
        <>
          {resultado.formato === "parte" && (
            <div className="message message-error">
              No se reconocieron las columnas del parte diario; se muestra la tabla simple.
              Columnas recibidas: {resultado.columnas.join(", ")}
            </div>
          )}
          <p className="cell-muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
            {resultado.totalFilas} fila{resultado.totalFilas === 1 ? "" : "s"}
          </p>
          <div className="table-wrap table-wrap-scroll">
            <table>
              <thead>
                <tr>
                  {resultado.columnas.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultado.filas.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(resultado.columnas.length, 1)}>
                      <div className="empty-state">No hay datos para el rango seleccionado</div>
                    </td>
                  </tr>
                ) : (
                  resultado.filas.map((fila, i) => (
                    <tr key={i}>
                      {resultado.columnas.map((c) => (
                        <td key={c}>{formatearValor(fila[c])}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
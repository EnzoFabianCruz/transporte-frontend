import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import Layout from "../components/Layout";
import { estadoLabel, estadoBadgeClass, puedeAprobarse } from "../utils/estado";
import {
  rolEsAdmin,
  rolEsSupervisor,
  puedeModificarPorFecha,
  MENSAJE_SOLO_CONSULTA,
} from "../utils/permisos";

export default function ListaPartes() {
  const [partes, setPartes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 400); // espera 400ms tras dejar de escribir
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [error, setError] = useState("");
  const [cargandoInicial, setCargandoInicial] = useState(true); // solo la primera carga muestra "Cargando..."
  const [buscando, setBuscando] = useState(false); // búsquedas posteriores solo bajan la opacidad

  // Catálogos para resolver nombres a partir de los códigos que trae cada parte
  const [unidades, setUnidades] = useState([]);
  const [operadores, setOperadores] = useState([]);

  const { usuario } = useAuth();
  const navigate = useNavigate();
  const esAdmin = rolEsAdmin(usuario?.rol);
  const esSupervisor = rolEsSupervisor(usuario?.rol);
  const puedeAprobar = esAdmin || esSupervisor;

  // Parte seleccionado y si el usuario puede modificarlo (hoy/ayer para operador y supervisor; Admin siempre)
  const parteSeleccionado = partes.find((p) => p.numeroParte === seleccionado) || null;
  const puedeModificar =
    !!parteSeleccionado && puedeModificarPorFecha(usuario?.rol, parteSeleccionado.fechaParte);

const handleAprobar = async (parte) => {
  if (!puedeModificarPorFecha(usuario?.rol, parte.fechaParte)) {
    alert(MENSAJE_SOLO_CONSULTA);
    return;
  }
  try {
    await api.patch(`/Formulario/${parte.numeroParte.trim()}/aprobar`);
    cargarPartes(busquedaDebounced, fechaDesde, fechaHasta);
  } catch (err) {
    alert(err.response?.data?.mensaje || "Error al aprobar el parte");
  }
};
  // Carga los catálogos una sola vez (igual que en FormularioParte)
  useEffect(() => {
    api
      .get("/UnidadesTransporte")
      .then((res) => setUnidades(res.data))
      .catch(() => {});

    api
      .get("/Personal/operadores")
      .then((res) => setOperadores(res.data))
      .catch(() => {});
  }, []);

  // Mapas código -> nombre para pintar la tabla sin buscar en el arreglo en cada render
  const volquetePorCodigo = unidades.reduce((mapa, u) => {
    mapa[u.codigoUnidad] = u.volq;
    return mapa;
  }, {});

  const operadorPorCodigo = operadores.reduce((mapa, o) => {
    mapa[o.codigoPersonal] = o.nombreCompleto;
    return mapa;
  }, {});

  // Se dispara automáticamente cada vez que cambia el valor "debounced" o las fechas
  useEffect(() => {
    cargarPartes(busquedaDebounced, fechaDesde, fechaHasta);
  }, [busquedaDebounced, fechaDesde, fechaHasta]);

  const cargarPartes = async (textoBusqueda = "", desde = "", hasta = "") => {
    setBuscando(true);
    setError("");
    setSeleccionado(null);
    try {
      const params = {};
      if (textoBusqueda) params.busqueda = textoBusqueda;
      if (desde) params.fechaDesde = desde;
      if (hasta) params.fechaHasta = hasta;

      const respuesta = await api.get("/Formulario", { params });
      setPartes(respuesta.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Tu sesión expiró, vuelve a iniciar sesión");
      } else {
        setError("No se pudo cargar la lista de partes");
      }
    } finally {
      setBuscando(false);
      setCargandoInicial(false);
    }
  };

  const handleEliminar = async () => {
    if (!seleccionado) return;
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar el parte N° ${seleccionado.trim()}? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      await api.delete(`/Formulario/${seleccionado.trim()}`);
      cargarPartes(busquedaDebounced, fechaDesde, fechaHasta);
    } catch (err) {
      alert(err.response?.data?.mensaje || "Error al eliminar el parte");
    }
  };

  return (
    <Layout title="Partes de Trabajo">
      {/* Filtro de búsqueda en tiempo real */}
      <div className="searchbar">
        <input
          className="input"
          type="text"
          placeholder="Buscar por N° parte, unidad, código, operador, turno..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
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
        {(busqueda || fechaDesde || fechaHasta) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setBusqueda("");
              setFechaDesde("");
              setFechaHasta("");
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {cargandoInicial && <p className="cell-muted">Cargando...</p>}
      {error && <div className="message message-error">{error}</div>}

      {!cargandoInicial && !error && (
        <div style={{ opacity: buscando ? 0.5 : 1, transition: "opacity 0.15s" }}>
          <div className="table-wrap table-wrap-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>N° Parte</th>
                  <th>Fecha</th>
                  <th>Unidad</th>
                  <th>Turno</th>
                  <th>Operador</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {partes.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">No hay partes que coincidan con la búsqueda</div>
                    </td>
                  </tr>
                ) : (
                  partes.map((p) => (
                    <tr
                      key={p.numeroParte}
                      onClick={() => setSeleccionado(p.numeroParte)}
                      className={seleccionado === p.numeroParte ? "is-selected" : ""}
                    >
                      <td>
                        <input
                          type="radio"
                          name="seleccion"
                          checked={seleccionado === p.numeroParte}
                          onChange={() => setSeleccionado(p.numeroParte)}
                        />
                      </td>
                      <td className="cell-mono">{p.numeroParte?.trim()}</td>
                      <td>{p.fechaParte ? new Date(p.fechaParte).toLocaleDateString() : "-"}</td>
                      <td className="cell-mono">
                        {volquetePorCodigo[p.codigoUnidad?.trim()] || "-"}
                      </td>
                      <td>
                        {p.turno?.trim() === "D" && <span className="badge badge-day">Día</span>}
                        {p.turno?.trim() === "N" && <span className="badge badge-night">Noche</span>}
                        {!p.turno?.trim() && <span className="cell-muted">-</span>}
                      </td>
                      <td className="cell-mono">
                        {operadorPorCodigo[p.codigoAnalitico?.trim()] || "-"}
                      </td>
                      <td>
                        <span className={estadoBadgeClass(p.situacionParte)}>
                          {estadoLabel(p.situacionParte)}
                        </span>
                        {puedeAprobar && puedeAprobarse(p.situacionParte) && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ marginLeft: 8 }}
                            disabled={!puedeModificarPorFecha(usuario?.rol, p.fechaParte)}
                            title={
                              puedeModificarPorFecha(usuario?.rol, p.fechaParte)
                                ? "Aprobar parte"
                                : "Solo se pueden aprobar registros de hoy o de ayer"
                            }
                            onClick={(e) => {
                              e.stopPropagation(); // evita que se seleccione la fila al hacer clic
                              handleAprobar(p);
                            }}
                          >
                            Aprobar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="actions-row">
            <button className="btn btn-primary" onClick={() => navigate("/formulario")}>
              + Agregar
            </button>
            <button
              className="btn btn-secondary"
              disabled={!puedeModificar}
              title={seleccionado && !puedeModificar ? MENSAJE_SOLO_CONSULTA : ""}
              onClick={() => navigate(`/formulario/${seleccionado.trim()}?modo=editar`)}
            >
              Modificar
            </button>
            <button
              className="btn btn-secondary"
              disabled={!seleccionado}
              onClick={() => navigate(`/formulario/${seleccionado.trim()}?modo=ver`)}
            >
              Consultar
            </button>
            {esAdmin && (
              <button className="btn btn-danger" disabled={!seleccionado} onClick={handleEliminar}>
                Eliminar
              </button>
            )}
          </div>

          {seleccionado && !puedeModificar && (
            <p className="cell-muted" style={{ fontSize: 12.5, marginTop: 8 }}>
              {MENSAJE_SOLO_CONSULTA}
            </p>
          )}
        </div>
      )}
    </Layout>
  );
}
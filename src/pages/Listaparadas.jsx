import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import SeccionNav from "../components/SeccionNav";

export default function ListaParadas() {
  const [paradas, setParadas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 400); // espera 400ms tras dejar de escribir
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [error, setError] = useState("");
  const [cargandoInicial, setCargandoInicial] = useState(true); // solo la primera carga muestra "Cargando..."
  const [buscando, setBuscando] = useState(false); // búsquedas posteriores solo bajan la opacidad

  // Catálogos para resolver nombres a partir de los códigos que trae cada parada
  const [unidades, setUnidades] = useState([]);
  const [operadores, setOperadores] = useState([]);

  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const esAdmin = usuario?.rol === "Admin";

  // Carga los catálogos una sola vez (igual que en ListaPartes)
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
    cargarParadas(busquedaDebounced, fechaDesde, fechaHasta);
  }, [busquedaDebounced, fechaDesde, fechaHasta]);

  const cargarParadas = async (textoBusqueda = "", desde = "", hasta = "") => {
    setBuscando(true);
    setError("");
    setSeleccionado(null);
    try {
      const params = {};
      if (textoBusqueda) params.busqueda = textoBusqueda;
      if (desde) params.fechaDesde = desde;
      if (hasta) params.fechaHasta = hasta;

      const respuesta = await api.get("/ParteParada", { params });
      setParadas(respuesta.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Tu sesión expiró, vuelve a iniciar sesión");
      } else {
        setError("No se pudo cargar la lista de paradas");
      }
    } finally {
      setBuscando(false);
      setCargandoInicial(false);
    }
  };

  const handleEliminar = async () => {
    if (!seleccionado) return;
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar la parada N° ${seleccionado.trim()}? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      await api.delete(`/ParteParada/${seleccionado.trim()}`);
      cargarParadas(busquedaDebounced, fechaDesde, fechaHasta);
    } catch (err) {
      alert(err.response?.data?.mensaje || "Error al eliminar la parada");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Partes de Parada</h2>
        <div className="user-chip">
          <span>
            <strong>{usuario?.nombre || usuario?.nombreUsuario}</strong>{" "}
            <span className={`badge ${usuario?.rol === "Admin" ? "badge-role-admin" : "badge-role-usuario"}`}>
              {usuario?.rol}
            </span>
          </span>
          <button className="btn btn-ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <SeccionNav />

      {/* Filtro de búsqueda en tiempo real */}
      <div className="searchbar">
        <input
          className="input"
          type="text"
          placeholder="Buscar por N° parada, unidad, código, operador, turno..."
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
                  <th>N° Parada</th>
                  <th>Fecha</th>
                  <th>Unidad</th>
                  <th>Turno</th>
                  <th>Operador</th>
                </tr>
              </thead>
              <tbody>
                {paradas.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">No hay paradas que coincidan con la búsqueda</div>
                    </td>
                  </tr>
                ) : (
                  paradas.map((p) => (
                    <tr
                      key={p.numeroParada}
                      onClick={() => setSeleccionado(p.numeroParada)}
                      className={seleccionado === p.numeroParada ? "is-selected" : ""}
                    >
                      <td>
                        <input
                          type="radio"
                          name="seleccion"
                          checked={seleccionado === p.numeroParada}
                          onChange={() => setSeleccionado(p.numeroParada)}
                        />
                      </td>
                      <td className="cell-mono">{p.numeroParada?.trim()}</td>
                      <td>{p.fechaParada ? new Date(p.fechaParada).toLocaleDateString() : "-"}</td>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="actions-row">
            <button className="btn btn-primary" disabled title="Disponible próximamente">
              + Agregar
            </button>
            <button className="btn btn-secondary" disabled title="Disponible próximamente">
              Modificar
            </button>
            <button className="btn btn-secondary" disabled title="Disponible próximamente">
              Consultar
            </button>
            {esAdmin && (
              <button className="btn btn-danger" disabled={!seleccionado} onClick={handleEliminar}>
                Eliminar
              </button>
            )}
          </div>
          <p className="cell-muted" style={{ fontSize: 12.5, marginTop: 10 }}>
            El formulario de Parte de Parada (Agregar/Modificar/Consultar) todavía no está disponible — por ahora solo
            se puede consultar la lista y eliminar registros existentes.
          </p>
        </div>
      )}
    </div>
  );
}
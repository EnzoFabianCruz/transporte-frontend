import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";

export default function ListaPartes() {
  const [partes, setPartes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 400); // espera 400ms tras dejar de escribir
  const [seleccionado, setSeleccionado] = useState(null);
  const [error, setError] = useState("");
  const [cargandoInicial, setCargandoInicial] = useState(true); // solo la primera carga muestra "Cargando..."
  const [buscando, setBuscando] = useState(false); // búsquedas posteriores solo bajan la opacidad

  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const esAdmin = usuario?.rol === "Admin";

  // Se dispara automáticamente cada vez que cambia el valor "debounced"
  useEffect(() => {
    cargarPartes(busquedaDebounced);
  }, [busquedaDebounced]);

  const cargarPartes = async (textoBusqueda = "") => {
    setBuscando(true);
    setError("");
    setSeleccionado(null);
    try {
      const respuesta = await api.get("/Formulario", {
        params: textoBusqueda ? { busqueda: textoBusqueda } : {},
      });
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
      cargarPartes(busquedaDebounced);
    } catch (err) {
      alert(err.response?.data?.mensaje || "Error al eliminar el parte");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Partes de Trabajo</h2>
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

      {/* Filtro de búsqueda en tiempo real */}
      <div className="searchbar">
        <input
          className="input"
          type="text"
          placeholder="Buscar por N° parte, unidad, código, operador, turno..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button type="button" className="btn btn-secondary" onClick={() => setBusqueda("")}>
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
                  <th>Hora inicio</th>
                  <th>Hora final</th>
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
                      <td className="cell-mono">{p.codigoUnidad?.trim() || "-"}</td>
                      <td>
                        {p.turno?.trim() === "D" && <span className="badge badge-day">Día</span>}
                        {p.turno?.trim() === "N" && <span className="badge badge-night">Noche</span>}
                        {!p.turno?.trim() && <span className="cell-muted">-</span>}
                      </td>
                      <td className="cell-mono">{p.horaInicial ?? "-"}</td>
                      <td className="cell-mono">{p.horafinal ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={() => navigate("/formulario")}>
              + Agregar
            </button>
            <button
              className="btn btn-secondary"
              disabled={!seleccionado}
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
        </div>
      )}
    </div>
  );
}
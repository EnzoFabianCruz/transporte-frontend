import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { useDebounce } from "../hooks/useDebounce";
import { estadoLabel, estadoBadgeClass } from "../utils/estado";
import "../styles/FormularioParte.css";

const detalleVacio = {
  horaInicial: "",
  horaFinal: "",
  codigoMotivo: "",
};

const cabeceraVacia = {
  numeroParte: "",
  fechaParada: "",
  turno: "D",
  situacionParada: "",
  codigoUnidad: "",
  codigoAnalitico: "",
  iHorometro: "",
  iCombustible: "",
  iRegimen: "",
  iReserva: "",
  fHorometro: "",
  fCombustible: "",
  fRegimen: "",
  fReserva: "",
  supervisadopor: "",
};

export default function FormularioParada() {
  const { usuario, logout } = useAuth();
  const { numeroParada } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const modo = numeroParada ? searchParams.get("modo") || "editar" : "crear"; // "crear" | "editar" | "ver"
  const soloLectura = modo === "ver";

  const [operadores, setOperadores] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(!!numeroParada);
  const [buscandoParte, setBuscandoParte] = useState(false);
  const [avisoParte, setAvisoParte] = useState(""); // mensaje de estado al buscar el N° Parte

  // Modal selector de Parte de Trabajo (abre con doble clic en el campo N° Parte)
  const [mostrarSelectorParte, setMostrarSelectorParte] = useState(false);
  const [listaPartesSelector, setListaPartesSelector] = useState([]);
  const [cargandoSelector, setCargandoSelector] = useState(false);
  const [busquedaSelector, setBusquedaSelector] = useState("");
  const busquedaSelectorDebounced = useDebounce(busquedaSelector, 400);

  const [cabecera, setCabecera] = useState(cabeceraVacia);
  const [detalles, setDetalles] = useState([{ ...detalleVacio }]);

  // Cargar catálogos para los selectores (Operador, Supervisado, Unidad, Motivo)
  useEffect(() => {
    api
      .get("/Personal/operadores")
      .then((res) => setOperadores(res.data))
      .catch(() => setError("No se pudo cargar la lista de operadores"));

    api
      .get("/Personal/supervisores")
      .then((res) => setSupervisores(res.data))
      .catch(() => setError("No se pudo cargar la lista de supervisores"));

    api
      .get("/UnidadesTransporte")
      .then((res) => setUnidades(res.data))
      .catch(() => setError("No se pudo cargar la lista de unidades"));

    api
      .get("/Motivos")
      .then((res) => setMotivos(res.data))
      .catch(() => setError("No se pudo cargar la lista de motivos"));
  }, []);

  // Mapas código -> nombre, reutilizando los catálogos ya cargados, para pintar la tabla del modal selector
  const volquetePorCodigoSelector = unidades.reduce((mapa, u) => {
    mapa[u.codigoUnidad] = u.volq;
    return mapa;
  }, {});

  const operadorPorCodigoSelector = operadores.reduce((mapa, o) => {
    mapa[o.codigoPersonal] = o.nombreCompleto;
    return mapa;
  }, {});

  // Si hay numeroParada (editar/ver), cargar los datos existentes
  useEffect(() => {
    if (!numeroParada) return;

    setCargandoDatos(true);
    api
      .get(`/ParteParada/${numeroParada}`)
      .then((res) => {
        const d = res.data;
        setCabecera({
          numeroParada: d.numeroParada?.trim() || "",
          numeroParte: d.numeroParte?.trim() || "",
          fechaParada: d.fechaParada ? d.fechaParada.substring(0, 10) : "",
          turno: d.turno?.trim() || "D",
          situacionParada: d.situacionParada?.trim() || "",
          codigoUnidad: d.codigoUnidad?.trim() || "",
          codigoAnalitico: d.codigoAnalitico?.trim() || "",
          iHorometro: d.iHorometro ?? "",
          iCombustible: d.iCombustible ?? "",
          iRegimen: d.iRegimen ?? "",
          iReserva: d.iReserva ?? "",
          fHorometro: d.fHorometro ?? "",
          fCombustible: d.fCombustible ?? "",
          fRegimen: d.fRegimen ?? "",
          fReserva: d.fReserva ?? "",
          supervisadopor: d.supervisadopor?.trim() || "",
        });
        setDetalles(
          d.detalles && d.detalles.length > 0
            ? d.detalles.map((det) => ({
                horaInicial: det.horaInicial ?? "",
                horaFinal: det.horaFinal ?? "",
                codigoMotivo: det.codigoMotivo?.trim() || "",
              }))
            : [{ ...detalleVacio }]
        );
      })
      .catch(() => setError("No se pudo cargar el parte de parada"))
      .finally(() => setCargandoDatos(false));
  }, [numeroParada]);

  // Si estamos creando uno nuevo, traer el número de parada sugerido
  useEffect(() => {
    if (modo === "crear") {
      api
        .get("/ParteParada/siguiente-numero")
        .then((res) => {
          setCabecera((prev) => ({ ...prev, numeroParada: res.data.numeroParada }));
        })
        .catch(() => {});
    }
  }, [modo]);

  const handleCabeceraChange = (e) => {
    setCabecera({ ...cabecera, [e.target.name]: e.target.value });
  };

  // Busca un Parte de Trabajo por número y autocompleta la cabecera de la parada
  // con los mismos datos (fecha, turno, unidad, operador, supervisado, situación).
  // La usan tanto el onBlur del campo de texto como la selección desde el modal.
  const autocompletarDesdeParte = async (numero) => {
    setAvisoParte("");
    if (!numero) return;

    setBuscandoParte(true);
    try {
      const res = await api.get(`/Formulario/${numero}`);
      const d = res.data;
      setCabecera((prev) => ({
        ...prev,
        numeroParte: numero,
        fechaParada: d.fechaParte ? d.fechaParte.substring(0, 10) : prev.fechaParada,
        turno: d.turno?.trim() || prev.turno,
        codigoUnidad: d.codigoUnidad?.trim() || prev.codigoUnidad,
        codigoAnalitico: d.codigoAnalitico?.trim() || prev.codigoAnalitico,
        supervisadopor: d.supervisadopor?.trim() || prev.supervisadopor,
        situacionParada: d.situacionParte?.trim() || prev.situacionParada,
      }));
      setAvisoParte(`Datos cargados del Parte de Trabajo N° ${numero}`);
    } catch (err) {
      if (err.response?.status === 404) {
        setAvisoParte(`No se encontró el Parte de Trabajo N° ${numero}`);
      } else {
        setAvisoParte("No se pudo consultar el Parte de Trabajo");
      }
    } finally {
      setBuscandoParte(false);
    }
  };

  // Al perder el foco del campo N° Parte (tecleado manualmente), autocompleta igual que el selector
  const handleNumeroParteBlur = () => {
    autocompletarDesdeParte(cabecera.numeroParte?.trim());
  };

  // Doble clic en el campo N° Parte abre el modal con la lista de partes de trabajo
  const abrirSelectorParte = () => {
    if (soloLectura) return;
    setBusquedaSelector("");
    setMostrarSelectorParte(true);
  };

  const cerrarSelectorParte = () => setMostrarSelectorParte(false);

  // Cargar la lista de partes de trabajo dentro del modal (se repite al buscar)
  useEffect(() => {
    if (!mostrarSelectorParte) return;

    setCargandoSelector(true);
    api
      .get("/Formulario", { params: busquedaSelectorDebounced ? { busqueda: busquedaSelectorDebounced } : {} })
      .then((res) => setListaPartesSelector(res.data))
      .catch(() => setListaPartesSelector([]))
      .finally(() => setCargandoSelector(false));
  }, [mostrarSelectorParte, busquedaSelectorDebounced]);

  // Doble clic sobre una fila del modal: selecciona ese parte, cierra la ventana y autocompleta
  const seleccionarParteDesdeModal = (numero) => {
    setMostrarSelectorParte(false);
    autocompletarDesdeParte(numero?.trim());
  };

  const handleDetalleChange = (index, e) => {
    const nuevos = [...detalles];
    nuevos[index][e.target.name] = e.target.value;
    setDetalles(nuevos);
  };

  const agregarDetalle = () => setDetalles([...detalles, { ...detalleVacio }]);

  const quitarDetalle = (index) => {
    if (detalles.length === 1) return;
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");
    setEnviando(true);

    const payload = {
      ...cabecera,
      numeroParte: cabecera.numeroParte?.trim() || null,
      situacionParada: cabecera.situacionParada || null,
      iHorometro: cabecera.iHorometro ? parseFloat(cabecera.iHorometro) : null,
      iCombustible: cabecera.iCombustible ? parseFloat(cabecera.iCombustible) : null,
      iRegimen: cabecera.iRegimen ? parseFloat(cabecera.iRegimen) : null,
      iReserva: cabecera.iReserva ? parseInt(cabecera.iReserva) : null,
      fHorometro: cabecera.fHorometro ? parseFloat(cabecera.fHorometro) : null,
      fCombustible: cabecera.fCombustible ? parseFloat(cabecera.fCombustible) : null,
      fRegimen: cabecera.fRegimen ? parseFloat(cabecera.fRegimen) : null,
      fReserva: cabecera.fReserva ? parseInt(cabecera.fReserva) : null,
      detalles: detalles.map((d) => ({
        horaInicial: d.horaInicial ? parseFloat(d.horaInicial) : null,
        horaFinal: d.horaFinal ? parseFloat(d.horaFinal) : null,
        codigoMotivo: d.codigoMotivo || null,
      })),
    };

    try {
      if (modo === "editar") {
        await api.put(`/ParteParada/${cabecera.numeroParada}`, payload);
        setMensaje("Parada actualizada correctamente");
      } else {
        await api.post("/ParteParada/registrar", payload);
        setMensaje("Parada registrada correctamente");
      }
      setTimeout(() => navigate("/paradas"), 1200);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Tu sesión expiró, vuelve a iniciar sesión");
      } else {
        setError(err.response?.data?.mensaje || "Error al guardar la parada");
      }
    } finally {
      setEnviando(false);
    }
  };

  const titulo =
    modo === "crear"
      ? "Nuevo Parte de Parada"
      : modo === "editar"
      ? "Modificar Parte de Parada"
      : "Consultar Parte de Parada";

  if (cargandoDatos) return <p className="page cell-muted">Cargando...</p>;

  return (
    <div className="page formulario-parte-page">
      <div className="page-header">
        <h2>{titulo}</h2>
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

      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => navigate("/paradas")}
        style={{ marginBottom: 16, paddingLeft: 0 }}
      >
        ← Volver a la lista
      </button>

      <div className="card">
        <fieldset
          disabled={soloLectura}
          style={{ border: "none", margin: 0, padding: 0, width: "100%", minWidth: 0 }}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="form-section-title">Datos generales</div>
              <div className="grid-3">
                {/* Fila 1: Vínculo con el Parte de Trabajo */}
                <div className="field">
                  <label>N° Parte (Trabajo)</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      className="input input-mono"
                      type="text"
                      name="numeroParte"
                      value={cabecera.numeroParte || ""}
                      onChange={handleCabeceraChange}
                      onBlur={handleNumeroParteBlur}
                      onDoubleClick={abrirSelectorParte}
                      placeholder="N° de parte de trabajo relacionado"
                      maxLength={10}
                      readOnly={soloLectura}
                    />
                    {!soloLectura && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={abrirSelectorParte}
                        title="Buscar parte de trabajo"
                        style={{ padding: "0 12px" }}
                      >
                        …
                      </button>
                    )}
                  </div>
                  {buscandoParte && (
                    <span className="cell-muted" style={{ fontSize: 12 }}>
                      Buscando...
                    </span>
                  )}
                  {!buscandoParte && avisoParte && (
                    <span className="cell-muted" style={{ fontSize: 12 }}>
                      {avisoParte}
                    </span>
                  )}
                </div>
                {/* Fila 1 (cont.): Identificación de la parada */}
                <div className="field">
                  <label>N° Parada</label>
                  <input
                    className="input input-mono"
                    type="text"
                    name="numeroParada"
                    value={cabecera.numeroParada || ""}
                    readOnly
                  />
                </div>
                <div className="field">
                  <label>Fecha</label>
                  <input
                    className="input"
                    type="date"
                    name="fechaParada"
                    value={cabecera.fechaParada}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div className="field">
                  <label>Turno</label>
                  <div>
                    <label style={{ marginRight: 12 }}>
                      <input
                        type="radio"
                        name="turno"
                        value="D"
                        checked={cabecera.turno === "D"}
                        onChange={handleCabeceraChange}
                      />{" "}
                      Día
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="turno"
                        value="N"
                        checked={cabecera.turno === "N"}
                        onChange={handleCabeceraChange}
                      />{" "}
                      Noche
                    </label>
                  </div>
                </div>

                {/* Fila 2: Personal y unidad */}
                <div className="field">
                  <label>Operador</label>
                  <select
                    className="select"
                    name="codigoAnalitico"
                    value={cabecera.codigoAnalitico}
                    onChange={handleCabeceraChange}
                  >
                    <option value="">-- Seleccione --</option>
                    {operadores.map((o) => (
                      <option key={o.codigoPersonal} value={o.codigoPersonal}>
                        {o.nombreCompleto}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Supervisado</label>
                  <select
                    className="select"
                    name="supervisadopor"
                    value={cabecera.supervisadopor}
                    onChange={handleCabeceraChange}
                  >
                    <option value="">-- Seleccione --</option>
                    {supervisores.map((s) => (
                      <option key={s.codigoPersonal} value={s.codigoPersonal}>
                        {s.nombreCompleto}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Unidad</label>
                  <select
                    className="select"
                    name="codigoUnidad"
                    value={cabecera.codigoUnidad}
                    onChange={handleCabeceraChange}
                  >
                    <option value="">-- Seleccione --</option>
                    {unidades.map((u) => (
                      <option key={u.codigoUnidad} value={u.codigoUnidad}>
                        {u.volq} - {u.placa}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fila 3: Situación */}
                <div className="field">
                  <label>Situación</label>
                  <input
                    className="input"
                    type="text"
                    name="situacionParada"
                    value={cabecera.situacionParada}
                    onChange={handleCabeceraChange}
                    maxLength={2}
                  />
                </div>
                <div></div>
                <div></div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">Lectura inicial</div>
              <div className="grid-3">
                <div className="field">
                  <label>Horómetro inicial</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    name="iHorometro"
                    value={cabecera.iHorometro}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div className="field">
                  <label>Combustible inicial</label>
                  <input
                    className="input"
                    type="number"
                    step="1"
                    name="iCombustible"
                    value={cabecera.iCombustible}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div className="field">
                  <label>Régimen inicial</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    name="iRegimen"
                    value={cabecera.iRegimen}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div className="field">
                  <label>Reserva inicial</label>
                  <input
                    className="input"
                    type="number"
                    step="1"
                    name="iReserva"
                    value={cabecera.iReserva}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div></div>
                <div></div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">Lectura final</div>
              <div className="grid-3">
                <div className="field">
                  <label>Horómetro final</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    name="fHorometro"
                    value={cabecera.fHorometro}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div className="field">
                  <label>Combustible final</label>
                  <input
                    className="input"
                    type="number"
                    step="1"
                    name="fCombustible"
                    value={cabecera.fCombustible}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div className="field">
                  <label>Régimen final</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    name="fRegimen"
                    value={cabecera.fRegimen}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div className="field">
                  <label>Reserva final</label>
                  <input
                    className="input"
                    type="number"
                    step="1"
                    name="fReserva"
                    value={cabecera.fReserva}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div></div>
                <div></div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">Detalle de paradas</div>

              <p className="cell-muted" style={{ fontSize: 12, margin: "4px 0 8px" }}>
                Desliza el detalle hacia los lados para ver todas las columnas →
              </p>

              <div className="table-wrap parte-grid">
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>HORA INICIAL</th>
                      <th>HORA FINAL</th>
                      <th>MOTIVO</th>
                      {!soloLectura && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((d, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            name="horaInicial"
                            value={d.horaInicial}
                            onChange={(e) => handleDetalleChange(i, e)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            name="horaFinal"
                            value={d.horaFinal}
                            onChange={(e) => handleDetalleChange(i, e)}
                          />
                        </td>
                        <td>
                          <select
                            name="codigoMotivo"
                            value={d.codigoMotivo}
                            onChange={(e) => handleDetalleChange(i, e)}
                          >
                            <option value="">-- Seleccione --</option>
                            {motivos.map((m) => (
                              <option key={m.codigo} value={m.codigo}>
                                {m.motivo}
                              </option>
                            ))}
                          </select>
                        </td>
                        {!soloLectura && (
                          <td>
                            <button type="button" className="row-remove" onClick={() => quitarDetalle(i)}>
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!soloLectura && (
                <button type="button" className="btn btn-secondary" onClick={agregarDetalle} style={{ marginTop: 12 }}>
                  + Agregar parada
                </button>
              )}
            </div>

            {error && <div className="message message-error">{error}</div>}
            {mensaje && <div className="message message-success">{mensaje}</div>}

            {!soloLectura && (
              <button type="submit" className="btn btn-primary" disabled={enviando}>
                {enviando ? "Guardando..." : modo === "editar" ? "Guardar cambios" : "Registrar Parada"}
              </button>
            )}
          </form>
        </fieldset>
      </div>

      {mostrarSelectorParte && (
        <div className="modal-overlay" onClick={cerrarSelectorParte}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Seleccionar Parte de Trabajo</h3>
              <button type="button" className="btn btn-ghost" onClick={cerrarSelectorParte}>
                ✕
              </button>
            </div>

            <input
              className="input"
              type="text"
              autoFocus
              placeholder="Buscar por N° parte, unidad, código, operador, turno..."
              value={busquedaSelector}
              onChange={(e) => setBusquedaSelector(e.target.value)}
              style={{ marginBottom: 12 }}
            />

            <p className="cell-muted" style={{ fontSize: 12.5, margin: "0 0 10px" }}>
              Doble clic sobre una fila para seleccionarla
            </p>

            <div
              className="table-wrap table-wrap-scroll"
              style={{ opacity: cargandoSelector ? 0.5 : 1, transition: "opacity 0.15s" }}
            >
              <table>
                <thead>
                  <tr>
                    <th>N° Parte</th>
                    <th>Fecha</th>
                    <th>Unidad</th>
                    <th>Turno</th>
                    <th>Operador</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {listaPartesSelector.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          {cargandoSelector ? "Buscando..." : "No hay partes que coincidan con la búsqueda"}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    listaPartesSelector.map((p) => (
                      <tr
                        key={p.numeroParte}
                        onDoubleClick={() => seleccionarParteDesdeModal(p.numeroParte)}
                        style={{ cursor: "pointer" }}
                        title="Doble clic para seleccionar"
                      >
                        <td className="cell-mono">{p.numeroParte?.trim()}</td>
                        <td>{p.fechaParte ? new Date(p.fechaParte).toLocaleDateString() : "-"}</td>
                        <td className="cell-mono">
                          {volquetePorCodigoSelector[p.codigoUnidad?.trim()] || "-"}
                        </td>
                        <td>
                          {p.turno?.trim() === "D" && <span className="badge badge-day">Día</span>}
                          {p.turno?.trim() === "N" && <span className="badge badge-night">Noche</span>}
                          {!p.turno?.trim() && <span className="cell-muted">-</span>}
                        </td>
                        <td className="cell-mono">
                          {operadorPorCodigoSelector[p.codigoAnalitico?.trim()] || "-"}
                        </td>
                        <td>
                          <span className={estadoBadgeClass(p.situacionParte)}>
                            {estadoLabel(p.situacionParte)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

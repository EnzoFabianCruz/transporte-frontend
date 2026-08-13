import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import "../styles/FormularioParte.css";

const detalleVacio = {
  dHoroFinal: "",
  dKmFinal: "",
  codigoMaterial: "",
  codigoMineral: "",
  codigoOrigen: "",
  codigoDestino: "",
  numViajes: "",
  peso: "",
  codigoCiclo: "",
  valorCiclo: "",
  material: "",
  phoras: "",
};

const cabeceraVacia = {
  fechaParte: "",
  turno: "D",
  situacionParte: "",
  codigoUnidad: "",
  codigoAnalitico: "",
  horoInicial: "",
  horoFinal: "",
  kmInicial: "",
  kmFinal: "",
  horaInicial: "",
  horafinal: "",
  combustible: "",
  supervisadopor: "",
};

export default function FormularioParte() {
  const { usuario, logout } = useAuth();
  const { numeroParte } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const modo = numeroParte ? searchParams.get("modo") || "editar" : "crear"; // "crear" | "editar" | "ver"
  const soloLectura = modo === "ver";

  const [operadores, setOperadores] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(!!numeroParte);

  const [cabecera, setCabecera] = useState(cabeceraVacia);
  const [detalles, setDetalles] = useState([{ ...detalleVacio }]);

  // Cargar catálogos para los selectores (Operador, Supervisado, Unidad, Ciclo)
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
      .get("/Ciclos")
      .then((res) => setCiclos(res.data))
      .catch(() => setError("No se pudo cargar la lista de ciclos"));

    api
      .get("/Materiales")
      .then((res) => setMateriales(res.data))
      .catch(() => setError("No se pudo cargar la lista de materiales"));
  }, []);

  // Si hay numeroParte (editar/ver), cargar los datos existentes
  useEffect(() => {
    if (!numeroParte) return;

    setCargandoDatos(true);
    api
      .get(`/Formulario/${numeroParte}`)
      .then((res) => {
        const d = res.data;
        setCabecera({
          numeroParte: d.numeroParte?.trim() || "",
          fechaParte: d.fechaParte ? d.fechaParte.substring(0, 10) : "",
          turno: d.turno?.trim() || "D",
          situacionParte: d.situacionParte?.trim() || "",
          codigoUnidad: d.codigoUnidad?.trim() || "",
          codigoAnalitico: d.codigoAnalitico?.trim() || "",
          horoInicial: d.horoInicial ?? "",
          horoFinal: d.horoFinal ?? "",
          kmInicial: d.kmInicial ?? "",
          kmFinal: d.kmFinal ?? "",
          horaInicial: d.horaInicial ?? "",
          horafinal: d.horafinal ?? "",
          combustible: d.combustible ?? "",
          supervisadopor: d.supervisadopor?.trim() || "",
        });
        setDetalles(
          d.detalles && d.detalles.length > 0
            ? d.detalles.map((det) => ({
                dHoroFinal: det.dHoroFinal ?? "",
                dKmFinal: det.dKmFinal ?? "",
                codigoMaterial: det.codigoMaterial?.trim() || "",
                codigoMineral: det.codigoMineral?.trim() || "",
                codigoOrigen: det.codigoOrigen?.trim() || "",
                codigoDestino: det.codigoDestino?.trim() || "",
                numViajes: det.numViajes ?? "",
                peso: det.peso ?? "",
                codigoCiclo: det.codigoCiclo?.trim() || "",
                valorCiclo: det.valorCiclo?.trim() || "",
                material: det.material?.trim() || "",
                phoras: det.phoras ?? "",
              }))
            : [{ ...detalleVacio }]
        );
      })
      .catch(() => setError("No se pudo cargar el parte de trabajo"))
      .finally(() => setCargandoDatos(false));
  }, [numeroParte]);

  // Si estamos creando uno nuevo, traer el número de parte sugerido
  useEffect(() => {
    if (modo === "crear") {
      api
        .get("/Formulario/siguiente-numero")
        .then((res) => {
          setCabecera((prev) => ({ ...prev, numeroParte: res.data.numeroParte }));
        })
        .catch(() => {});
    }
  }, [modo]);

  const handleCabeceraChange = (e) => {
    setCabecera({ ...cabecera, [e.target.name]: e.target.value });
  };

  const handleDetalleChange = (index, e) => {
    const nuevos = [...detalles];
    nuevos[index][e.target.name] = e.target.value;
    setDetalles(nuevos);
  };

  // Al elegir un Ciclo, autocompleta CodigoOrigen, CodigoDestino y ValorCiclo
  const handleCicloChange = (index, codigoCiclo) => {
    const ciclo = ciclos.find((c) => c.codigoCiclo === codigoCiclo);
    const nuevos = [...detalles];
    nuevos[index] = {
      ...nuevos[index],
      codigoCiclo: codigoCiclo,
      valorCiclo: ciclo?.horas != null ? String(ciclo.horas) : "",
      codigoOrigen: ciclo?.codigoOrigen || "",
      codigoDestino: ciclo?.codigoDestino || "",
    };
    setDetalles(nuevos);
  };

  // Resuelve el nombre de origen/destino de una línea a partir del ciclo seleccionado
  const cicloDeDetalle = (d) => ciclos.find((c) => c.codigoCiclo === d.codigoCiclo);

  // Al elegir un Material, autocompleta el campo "material" (nombreM) con el nombre completo
  const handleMaterialChange = (index, codigoM) => {
    const mat = materiales.find((m) => m.codigoM === codigoM);
    const nuevos = [...detalles];
    nuevos[index] = {
      ...nuevos[index],
      codigoMaterial: codigoM,
      material: mat?.nombreM || "",
    };
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
      situacionParte: cabecera.situacionParte || null,
      horoInicial: cabecera.horoInicial ? parseFloat(cabecera.horoInicial) : null,
      horoFinal: cabecera.horoFinal ? parseFloat(cabecera.horoFinal) : null,
      kmInicial: cabecera.kmInicial ? parseFloat(cabecera.kmInicial) : null,
      kmFinal: cabecera.kmFinal ? parseFloat(cabecera.kmFinal) : null,
      horaInicial: cabecera.horaInicial ? parseFloat(cabecera.horaInicial) : null,
      horafinal: cabecera.horafinal ? parseFloat(cabecera.horafinal) : null,
      combustible: cabecera.combustible ? parseFloat(cabecera.combustible) : null,
      detalles: detalles.map((d) => ({
        dHoroFinal: d.dHoroFinal ? parseFloat(d.dHoroFinal) : null,
        dKmFinal: d.dKmFinal ? parseFloat(d.dKmFinal) : null,
        codigoMaterial: d.codigoMaterial || null,
        codigoMineral: d.codigoMineral || null,
        codigoOrigen: d.codigoOrigen || null,
        codigoDestino: d.codigoDestino || null,
        numViajes: d.numViajes ? parseInt(d.numViajes) : null,
        peso: d.peso ? parseFloat(d.peso) : null,
        codigoCiclo: d.codigoCiclo || null,
        valorCiclo: d.valorCiclo || null,
        material: d.material || null,
        phoras: d.phoras ? parseFloat(d.phoras) : null,
      })),
    };

    try {
      if (modo === "editar") {
        await api.put(`/Formulario/${cabecera.numeroParte}`, payload);
        setMensaje("Parte actualizado correctamente");
      } else {
        await api.post("/Formulario/registrar", payload);
        setMensaje("Parte registrado correctamente");
      }
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Tu sesión expiró, vuelve a iniciar sesión");
      } else {
        setError(err.response?.data?.mensaje || "Error al guardar el parte");
      }
    } finally {
      setEnviando(false);
    }
  };

  const titulo =
    modo === "crear"
      ? "Nuevo Parte de Trabajo"
      : modo === "editar"
      ? "Modificar Parte de Trabajo"
      : "Consultar Parte de Trabajo";

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
        onClick={() => navigate("/")}
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
                {/* Fila 1: Identificación del parte */}
                <div className="field">
                  <label>N° Parte</label>
                  <input
                    className="input input-mono"
                    type="text"
                    name="numeroParte"
                    value={cabecera.numeroParte || ""}
                    readOnly
                  />
                </div>
                <div className="field">
                  <label>Fecha</label>
                  <input
                    className="input"
                    type="date"
                    name="fechaParte"
                    value={cabecera.fechaParte}
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

                {/* Fila 3: Horómetro y combustible */}
                <div className="field">
                  <label>Horómetro inicial</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    name="horoInicial"
                    value={cabecera.horoInicial}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div className="field">
                  <label>Horómetro final</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    name="horoFinal"
                    value={cabecera.horoFinal}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div className="field">
                  <label>Combustible</label>
                  <input
                    className="input"
                    type="number"
                    step="0.001"
                    name="combustible"
                    value={cabecera.combustible}
                    onChange={handleCabeceraChange}
                  />
                </div>

                {/* Fila 4: Kilometraje */}
                <div className="field">
                  <label>Km inicial</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    name="kmInicial"
                    value={cabecera.kmInicial}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div className="field">
                  <label>Km final</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    name="kmFinal"
                    value={cabecera.kmFinal}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div></div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">Detalle de viajes</div>

              <p className="cell-muted" style={{ fontSize: 12, margin: "4px 0 8px" }}>
                Desliza el detalle hacia los lados para ver todas las columnas →
              </p>

              <div className="table-wrap parte-grid">
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>HORÓMETRO FINAL</th>
                      <th>KILOMETRAJE FINAL</th>
                      <th>CÓDIGO MATERIAL</th>
                      <th>MATERIAL</th>
                      <th>NÚMERO DE VALE</th>
                      <th>CICLO</th>
                      <th>HORAS</th>
                      <th>ORIGEN</th>
                      <th>DESTINO</th>
                      <th>VIAJES</th>
                      <th>TOTAL HORAS</th>
                      <th>PESO</th>
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
                            name="dHoroFinal"
                            value={d.dHoroFinal}
                            onChange={(e) => handleDetalleChange(i, e)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            name="dKmFinal"
                            value={d.dKmFinal}
                            onChange={(e) => handleDetalleChange(i, e)}
                          />
                        </td>
                        <td>
                          <select
                            value={d.codigoMaterial}
                            onChange={(e) => handleMaterialChange(i, e.target.value)}
                          >
                            <option value="">-- Seleccione --</option>
                            {materiales.map((m) => (
                              <option key={m.codigoM} value={m.codigoM}>
                                {m.abreviatura}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input type="text" value={d.material} readOnly tabIndex={-1} />
                        </td>
                        <td>
                          <input
                            type="text"
                            name="codigoMineral"
                            value={d.codigoMineral}
                            onChange={(e) => handleDetalleChange(i, e)}
                            maxLength={30}
                          />
                        </td>
                        <td>
                          <select
                            value={d.codigoCiclo}
                            onChange={(e) => handleCicloChange(i, e.target.value)}
                          >
                            <option value="">-- Seleccione --</option>
                            {ciclos.map((c) => (
                              <option key={c.codigoCiclo} value={c.codigoCiclo}>
                                {c.valor}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input type="text" value={d.valorCiclo} readOnly tabIndex={-1} />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={d.codigoOrigen ? cicloDeDetalle(d)?.nombreOrigen || "" : ""}
                            readOnly
                            tabIndex={-1}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={d.codigoDestino ? cicloDeDetalle(d)?.nombreDestino || "" : ""}
                            readOnly
                            tabIndex={-1}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            name="numViajes"
                            value={d.numViajes}
                            onChange={(e) => handleDetalleChange(i, e)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            name="phoras"
                            value={d.phoras}
                            onChange={(e) => handleDetalleChange(i, e)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            name="peso"
                            value={d.peso}
                            onChange={(e) => handleDetalleChange(i, e)}
                          />
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
                  + Agregar viaje
                </button>
              )}
            </div>

            {error && <div className="message message-error">{error}</div>}
            {mensaje && <div className="message message-success">{mensaje}</div>}

            {!soloLectura && (
              <button type="submit" className="btn btn-primary" disabled={enviando}>
                {enviando ? "Guardando..." : modo === "editar" ? "Guardar cambios" : "Registrar Parte"}
              </button>
            )}
          </form>
        </fieldset>
      </div>
    </div>
  );
}
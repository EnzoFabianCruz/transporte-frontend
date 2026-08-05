import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";

const detalleVacio = {
  dHoroFinal: "",
  dKmFinal: "",
  codigoMaterial: "",
  codigoMineral: "",
  codigoOrigen: "",
  codigoDestino: "",
  numViajes: "",
  peso: "",
};

const cabeceraVacia = {
  fechaParte: "",
  codigoUnidad: "",
  codigoAnalitico: "",
  horoInicial: "",
  kmInicial: "",
  horaInicial: "",
  horafinal: "",
  reportadopor: "",
  supervisadopor: "",
  situacionParte: "D",
};

export default function FormularioParte() {
  const { usuario, logout } = useAuth();
  const { numeroParte } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const modo = numeroParte ? searchParams.get("modo") || "editar" : "crear"; // "crear" | "editar" | "ver"
  const soloLectura = modo === "ver";

  const [personal, setPersonal] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(!!numeroParte);

  const [cabecera, setCabecera] = useState(cabeceraVacia);
  const [detalles, setDetalles] = useState([{ ...detalleVacio }]);

  // Cargar lista de personal para los selectores
  useEffect(() => {
    api
      .get("/Personal")
      .then((res) => setPersonal(res.data))
      .catch(() => setError("No se pudo cargar la lista de personal"));
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
          codigoUnidad: d.codigoUnidad?.trim() || "",
          codigoAnalitico: d.codigoAnalitico?.trim() || "",
          horoInicial: d.horoInicial ?? "",
          kmInicial: d.kmInicial ?? "",
          horaInicial: d.horaInicial ?? "",
          horafinal: d.horafinal ?? "",
          reportadopor: d.reportadopor?.trim() || "",
          supervisadopor: d.supervisadopor?.trim() || "",
          situacionParte: d.situacionParte?.trim() || "D",
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
      horoInicial: cabecera.horoInicial ? parseFloat(cabecera.horoInicial) : null,
      kmInicial: cabecera.kmInicial ? parseFloat(cabecera.kmInicial) : null,
      horaInicial: cabecera.horaInicial ? parseFloat(cabecera.horaInicial) : null,
      horafinal: cabecera.horafinal ? parseFloat(cabecera.horafinal) : null,
      detalles: detalles.map((d) => ({
        dHoroFinal: d.dHoroFinal ? parseFloat(d.dHoroFinal) : null,
        dKmFinal: d.dKmFinal ? parseFloat(d.dKmFinal) : null,
        codigoMaterial: d.codigoMaterial || null,
        codigoMineral: d.codigoMineral || null,
        codigoOrigen: d.codigoOrigen || null,
        codigoDestino: d.codigoDestino || null,
        numViajes: d.numViajes ? parseInt(d.numViajes) : null,
        peso: d.peso ? parseFloat(d.peso) : null,
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
    <div className="page">
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
        <fieldset disabled={soloLectura} style={{ border: "none", margin: 0, padding: 0 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="form-section-title">Datos generales</div>
              <div className="grid-3">
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
                  <select
                    className="select"
                    name="situacionParte"
                    value={cabecera.situacionParte}
                    onChange={handleCabeceraChange}
                  >
                    <option value="D">Día</option>
                    <option value="N">Noche</option>
                  </select>
                </div>

                <div className="field">
                  <label>Placa / Unidad</label>
                  <input
                    className="input input-mono"
                    type="text"
                    name="codigoUnidad"
                    value={cabecera.codigoUnidad}
                    onChange={handleCabeceraChange}
                    maxLength={6}
                  />
                </div>
                <div className="field">
                  <label>N° Equipo</label>
                  <input
                    className="input input-mono"
                    type="text"
                    name="codigoAnalitico"
                    value={cabecera.codigoAnalitico}
                    onChange={handleCabeceraChange}
                    maxLength={6}
                  />
                </div>
                <div></div>

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
                <div></div>

                <div className="field">
                  <label>Hora inicio</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    name="horaInicial"
                    value={cabecera.horaInicial}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div className="field">
                  <label>Hora final</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    name="horafinal"
                    value={cabecera.horafinal}
                    onChange={handleCabeceraChange}
                  />
                </div>
                <div></div>

                <div className="field">
                  <label>Operador (Reportado por)</label>
                  <select
                    className="select"
                    name="reportadopor"
                    value={cabecera.reportadopor}
                    onChange={handleCabeceraChange}
                  >
                    <option value="">-- Seleccione --</option>
                    {personal.map((p) => (
                      <option key={p.codigoPersonal} value={p.codigoPersonal}>
                        {p.nombreCompleto}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Supervisor</label>
                  <select
                    className="select"
                    name="supervisadopor"
                    value={cabecera.supervisadopor}
                    onChange={handleCabeceraChange}
                  >
                    <option value="">-- Seleccione --</option>
                    {personal.map((p) => (
                      <option key={p.codigoPersonal} value={p.codigoPersonal}>
                        {p.nombreCompleto}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">Detalle de viajes</div>
              <div className="table-wrap">
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>Horóm. final</th>
                      <th>Km final</th>
                      <th>Material</th>
                      <th>Mineral</th>
                      <th>Origen</th>
                      <th>Destino</th>
                      <th>Viajes</th>
                      <th>Peso</th>
                      {!soloLectura && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((d, i) => (
                      <tr key={i}>
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
                          <input
                            type="text"
                            name="codigoMaterial"
                            value={d.codigoMaterial}
                            onChange={(e) => handleDetalleChange(i, e)}
                            maxLength={3}
                          />
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
                          <input
                            type="text"
                            name="codigoOrigen"
                            value={d.codigoOrigen}
                            onChange={(e) => handleDetalleChange(i, e)}
                            maxLength={6}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            name="codigoDestino"
                            value={d.codigoDestino}
                            onChange={(e) => handleDetalleChange(i, e)}
                            maxLength={6}
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
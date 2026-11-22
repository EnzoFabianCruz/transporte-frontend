import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useOnline } from "../offline/conexion";
import { usePendientesPropios, eliminarPendiente } from "../offline/outbox";
import { sincronizar, reintentar, useEstadoSync } from "../offline/sync";

const formatearFecha = (ms) =>
  new Date(ms).toLocaleString([], { dateStyle: "short", timeStyle: "short" });

// Registros creados sin conexión que todavía no llegaron al servidor
export default function Pendientes() {
  const { usuario } = useAuth();
  const enLinea = useOnline();
  const pendientes = usePendientesPropios();
  const { sincronizando } = useEstadoSync();
  const navigate = useNavigate();
  const esAdmin = usuario?.rol === "Admin";

  const editar = (p) =>
    navigate(p.tipo === "parte" ? `/formulario?pendiente=${p.id}` : `/formulario-parada?pendiente=${p.id}`);

  const descartar = async (p) => {
    const ok = window.confirm(
      `¿Eliminar el registro ${p.numeroLocal}? Todavía no se envió al servidor, así que se perderá definitivamente.`
    );
    if (ok) await eliminarPendiente(p.id);
  };

  return (
    <Layout title="Registros pendientes de enviar">
      <p className="cell-muted" style={{ marginBottom: 12 }}>
        Estos registros se guardaron en esta tablet y aún no llegaron al servidor. Se envían solos
        cuando hay internet; el número definitivo se asigna al enviarlos.
      </p>

      <div className="actions-row" style={{ marginBottom: 12 }}>
        <button
          className="btn btn-primary"
          disabled={!enLinea || sincronizando || pendientes.length === 0}
          onClick={() => sincronizar({ incluirErrores: true })}
        >
          {sincronizando ? "Enviando..." : "Sincronizar ahora"}
        </button>
        {!enLinea && <span className="cell-muted">Sin conexión: se enviará al volver el internet.</span>}
      </div>

      <div className="table-wrap table-wrap-scroll">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>N° provisional</th>
              <th>Fecha</th>
              {esAdmin && <th>Usuario</th>}
              <th>Guardado</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pendientes.length === 0 ? (
              <tr>
                <td colSpan={esAdmin ? 7 : 6}>
                  <div className="empty-state">No hay registros pendientes</div>
                </td>
              </tr>
            ) : (
              pendientes.map((p) => (
                <tr key={p.id}>
                  <td>{p.tipo === "parte" ? "Parte de trabajo" : "Parte de parada"}</td>
                  <td className="cell-mono">{p.numeroLocal}</td>
                  <td>{p.form?.cabecera?.fechaParte || p.form?.cabecera?.fechaParada || "-"}</td>
                  {esAdmin && <td>{p.usuarioNombre || "-"}</td>}
                  <td>{formatearFecha(p.creadoEn)}</td>
                  <td>
                    {p.estado === "error" ? (
                      <>
                        <span className="badge badge-error">Con error</span>
                        <div className="cell-muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                          {p.mensaje}
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="badge badge-pendiente">Pendiente</span>
                        {p.mensaje && (
                          <div className="cell-muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                            {p.mensaje}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => editar(p)}>
                      Editar
                    </button>{" "}
                    {p.estado === "error" && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={!enLinea || sincronizando}
                        onClick={() => reintentar(p.id)}
                      >
                        Reintentar
                      </button>
                    )}{" "}
                    <button className="btn btn-danger btn-sm" onClick={() => descartar(p)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

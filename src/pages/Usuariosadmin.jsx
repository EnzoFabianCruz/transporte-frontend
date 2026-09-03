import { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import Layout from "../components/Layout";

const ROL_VACIO = "Usuario";

const FORM_VACIO = {
  nombreUsuario: "",
  password: "",
  nombre: "",
  email: "",
  rol: ROL_VACIO,
};

export default function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [error, setError] = useState("");
  const [cargandoInicial, setCargandoInicial] = useState(true);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarUsuarios = async () => {
    setError("");
    try {
      const respuesta = await api.get("/Auth/usuarios");
      setUsuarios(respuesta.data);
    } catch (err) {
      setError("No se pudo cargar la lista de usuarios");
    } finally {
      setCargandoInicial(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const usuarioSeleccionado = usuarios.find((u) => u.id === seleccionado) || null;

  const abrirModalNuevo = () => {
    setForm(FORM_VACIO);
    setErrorForm("");
    setMostrarModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setErrorForm("");
    setGuardando(true);
    try {
      await api.post("/Auth/registrar-usuario", {
        nombreUsuario: form.nombreUsuario,
        password: form.password,
        nombre: form.nombre || null,
        email: form.email || null,
        rol: form.rol,
      });
      setMostrarModal(false);
      await cargarUsuarios();
    } catch (err) {
      setErrorForm(err.response?.data?.mensaje || "Error al crear el usuario");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (activar) => {
    if (!usuarioSeleccionado) return;
    setError("");
    try {
      const accion = activar ? "activar" : "desactivar";
      await api.put(`/Auth/usuarios/${usuarioSeleccionado.id}/${accion}`);
      setSeleccionado(null);
      await cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo actualizar el usuario");
    }
  };

  const eliminarUsuario = async () => {
    if (!usuarioSeleccionado) return;
    const confirmar = window.confirm(
      `¿Eliminar al usuario "${usuarioSeleccionado.nombreUsuario}"? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    setError("");
    try {
      await api.delete(`/Auth/usuarios/${usuarioSeleccionado.id}`);
      setSeleccionado(null);
      await cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.mensaje || "No se pudo eliminar el usuario");
    }
  };

  return (
    <Layout title="Usuarios">
      {error && <div className="message message-error">{error}</div>}

      {cargandoInicial && <p className="cell-muted">Cargando...</p>}

      {!cargandoInicial && (
        <>
          <div className="table-wrap table-wrap-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">No hay usuarios registrados</div>
                    </td>
                  </tr>
                ) : (
                  usuarios.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setSeleccionado(u.id)}
                      className={seleccionado === u.id ? "is-selected" : ""}
                    >
                      <td>
                        <input
                          type="radio"
                          name="seleccion"
                          checked={seleccionado === u.id}
                          onChange={() => setSeleccionado(u.id)}
                        />
                      </td>
                      <td className="cell-mono">{u.nombreUsuario}</td>
                      <td>{u.nombre || "-"}</td>
                      <td>{u.email || "-"}</td>
                      <td>
                        <span className={`badge ${u.rol === "Admin" ? "badge-role-admin" : "badge-role-usuario"}`}>
                          {u.rol}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.activo ? "badge-active" : "badge-inactive"}`}>
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>{new Date(u.fechaCreacion).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="actions-row">
            <button className="btn btn-primary" onClick={abrirModalNuevo}>
              + Nuevo usuario
            </button>
            <button
              className="btn btn-secondary"
              disabled={!usuarioSeleccionado || usuarioSeleccionado.activo}
              onClick={() => cambiarEstado(true)}
            >
              Activar
            </button>
            <button
              className="btn btn-secondary"
              disabled={!usuarioSeleccionado || !usuarioSeleccionado.activo}
              onClick={() => cambiarEstado(false)}
            >
              Desactivar
            </button>
            <button className="btn btn-danger" disabled={!usuarioSeleccionado} onClick={eliminarUsuario}>
              Eliminar
            </button>
          </div>
        </>
      )}

      {mostrarModal && (
        <div className="modal-fondo" onClick={() => setMostrarModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Nuevo usuario</h2>

            <form onSubmit={handleCrearUsuario}>
              <div className="field">
                <label htmlFor="nombreUsuario">Usuario</label>
                <input
                  className="input"
                  id="nombreUsuario"
                  name="nombreUsuario"
                  type="text"
                  value={form.nombreUsuario}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="password">Contraseña</label>
                <input
                  className="input"
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="nombre">Nombre completo</label>
                <input
                  className="input"
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={form.nombre}
                  onChange={handleFormChange}
                />
              </div>

              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  className="input"
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                />
              </div>

              <div className="field">
                <label htmlFor="rol">Rol</label>
                <select className="input" id="rol" name="rol" value={form.rol} onChange={handleFormChange}>
                  <option value="Usuario">Usuario</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {errorForm && <div className="message message-error">{errorForm}</div>}

              <div className="modal-botones">
                <button type="button" className="btn btn-secondary" onClick={() => setMostrarModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? "Guardando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
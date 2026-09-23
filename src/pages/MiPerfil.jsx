import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";

export default function MiPerfil() {
  const { usuario } = useAuth();

  const [perfil, setPerfil] = useState(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState("");
  const [errorPerfil, setErrorPerfil] = useState("");

  const [passwordActual, setPasswordActual] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [mensajePassword, setMensajePassword] = useState("");
  const [errorPassword, setErrorPassword] = useState("");

  useEffect(() => {
    api
      .get("/Usuarios/mi-perfil")
      .then((res) => {
        setPerfil(res.data);
        setNombre(res.data.nombre || "");
        setEmail(res.data.email || "");
      })
      .catch(() => setErrorPerfil("No se pudo cargar tu perfil"))
      .finally(() => setCargando(false));
  }, []);

  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    setErrorPerfil("");
    setMensajePerfil("");
    setGuardandoPerfil(true);
    try {
      await api.put("/Usuarios/mi-perfil", { nombre: nombre || null, email: email || null });
      setMensajePerfil("Datos actualizados correctamente");
    } catch (err) {
      setErrorPerfil(err.response?.data?.mensaje || "No se pudo actualizar el perfil");
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    setErrorPassword("");
    setMensajePassword("");

    if (nuevaPassword !== confirmarPassword) {
      setErrorPassword("Las contraseñas nuevas no coinciden");
      return;
    }

    setGuardandoPassword(true);
    try {
      await api.put(`/Usuarios/${usuario.usuarioId}/password`, {
        passwordActual,
        nuevaPassword,
      });
      setMensajePassword("Contraseña actualizada correctamente");
      setPasswordActual("");
      setNuevaPassword("");
      setConfirmarPassword("");
    } catch (err) {
      setErrorPassword(err.response?.data?.mensaje || "No se pudo cambiar la contraseña");
    } finally {
      setGuardandoPassword(false);
    }
  };

  return (
    <Layout title="Mi perfil">
      {cargando && <p className="cell-muted">Cargando...</p>}

      {!cargando && perfil && (
        <>
          <div className="table-wrap" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>Mis datos</h3>

            <form onSubmit={handleGuardarPerfil}>
              <div className="field">
                <label>Usuario</label>
                <input className="input" value={perfil.nombreUsuario} disabled />
              </div>

              <div className="field">
                <label>Rol</label>
                <input className="input" value={perfil.rol} disabled />
              </div>

              <div className="field">
                <label htmlFor="nombre">Nombre completo</label>
                <input
                  className="input"
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="email">Correo</label>
                <input
                  className="input"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Necesario para recuperar tu contraseña"
                />
              </div>

              {errorPerfil && <div className="message message-error">{errorPerfil}</div>}
              {mensajePerfil && <div className="message message-success">{mensajePerfil}</div>}

              <button type="submit" className="btn btn-primary" disabled={guardandoPerfil}>
                {guardandoPerfil ? "Guardando..." : "Guardar datos"}
              </button>
            </form>
          </div>

          <div className="table-wrap" style={{ padding: 20 }}>
            <h3 style={{ marginTop: 0 }}>Cambiar contraseña</h3>

            <form onSubmit={handleCambiarPassword}>
              <div className="field">
                <label htmlFor="passwordActual">Contraseña actual</label>
                <input
                  className="input"
                  id="passwordActual"
                  type="password"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="nuevaPassword">Nueva contraseña</label>
                <input
                  className="input"
                  id="nuevaPassword"
                  type="password"
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="confirmarPassword">Confirmar nueva contraseña</label>
                <input
                  className="input"
                  id="confirmarPassword"
                  type="password"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  required
                />
              </div>

              {errorPassword && <div className="message message-error">{errorPassword}</div>}
              {mensajePassword && <div className="message message-success">{mensajePassword}</div>}

              <button type="submit" className="btn btn-primary" disabled={guardandoPassword}>
                {guardandoPassword ? "Guardando..." : "Cambiar contraseña"}
              </button>
            </form>
          </div>
        </>
      )}
    </Layout>
  );
}
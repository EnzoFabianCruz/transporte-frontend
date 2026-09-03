import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axiosConfig";
import "../styles/Login.css";
import logo from "../img/logo.jpeg"

export default function RestablecerPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (nuevaPassword !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (nuevaPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setCargando(true);
    try {
      await api.post("/Auth/restablecer-password", { token, nuevaPassword });
      setListo(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.mensaje || "El enlace no es válido o ya expiró");
    } finally {
      setCargando(false);
    }
  };

  if (!token) {
    return (
      <div className="login-screen">
        <div className="form-card">
          <div className="logo-slot">
            <img src="../img/logo.jpeg" alt="Logo" />
          </div>
          <h2>Enlace inválido</h2>
          <p className="subtitle">Falta el token de recuperación en el enlace</p>
          <p style={{ textAlign: "center", fontSize: 13.5 }}>
            <Link to="/recuperar-password">Solicitar un nuevo enlace</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="form-card">
        <div className="logo-slot">
          <img src={logo} alt="Logo" />
        </div>

        <h2>Nueva contraseña</h2>
        <p className="subtitle">Elige tu nueva contraseña</p>

        {listo ? (
          <p className="cell-muted">Contraseña actualizada. Redirigiendo al login...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="nuevaPassword">Nueva contraseña</label>
              <input
                id="nuevaPassword"
                type="password"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="confirmar">Confirmar contraseña</label>
              <input
                id="confirmar"
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
              />
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button type="submit" className="submit-btn" disabled={cargando}>
              {cargando ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
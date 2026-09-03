import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosConfig";
import "../styles/Login.css";
import logo from "../img/logo.jpeg"

export default function RecuperarPassword() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await api.post("/Auth/solicitar-recuperacion", { email });
      setEnviado(true);
    } catch (err) {
      setError("Ocurrió un error, intenta de nuevo");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="form-card">
        <div className="logo-slot">
          <img src={logo} alt="Logo" />
        </div>

        <h2>Recuperar contraseña</h2>
        <p className="subtitle">Ingresa el correo asociado a tu cuenta</p>

        {enviado ? (
          <p className="cell-muted">
            Si el correo está registrado, te llegará un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y spam).
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button type="submit" className="submit-btn" disabled={cargando}>
              {cargando ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: 18, fontSize: 13.5 }}>
          <Link to="/login">Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import "../styles/Login.css";
import logo from "../img/logo.jpeg"

export default function Login() {
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const respuesta = await api.post("/Auth/login", {
        nombreUsuario,
        password,
      });

      const { token, usuarioId, nombre, rol } = respuesta.data;
      login({ usuarioId, nombreUsuario, nombre, rol }, token);

      navigate("/");
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Usuario o contraseña incorrectos");
      } else {
        setError("Error al conectar con el servidor");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="form-card">
        {/*
          Coloca aquí tu imagen, por ejemplo:
          import logo from "../assets/logo-luchito.png";
          ...
          <img src={logo} alt="Transportes Luchito" className="logo-slot" />
        */}
        <div className="logo-slot">
          <img src={logo} alt="Logo" />
        </div>

        <h2>Iniciar sesión</h2>
        <p className="subtitle">Ingresa tus credenciales para continuar</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="nombreUsuario">Usuario</label>
            <input
              id="nombreUsuario"
              type="text"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="submit-btn" disabled={cargando}>
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 18, fontSize: 13.5 }}>
          <Link to="/recuperar-password">¿Olvidaste tu contraseña?</Link>
        </p>
      </div>
    </div>
  );
}
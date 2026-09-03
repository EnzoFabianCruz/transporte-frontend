import { useAuth } from "../context/AuthContext";
import SeccionNav from "./SeccionNav";

// Envuelve el header (título + chip de usuario + cerrar sesión) y el nav de
// pestañas. Cada página solo pasa su título y su contenido (tabla, filtros, etc).
// Para una página que no deba mostrar el nav de pestañas, pasar mostrarNav={false}.
export default function Layout({ title, children, mostrarNav = true }) {
  const { usuario, logout } = useAuth();

  return (
    <div className="page">
      <div className="page-header">
        <h2>{title}</h2>
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

      {mostrarNav && <SeccionNav />}

      {children}
    </div>
  );
}
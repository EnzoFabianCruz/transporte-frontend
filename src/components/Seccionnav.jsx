import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SeccionNav() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "Admin";

  return (
    <nav className="seccion-nav">
      <NavLink
        to="/"
        end
        className={({ isActive }) => "seccion-nav-link" + (isActive ? " is-active" : "")}
      >
        Parte de Trabajo
      </NavLink>
      <NavLink
        to="/paradas"
        className={({ isActive }) => "seccion-nav-link" + (isActive ? " is-active" : "")}
      >
        Parte de Parada
      </NavLink>
      {esAdmin && (
        <NavLink
          to="/usuarios"
          className={({ isActive }) => "seccion-nav-link" + (isActive ? " is-active" : "")}
        >
          Usuarios
        </NavLink>
      )}
      {/* Cuando exista Reportes, se agrega igual:
      {esAdmin && (
        <NavLink to="/reportes" className={({ isActive }) => "seccion-nav-link" + (isActive ? " is-active" : "")}>
          Reportes
        </NavLink>
      )}
      */}
    </nav>
  );
}
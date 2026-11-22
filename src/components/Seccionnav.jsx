import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePendientesPropios } from "../offline/outbox";

export default function SeccionNav() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "Admin";
  const pendientes = usePendientesPropios().length;

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
      {pendientes > 0 && (
        <NavLink
          to="/pendientes"
          className={({ isActive }) => "seccion-nav-link" + (isActive ? " is-active" : "")}
        >
          Pendientes
          <span className="nav-contador">{pendientes}</span>
        </NavLink>
      )}
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
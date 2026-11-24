import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePendientesPropios } from "../offline/outbox";
import { useOnline } from "../offline/conexion";
import { rolEsAdmin, rolEsSupervisor } from "../utils/permisos";

export default function SeccionNav() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "Admin";
  const enLinea = useOnline();
  // Reportes: solo Admin y Supervisor, y solo con conexión
  const puedeVerReportes = rolEsAdmin(usuario?.rol) || rolEsSupervisor(usuario?.rol);
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
      {puedeVerReportes && enLinea && (
        <NavLink
          to="/reportes"
          className={({ isActive }) => "seccion-nav-link" + (isActive ? " is-active" : "")}
        >
          Reportes
        </NavLink>
      )}
    </nav>
  );
}
import { NavLink } from "react-router-dom";

export default function SeccionNav() {
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
    </nav>
  );
}
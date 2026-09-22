import { useEffect, useRef, useState } from "react";
import api from "../api/axiosConfig";

// Autocompletar: escribe para filtrar, al elegir una opción devuelve el codigoPersonal
export default function BuscadorPersonal({ value, onChange, placeholder = "Buscar por nombre o código..." }) {
  const [personal, setPersonal] = useState([]);
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);

  useEffect(() => {
    api.get("/Personal").then((res) => setPersonal(res.data)).catch(() => {});
  }, []);

  // Si el value viene desde afuera (ej. al editar), muestra el nombre correspondiente
  useEffect(() => {
    if (!value) { setTexto(""); return; }
    const encontrado = personal.find((p) => p.codigoPersonal?.trim() === value?.trim());
    if (encontrado) setTexto(`${encontrado.nombreCompleto} (${encontrado.codigoPersonal.trim()})`);
  }, [value, personal]);

  useEffect(() => {
    const cerrarSiClickAfuera = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", cerrarSiClickAfuera);
    return () => document.removeEventListener("mousedown", cerrarSiClickAfuera);
  }, []);

  const coincidencias = texto.trim()
    ? personal
        .filter(
          (p) =>
            p.nombreCompleto?.toLowerCase().includes(texto.toLowerCase()) ||
            p.codigoPersonal?.trim().toLowerCase().includes(texto.toLowerCase())
        )
        .slice(0, 8)
    : [];

  const handleSeleccionar = (p) => {
    setTexto(`${p.nombreCompleto} (${p.codigoPersonal.trim()})`);
    onChange(p.codigoPersonal.trim());
    setAbierto(false);
  };

  const handleTextoChange = (e) => {
    setTexto(e.target.value);
    setAbierto(true);
    if (!e.target.value.trim()) onChange(""); // si borra todo, limpia la selección hecha
  };

  return (
    <div className="autocomplete" ref={contenedorRef}>
      <input
        className="input"
        type="text"
        value={texto}
        placeholder={placeholder}
        onChange={handleTextoChange}
        onFocus={() => setAbierto(true)}
        autoComplete="off"
      />
      {abierto && coincidencias.length > 0 && (
        <ul className="autocomplete-lista">
          {coincidencias.map((p) => (
            <li key={p.codigoPersonal} onClick={() => handleSeleccionar(p)}>
              {p.nombreCompleto} <span className="cell-muted">({p.codigoPersonal.trim()})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";

// Hook reutilizable: retrasa la actualización de un valor hasta que el usuario
// deja de escribir por "delay" milisegundos. Útil para búsquedas en tiempo real
// sin saturar el backend con una petición por cada tecla.
export function useDebounce(valor, delay = 400) {
  const [valorDebounced, setValorDebounced] = useState(valor);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setValorDebounced(valor);
    }, delay);

    return () => clearTimeout(timeout);
  }, [valor, delay]);

  return valorDebounced;
}
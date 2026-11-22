import axios from "axios";
import { useSyncExternalStore } from "react";

// navigator.onLine solo indica si hay una interfaz de red (Wi-Fi conectado);
// no garantiza internet. Por eso las peticiones que fallan sin respuesta
// (esErrorDeRed) también se tratan como "sin conexión".
export const hayRed = () => typeof navigator === "undefined" || navigator.onLine !== false;

// Error de red/timeout: la petición no llegó a recibir respuesta del servidor
export const esErrorDeRed = (err) => axios.isAxiosError(err) && !err.response;

export const MENSAJE_SIN_CONEXION =
  "Sin conexión con el servidor. Inténtalo de nuevo cuando haya internet.";

function suscribir(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnline() {
  return useSyncExternalStore(suscribir, hayRed, () => true);
}

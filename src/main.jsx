import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/global.css";

// Modo offline: el service worker solo se registra en la versión compilada
// (npm run build); en desarrollo interferiría con el recargado en caliente.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("No se pudo activar el modo offline:", err));
  });
}
// Pide al navegador que no borre los datos guardados (registros pendientes) si falta espacio
navigator.storage?.persist?.();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
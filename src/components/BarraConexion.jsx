import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOnline } from "../offline/conexion";
import { usePendientesPropios } from "../offline/outbox";
import { sincronizar, reintentarListas, useEstadoSync } from "../offline/sync";

// Franja fija arriba: avisa si no hay conexión, cuántos registros esperan
// enviarse y el resultado de la última sincronización.
function BarraPrincipal() {
  const { usuario } = useAuth();
  const enLinea = useOnline();
  const pendientes = usePendientesPropios();
  const { sincronizando, sesionExpirada, ultimoResultado } = useEstadoSync();
  const [descartado, setDescartado] = useState(null); // marca de tiempo del aviso ya oculto

  // El aviso de "se enviaron N registros" se oculta solo a los 6 s
  useEffect(() => {
    if (!ultimoResultado || ultimoResultado.enviados === 0) return;
    const t = setTimeout(() => setDescartado(ultimoResultado.en), 6000);
    return () => clearTimeout(t);
  }, [ultimoResultado]);

  const aviso =
    ultimoResultado && ultimoResultado.enviados > 0 && descartado !== ultimoResultado.en
      ? `Se enviaron ${ultimoResultado.enviados} registro${ultimoResultado.enviados === 1 ? "" : "s"} al servidor.`
      : null;

  if (!usuario) return null;

  const total = pendientes.length;
  const conError = pendientes.filter((p) => p.estado === "error").length;

  if (sesionExpirada && total > 0) {
    return (
      <div className="conexion-bar conexion-bar--error" role="alert">
        <span>
          Tu sesión expiró y hay {total} registro{total === 1 ? "" : "s"} sin enviar. Cierra sesión e
          inicia de nuevo con internet: no se pierde nada.
        </span>
        <Link to="/pendientes" className="btn btn-secondary btn-sm">
          Ver pendientes
        </Link>
      </div>
    );
  }

  if (!enLinea) {
    return (
      <div className="conexion-bar conexion-bar--offline" role="status">
        <span>
          <strong>Modo offline</strong>
          {total > 0 && ` · Pendientes de enviar: ${total}`}
        </span>
        {total > 0 && (
          <Link to="/pendientes" className="btn btn-secondary btn-sm">
            Ver pendientes
          </Link>
        )}
      </div>
    );
  }

  if (total > 0) {
    return (
      <div
        className={`conexion-bar ${conError ? "conexion-bar--error" : "conexion-bar--pendiente"}`}
        role="status"
      >
        <span>
          {sincronizando
            ? "Enviando registros..."
            : `${total} registro${total === 1 ? "" : "s"} pendiente${total === 1 ? "" : "s"} de enviar${
                conError ? ` (${conError} con error)` : ""
              }.`}
        </span>
        <span className="conexion-bar-acciones">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={sincronizando}
            onClick={() => sincronizar()}
          >
            Sincronizar ahora
          </button>
          <Link to="/pendientes" className="btn btn-ghost btn-sm">
            Ver pendientes
          </Link>
        </span>
      </div>
    );
  }

  if (aviso) {
    return (
      <div className="conexion-bar conexion-bar--ok" role="status">
        <span>{aviso}</span>
      </div>
    );
  }

  return null;
}

// ¿Se puede refrescar/abrir la página sin conexión? Depende del service worker, que solo
// funciona en la versión compilada y desde https:// o http://localhost.
function useAppSinConexion() {
  const [estado, setEstado] = useState(() => {
    if (!import.meta.env.PROD) return "desarrollo";
    if (!window.isSecureContext || !("serviceWorker" in navigator)) return "inseguro";
    return "revisando";
  });
  useEffect(() => {
    if (estado !== "revisando") return;
    let vivo = true;
    navigator.serviceWorker.ready.then(() => vivo && setEstado("ok")).catch(() => {});
    return () => {
      vivo = false;
    };
  }, [estado]);
  return estado;
}

// Aviso al iniciar sesión: descargando las listas de los formularios / ya están listas para usar sin conexión
function AvisoFormularios() {
  const { usuario } = useAuth();
  const enLinea = useOnline();
  const { catalogos } = useEstadoSync();
  const [descartado, setDescartado] = useState(null);
  const appSinConexion = useAppSinConexion();

  const listo = !!catalogos && !catalogos.cargando && !catalogos.fallidas.length;

  // Cuando termina bien, el aviso se oculta solo a los 8 s
  useEffect(() => {
    if (!listo) return;
    const t = setTimeout(() => setDescartado(catalogos.en), 8000);
    return () => clearTimeout(t);
  }, [listo, catalogos]);

  if (!usuario) return null;

  // Sin service worker, navegar dentro de la app funciona sin internet pero refrescar la página NO
  if (appSinConexion === "inseguro" || appSinConexion === "desarrollo") {
    return (
      <div className="conexion-bar conexion-bar--error" role="alert">
        <span>
          <strong>Esta página no se podrá abrir ni refrescar sin internet.</strong>{" "}
          {appSinConexion === "desarrollo"
            ? "Estás en modo desarrollo: usa npm run build y npm run preview."
            : `Entra por https:// o por http://localhost (ahora: ${window.location.origin}).`}
        </span>
      </div>
    );
  }

  if (!enLinea || !catalogos) return null;

  if (catalogos.cargando) {
    return (
      <div className="conexion-bar conexion-bar--pendiente" role="status">
        <span>Cargando formularios para usar sin conexión...</span>
      </div>
    );
  }

  if (descartado === catalogos.en) return null;

  if (listo) {
    return (
      <div className="conexion-bar conexion-bar--ok" role="status">
        <span>
          <strong>Formularios listos para usar sin conexión.</strong>
        </span>
      </div>
    );
  }

  return (
    <div className="conexion-bar conexion-bar--error" role="alert">
      <span>
        <strong>No terminaron de cargar todas las listas.</strong> Reintenta antes de salir sin señal.
      </span>
      <button type="button" className="btn btn-secondary btn-sm" onClick={reintentarListas}>
        Reintentar
      </button>
    </div>
  );
}

export default function BarraConexion() {
  return (
    <>
      <AvisoFormularios />
      <BarraPrincipal />
    </>
  );
}

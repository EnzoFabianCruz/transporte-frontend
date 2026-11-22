import { createContext, useContext, useState } from "react";
import { pendientesPropios } from "../offline/outbox";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem("usuario");
    return guardado ? JSON.parse(guardado) : null;
  });

  const login = (datosUsuario, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(datosUsuario));
    setUsuario(datosUsuario);
  };

  const logout = () => {
    const sinEnviar = pendientesPropios().length;
    if (
      sinEnviar > 0 &&
      !window.confirm(
        `Tienes ${sinEnviar} registro${sinEnviar === 1 ? "" : "s"} sin enviar guardado${
          sinEnviar === 1 ? "" : "s"
        } en esta tablet. No se perderán, pero solo se enviarán cuando vuelvas a iniciar sesión con internet. ¿Cerrar sesión?`
      )
    ) {
      return;
    }
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import ListaPartes from "./pages/ListaPartes";
import ListaParadas from "./pages/ListaParadas";
import FormularioParte from "./pages/FormularioParte";
import FormularioParada from "./pages/FormularioParada";
import UsuariosAdmin from "./pages/UsuariosAdmin";
import RecuperarPassword from "./pages/Recuperarpassword";
import RestablecerPassword from "./pages/Restablecerpassword";

function RutaProtegida({ children }) {
  const { usuario } = useAuth();
  return usuario ? children : <Navigate to="/login" />;
}

// Igual que RutaProtegida, pero además exige rol Admin.
// Si no hay sesión va a /login; si hay sesión pero no es Admin, lo manda a "/".
function RutaAdmin({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" />;
  return usuario.rol === "Admin" ? children : <Navigate to="/" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar-password" element={<RecuperarPassword />} />
      <Route path="/restablecer-password" element={<RestablecerPassword />} />
      <Route path="/" element={<RutaProtegida><ListaPartes /></RutaProtegida>} />
      <Route path="/paradas" element={<RutaProtegida><ListaParadas /></RutaProtegida>} />
      <Route path="/formulario" element={<RutaProtegida><FormularioParte /></RutaProtegida>} />
      <Route path="/formulario/:numeroParte" element={<RutaProtegida><FormularioParte /></RutaProtegida>} />
      <Route path="/formulario-parada" element={<RutaProtegida><FormularioParada /></RutaProtegida>} />
      <Route path="/formulario-parada/:numeroParada" element={<RutaProtegida><FormularioParada /></RutaProtegida>} />
      <Route path="/usuarios" element={<RutaAdmin><UsuariosAdmin /></RutaAdmin>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
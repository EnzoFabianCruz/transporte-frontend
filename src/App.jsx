import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import ListaPartes from "./pages/ListaPartes";
import ListaParadas from "./pages/ListaParadas";
import FormularioParte from "./pages/FormularioParte";
import FormularioParada from "./pages/FormularioParada";

function RutaProtegida({ children }) {
  const { usuario } = useAuth();
  return usuario ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RutaProtegida><ListaPartes /></RutaProtegida>} />
      <Route path="/paradas" element={<RutaProtegida><ListaParadas /></RutaProtegida>} />
      <Route path="/formulario" element={<RutaProtegida><FormularioParte /></RutaProtegida>} />
      <Route path="/formulario/:numeroParte" element={<RutaProtegida><FormularioParte /></RutaProtegida>} />
      <Route path="/formulario-parada" element={<RutaProtegida><FormularioParada /></RutaProtegida>} />
      <Route path="/formulario-parada/:numeroParada" element={<RutaProtegida><FormularioParada /></RutaProtegida>} />
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
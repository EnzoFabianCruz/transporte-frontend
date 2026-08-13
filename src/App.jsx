import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import ListaPartes from "./pages/ListaPartes";
import FormularioParte from "./pages/FormularioParte";


function RutaProtegida({ children }) {
  const { usuario } = useAuth();
  return usuario ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RutaProtegida><ListaPartes /></RutaProtegida>} />
      <Route path="/formulario" element={<RutaProtegida><FormularioParte /></RutaProtegida>} />
      <Route path="/formulario/:numeroParte" element={<RutaProtegida><FormularioParte /></RutaProtegida>} />
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
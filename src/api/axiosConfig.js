import axios from "axios";

const api = axios.create({
  baseURL: "https://localhost:7009/api",
  // Sin respuesta en 20 s se considera fallo de red (señal débil en la tablet)
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
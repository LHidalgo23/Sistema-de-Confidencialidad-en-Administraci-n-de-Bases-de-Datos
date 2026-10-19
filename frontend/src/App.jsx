import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Documentacion from "./pages/Documentacion";
import Matriz from "./pages/Matriz";
import PlanMejora from "./pages/PlanMejora";
import Pruebas from "./pages/Pruebas";
import Riesgos from "./pages/Riesgos";
import Tareas from "./pages/Tareas";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="matriz" element={<Matriz />} />
        <Route path="pruebas" element={<Pruebas />} />
        <Route path="riesgos" element={<Riesgos />} />
        <Route path="tareas" element={<Tareas />} />
        <Route path="plan-mejora" element={<PlanMejora />} />
        <Route path="documentacion" element={<Documentacion />} />
      </Route>
    </Routes>
  );
}

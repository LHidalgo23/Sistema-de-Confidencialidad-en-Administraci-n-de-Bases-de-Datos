import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Cargando } from "./components/Aviso";
import EmpresaLayout from "./components/EmpresaLayout";
import Layout from "./components/Layout";
import Catalogo from "./pages/Catalogo";
import Correctivos from "./pages/Correctivos";
import Descubrimiento from "./pages/Descubrimiento";
import Documentacion from "./pages/Documentacion";
import Empresas from "./pages/Empresas";
import Hallazgo from "./pages/Hallazgo";
import Matriz from "./pages/Matriz";
import PlanMejora from "./pages/PlanMejora";
import Prevuelo from "./pages/Prevuelo";

// El Dashboard es el único que usa Recharts: se carga bajo demanda para aligerar el resto.
const Dashboard = lazy(() => import("./pages/Dashboard"));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Empresas />} />
        <Route path="empresas/:empresaId" element={<EmpresaLayout />}>
          <Route
            index
            element={
              <Suspense fallback={<Cargando />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route path="prevuelo" element={<Prevuelo />} />
          <Route path="descubrimiento" element={<Descubrimiento />} />
          <Route path="matriz" element={<Matriz />} />
          <Route path="hallazgos/:obsId" element={<Hallazgo />} />
          <Route path="correctivos" element={<Correctivos />} />
          <Route path="plan-mejora" element={<PlanMejora />} />
        </Route>
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="documentacion" element={<Documentacion />} />
      </Route>
    </Routes>
  );
}

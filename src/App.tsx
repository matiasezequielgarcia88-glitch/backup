import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Plants from "./pages/Plants";
import GeneticsPage from "./pages/Genetics";
import Locations from "./pages/Locations";
import Cloning from "./pages/Cloning";
import ActivityLog from "./pages/ActivityLog";
import Reports from "./pages/Reports";
import Labels from "./pages/Labels";
import PlantDetail from "./pages/PlantDetail";
import LocationDetail from "./pages/LocationDetail";
import Pacientes from "./pages/Pacientes";
import Entregas from "./pages/Entregas";
import ReportesEntregas from "./pages/ReportesEntregas";
import CalendarPage from "./pages/CalendarPage";
import MateriaVegetal from "./pages/MateriaVegetal";
import Cosecha from "./pages/Cosecha";
import AdminUsuarios from "./pages/AdminUsuarios";
import AuditLogPage from "./pages/AuditLogPage";
import OrgSelector from "./pages/OrgSelector";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/org-selector" element={<OrgSelector />} />
            <Route path="/" element={<ProtectedRoute section="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/calendario" element={<ProtectedRoute section="calendario"><CalendarPage /></ProtectedRoute>} />
            <Route path="/plantas" element={<ProtectedRoute section="plantas"><Plants /></ProtectedRoute>} />
            <Route path="/geneticas" element={<ProtectedRoute section="geneticas"><GeneticsPage /></ProtectedRoute>} />
            <Route path="/locaciones" element={<ProtectedRoute section="locaciones"><Locations /></ProtectedRoute>} />
            <Route path="/locaciones/:installationId" element={<ProtectedRoute section="locaciones"><LocationDetail /></ProtectedRoute>} />
            <Route path="/esquejado" element={<ProtectedRoute section="esquejado"><Cloning /></ProtectedRoute>} />
            <Route path="/cosecha" element={<ProtectedRoute section="cosecha"><Cosecha /></ProtectedRoute>} />
            <Route path="/materia-vegetal" element={<ProtectedRoute section="materia-vegetal"><MateriaVegetal /></ProtectedRoute>} />
            <Route path="/bitacora" element={<ProtectedRoute section="bitacora"><ActivityLog /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute section="reportes"><Reports /></ProtectedRoute>} />
            <Route path="/etiquetas" element={<ProtectedRoute section="etiquetas"><Labels /></ProtectedRoute>} />
            <Route path="/planta/:plantId" element={<ProtectedRoute section="plantas"><PlantDetail /></ProtectedRoute>} />
            <Route path="/pacientes" element={<ProtectedRoute section="pacientes"><Pacientes /></ProtectedRoute>} />
            <Route path="/entregas" element={<ProtectedRoute section="entregas"><Entregas /></ProtectedRoute>} />
            <Route path="/reportes-entregas" element={<ProtectedRoute section="reportes-entregas"><ReportesEntregas /></ProtectedRoute>} />
            <Route path="/admin-usuarios" element={<ProtectedRoute section="admin-usuarios"><AdminUsuarios /></ProtectedRoute>} />
            <Route path="/auditoria" element={<ProtectedRoute section="auditoria"><AuditLogPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

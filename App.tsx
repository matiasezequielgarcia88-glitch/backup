import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlantProvider } from "@/contexts/PlantContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PlantProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendario" element={<CalendarPage />} />
            <Route path="/plantas" element={<Plants />} />
            <Route path="/geneticas" element={<GeneticsPage />} />
            <Route path="/locaciones" element={<Locations />} />
            <Route path="/locaciones/:installationId" element={<LocationDetail />} />
            <Route path="/esquejado" element={<Cloning />} />
            <Route path="/bitacora" element={<ActivityLog />} />
            <Route path="/reportes" element={<Reports />} />
            <Route path="/etiquetas" element={<Labels />} />
            <Route path="/planta/:plantId" element={<PlantDetail />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/entregas" element={<Entregas />} />
            <Route path="/reportes-entregas" element={<ReportesEntregas />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </PlantProvider>
  </QueryClientProvider>
);

export default App; 

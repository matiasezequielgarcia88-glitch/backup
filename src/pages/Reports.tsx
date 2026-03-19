import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { CHEMOTYPES, ChemotypeCode } from '@/types/cultivation';
import { FileText, Download, Calendar, Shield, Leaf, Flower2, FlaskConical } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

type Plant = {
  id: string;
  serial_number: string;
  lot_number: string;
  genetic_id: string | null;
  chemotype_code: string;
  state: string;
  planting_date: string;
  installation_id: string;
  warehouse_id: string;
  notes: string | null;
  updated_at: string;
};

type Genetic = { id: string; name: string; chemotype_code: string; thc_range: string | null; cbd_range: string | null; };
type Warehouse = { id: string; name: string; };
type Installation = { id: string; name: string; };
type ActivityLog = {
  id: string;
  type: string;
  description: string;
  plant_ids: string[];
  source_installation_id: string | null;
  target_installation_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export default function Reports() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const { data: plants = [] } = useQuery({
    queryKey: ['plants', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('*').eq('organization_id', orgId!);
      if (error) throw error;
      return data as Plant[];
    },
  });

  const { data: genetics = [] } = useQuery({
    queryKey: ['genetics', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('genetics').select('*').eq('organization_id', orgId!);
      if (error) throw error;
      return data as Genetic[];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('id, name').eq('organization_id', orgId!);
      if (error) throw error;
      return data as Warehouse[];
    },
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['installations', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('installations').select('id, name').eq('organization_id', orgId!);
      if (error) throw error;
      return data as Installation[];
    },
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activity_logs', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('activity_logs').select('*').eq('organization_id', orgId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  const getGeneticName = (id: string | null) => genetics.find(g => g.id === id)?.name || 'Desconocida';
  const getChemotypeName = (id: string | null) => {
    const g = genetics.find(g => g.id === id);
    return g ? CHEMOTYPES[g.chemotype_code as ChemotypeCode]?.name || g.chemotype_code : '-';
  };
  const getWarehouseName = (id: string) => warehouses.find(w => w.id === id)?.name || '-';
  const getInstallationName = (id: string | null) => installations.find(i => i.id === id)?.name || '-';

  const totalPlants = plants.length;
  const plantsByState = plants.reduce((acc, p) => {
    acc[p.state] = (acc[p.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const plantsByGenetic = genetics.reduce((acc, g) => {
    const count = plants.filter(p => p.genetic_id === g.id).length;
    if (count > 0) acc[g.name] = { count, chemotype: CHEMOTYPES[g.chemotype_code as ChemotypeCode]?.name || g.chemotype_code };
    return acc;
  }, {} as Record<string, { count: number; chemotype: string }>);

  const plantsByChemotype = plants.reduce((acc, p) => {
    const ct = CHEMOTYPES[p.chemotype_code as ChemotypeCode]?.name || p.chemotype_code;
    acc[ct] = (acc[ct] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const currentDate = new Date();
  const semester = currentDate.getMonth() < 6 ? '1er' : '2do';
  const year = currentDate.getFullYear();

  const handleExportDeclaracion = () => {
    const wb = XLSX.utils.book_new();
    const summaryData = [
      ['DECLARACIÓN JURADA SEMESTRAL'],
      ['Registro de Plantas de Cannabis para Uso Medicinal'],
      [],
      ['Período', `${semester} Semestre ${year}`],
      ['Fecha de Emisión', format(currentDate, 'dd/MM/yyyy', { locale: es })],
      ['Total de Plantas', totalPlants],
      ['Plantas en Floración', plantsByState['floracion'] || 0],
      ['Genéticas Diferentes', Object.keys(plantsByGenetic).length],
      [],
      ['DESGLOSE POR ESTADO'],
      ['Estado', 'Cantidad', 'Porcentaje'],
      ...Object.entries(plantsByState).map(([state, count]) => [
        state.charAt(0).toUpperCase() + state.slice(1),
        count,
        `${totalPlants > 0 ? ((count / totalPlants) * 100).toFixed(1) : 0}%`,
      ]),
      [],
      ['DESGLOSE POR QUIMIOTIPO'],
      ['Quimiotipo', 'Cantidad'],
      ...Object.entries(plantsByChemotype).map(([name, count]) => [name, count]),
      [],
      ['DESGLOSE POR GENÉTICA'],
      ['Genética', 'Quimiotipo', 'Cantidad', 'Porcentaje'],
      ...Object.entries(plantsByGenetic).map(([name, { count, chemotype }]) => [
        name, chemotype, count,
        `${totalPlants > 0 ? ((count / totalPlants) * 100).toFixed(1) : 0}%`,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Declaración Jurada');

    const plantRows = plants.map(p => ({
      'Nro. Serie': p.serial_number,
      'Lote': p.lot_number,
      'Genética': getGeneticName(p.genetic_id),
      'Quimiotipo': getChemotypeName(p.genetic_id),
      'Estado': p.state,
      'Fecha Plantación': format(new Date(p.planting_date), 'dd/MM/yyyy'),
      'Sala': getWarehouseName(p.warehouse_id),
      'Locación': getInstallationName(p.installation_id),
    }));
    const ws2 = XLSX.utils.json_to_sheet(plantRows);
    ws2['!cols'] = Array(8).fill({ wch: 20 });
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle Plantas');
    XLSX.writeFile(wb, `Declaracion_Jurada_${semester}Sem_${year}.xlsx`);
    toast.success('Declaración Jurada exportada correctamente');
  };

  const handleExportActivities = () => {
    const wb = XLSX.utils.book_new();
    const rows = activityLogs.map(log => ({
      'Fecha': format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
      'Tipo': log.type,
      'Descripción': log.description,
      'Origen': log.source_installation_id ? getInstallationName(log.source_installation_id) : '-',
      'Destino': log.target_installation_id ? getInstallationName(log.target_installation_id) : '-',
      'Plantas': Array.isArray(log.plant_ids) ? log.plant_ids.length : 0,
      'Metadata': log.metadata ? JSON.stringify(log.metadata) : '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 45 }, { wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Actividades');
    XLSX.writeFile(wb, `Reporte_Actividades_${format(currentDate, 'yyyyMMdd')}.xlsx`);
    toast.success('Reporte de actividades exportado correctamente');
  };

  const handleExportInventory = () => {
    const wb = XLSX.utils.book_new();
    const plantRows = plants.map(p => ({
      'Nro. Serie': p.serial_number,
      'Lote': p.lot_number,
      'Genética': getGeneticName(p.genetic_id),
      'Quimiotipo': getChemotypeName(p.genetic_id),
      'Estado': p.state,
      'Fecha Plantación': format(new Date(p.planting_date), 'dd/MM/yyyy'),
      'Sala': getWarehouseName(p.warehouse_id),
      'Locación': getInstallationName(p.installation_id),
      'Notas': p.notes || '',
      'Última Actualización': format(new Date(p.updated_at), 'dd/MM/yyyy HH:mm'),
    }));
    const ws = XLSX.utils.json_to_sheet(plantRows);
    ws['!cols'] = Array(10).fill({ wch: 20 });
    XLSX.utils.book_append_sheet(wb, ws, 'Plantas');
    XLSX.writeFile(wb, `Inventario_Completo_${format(currentDate, 'yyyyMMdd')}.xlsx`);
    toast.success('Inventario completo exportado correctamente');
  };

  return (
    <Layout title="Reportes" subtitle="Generación de informes y declaraciones juradas">
      <div className="space-y-6">

        {/* Declaración Jurada */}
        <div className="card-elevated overflow-hidden">
          <div className="bg-primary/5 border-b border-border p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">Declaración Jurada Semestral</h2>
                <p className="text-sm text-muted-foreground mt-1">Informe exigido por el Ministerio de Salud / ANMAT</p>
                <p className="text-xs text-muted-foreground mt-1">Período: {semester} Semestre {year}</p>
              </div>
              <Button className="gap-2" onClick={handleExportDeclaracion}>
                <Download className="h-4 w-4" />
                Generar Reporte
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="p-5 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Leaf className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Total Plantas</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{totalPlants}</p>
                <p className="text-xs text-muted-foreground mt-1">En todas las locaciones</p>
              </div>

              <div className="p-5 rounded-xl bg-yellow-50 border border-yellow-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                    <Flower2 className="h-5 w-5 text-yellow-700" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">En Floración</span>
                </div>
                <p className="text-3xl font-bold text-yellow-700">{plantsByState['floracion'] || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalPlants > 0 ? (((plantsByState['floracion'] || 0) / totalPlants) * 100).toFixed(1) : 0}% del total
                </p>
              </div>

              <div className="p-5 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Genéticas</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{Object.keys(plantsByGenetic).length}</p>
                <p className="text-xs text-muted-foreground mt-1">Variedades diferentes</p>
              </div>
            </div>

            {/* Chemotype breakdown */}
            {Object.keys(plantsByChemotype).length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Desglose por Quimiotipo
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {Object.entries(plantsByChemotype).map(([name, count]) => (
                    <div key={name} className="p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{name}</span>
                        <span className="text-lg font-bold text-primary">{count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {totalPlants > 0 ? ((count / totalPlants) * 100).toFixed(1) : 0}% del total
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Genetic breakdown */}
            {Object.keys(plantsByGenetic).length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">Desglose por Genética</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground font-medium">Genética</th>
                        <th className="text-left py-2 text-muted-foreground font-medium">Quimiotipo</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Cantidad</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Porcentaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(plantsByGenetic)
                        .sort(([, a], [, b]) => b.count - a.count)
                        .map(([name, { count, chemotype }]) => (
                          <tr key={name} className="border-b border-border/50">
                            <td className="py-2 font-medium">{name}</td>
                            <td className="py-2 text-muted-foreground">{chemotype}</td>
                            <td className="py-2 text-right">{count}</td>
                            <td className="py-2 text-right text-muted-foreground">
                              {totalPlants > 0 ? ((count / totalPlants) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Other reports */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card-elevated p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Reporte de Actividades</h3>
                <p className="text-sm text-muted-foreground">Exportar bitácora completa</p>
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={handleExportActivities}>
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                <Leaf className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Inventario Completo</h3>
                <p className="text-sm text-muted-foreground">Listado detallado de todas las plantas</p>
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={handleExportInventory}>
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Vista Previa del Documento</h3>
            <span className="text-xs text-muted-foreground">
              Generado: {format(currentDate, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
            </span>
          </div>
          <div className="p-6 bg-muted/30 rounded-lg border border-dashed border-border font-mono text-sm space-y-4">
            <div className="text-center border-b border-border pb-4">
              <p className="font-bold">DECLARACIÓN JURADA</p>
              <p className="text-muted-foreground">Registro de Plantas de Cannabis para Uso Medicinal</p>
            </div>
            <div className="space-y-2">
              <p><strong>Período:</strong> {semester} Semestre {year}</p>
              <p><strong>Fecha de Emisión:</strong> {format(currentDate, 'dd/MM/yyyy', { locale: es })}</p>
              <p><strong>Total de Plantas:</strong> {totalPlants}</p>
              <p><strong>Plantas en Floración:</strong> {plantsByState['floracion'] || 0}</p>
              <p><strong>Genéticas:</strong> {Object.keys(plantsByGenetic).join(', ') || 'Sin registrar'}</p>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}

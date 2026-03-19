import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlaskConical, Leaf, BarChart3, Dna, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type EntregaReport = {
  id: string;
  paciente_id: string;
  tipo_entrega: 'materia_vegetal' | 'plantas';
  cantidad: number;
  unidad: string;
  fecha_entrega: string;
  code: string | null;
  material_code: string | null;
  genetic_name: string | null;
  notas: string | null;
  pacientes: { nombre_apellido: string; dni: string } | null;
};

const COLORS = ['#a855f7', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ec4899', '#14b8a6'];

export default function ReportesEntregas() {
  const { data: entregas = [], isLoading } = useQuery({
    queryKey: ['entregas-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entregas')
        .select('*, pacientes(nombre_apellido, dni)')
        .order('fecha_entrega', { ascending: false });
      if (error) throw error;
      return data as EntregaReport[];
    },
  });

  const totalVegetal = entregas.filter(e => e.tipo_entrega === 'materia_vegetal').reduce((s, e) => s + Number(e.cantidad), 0);
  const totalPlantas = entregas.filter(e => e.tipo_entrega === 'plantas').reduce((s, e) => s + Number(e.cantidad), 0);

  // Monthly summary
  const monthlyData = Object.values(
    entregas.reduce<Record<string, { mes: string; materia_vegetal: number; plantas: number }>>((acc, e) => {
      const month = e.fecha_entrega.substring(0, 7);
      if (!acc[month]) acc[month] = { mes: month, materia_vegetal: 0, plantas: 0 };
      if (e.tipo_entrega === 'materia_vegetal') acc[month].materia_vegetal += Number(e.cantidad);
      else acc[month].plantas += Number(e.cantidad);
      return acc;
    }, {})
  ).sort((a, b) => a.mes.localeCompare(b.mes));

  // By genetic
  const geneticData = Object.entries(
    entregas
      .filter(e => e.tipo_entrega === 'materia_vegetal' && e.genetic_name)
      .reduce<Record<string, number>>((acc, e) => {
        const key = e.genetic_name!;
        acc[key] = (acc[key] || 0) + Number(e.cantidad);
        return acc;
      }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // By patient
  const patientData = Object.values(
    entregas.reduce<Record<string, { nombre: string; dni: string; total_vegetal: number; total_plantas: number; entregas: number; ultima: string }>>((acc, e) => {
      const pid = e.paciente_id;
      if (!acc[pid]) acc[pid] = { nombre: e.pacientes?.nombre_apellido || '-', dni: e.pacientes?.dni || '-', total_vegetal: 0, total_plantas: 0, entregas: 0, ultima: e.fecha_entrega };
      acc[pid].entregas++;
      if (e.tipo_entrega === 'materia_vegetal') acc[pid].total_vegetal += Number(e.cantidad);
      else acc[pid].total_plantas += Number(e.cantidad);
      if (e.fecha_entrega > acc[pid].ultima) acc[pid].ultima = e.fecha_entrega;
      return acc;
    }, {})
  ).sort((a, b) => b.entregas - a.entregas);

  return (
    <Layout title="Reportes de Entregas" subtitle="Resúmenes y estadísticas">
      <div className="space-y-6">

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><BarChart3 className="h-5 w-5 text-primary" /></div>
              <span className="text-sm font-medium text-muted-foreground">Total Entregas</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{entregas.length}</p>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100"><FlaskConical className="h-5 w-5 text-amber-700" /></div>
              <span className="text-sm font-medium text-muted-foreground">Materia Vegetal</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{totalVegetal.toFixed(1)}g</p>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100"><Leaf className="h-5 w-5 text-green-700" /></div>
              <span className="text-sm font-medium text-muted-foreground">Plantas</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{totalPlantas} uds</p>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100"><Users className="h-5 w-5 text-purple-700" /></div>
              <span className="text-sm font-medium text-muted-foreground">Pacientes</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{patientData.length}</p>
          </div>
        </div>

        <Tabs defaultValue="mensual">
          <TabsList>
            <TabsTrigger value="mensual">Por Mes</TabsTrigger>
            <TabsTrigger value="genetica">Por Genética</TabsTrigger>
            <TabsTrigger value="paciente">Por Paciente</TabsTrigger>
            <TabsTrigger value="detalle">Detalle</TabsTrigger>
          </TabsList>

          {/* Monthly */}
          <TabsContent value="mensual" className="space-y-4">
            {monthlyData.length > 0 ? (
              <div className="card-elevated p-6">
                <h3 className="font-semibold text-foreground mb-4">Entregas por Mes</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="materia_vegetal" name="Mat. Vegetal (g)" fill="#eab308" radius={[4,4,0,0]} />
                    <Bar dataKey="plantas" name="Plantas (uds)" fill="#22c55e" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="card-elevated p-8 text-center text-muted-foreground">No hay datos aún</div>
            )}
            <div className="card-elevated overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Mat. Vegetal (g)</TableHead>
                    <TableHead className="text-right">Plantas (uds)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.length === 0
                    ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Sin datos</TableCell></TableRow>
                    : monthlyData.map(row => (
                      <TableRow key={row.mes}>
                        <TableCell className="font-medium">{row.mes}</TableCell>
                        <TableCell className="text-right">{row.materia_vegetal.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{row.plantas}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* By genetic */}
          <TabsContent value="genetica" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {geneticData.length > 0 ? (
                <div className="card-elevated p-6">
                  <h3 className="font-semibold text-foreground mb-4">Distribución por Genética</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={geneticData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                        {geneticData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v.toFixed(1)}g`, 'Entregado']} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="card-elevated p-8 text-center text-muted-foreground">No hay datos de genéticas aún</div>
              )}
              <div className="card-elevated overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><Dna className="h-4 w-4" /> Ranking por Genética</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Genética</TableHead>
                      <TableHead className="text-right">Total (g)</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {geneticData.length === 0
                      ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Sin datos</TableCell></TableRow>
                      : geneticData.map((g, i) => (
                        <TableRow key={g.name}>
                          <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                          <TableCell className="font-medium">{g.name}</TableCell>
                          <TableCell className="text-right">{g.value.toFixed(1)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {totalVegetal > 0 ? ((g.value / totalVegetal) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                      ))
                    }
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* By patient */}
          <TabsContent value="paciente">
            <div className="card-elevated overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead className="text-center">Entregas</TableHead>
                    <TableHead className="text-right">Mat. Vegetal (g)</TableHead>
                    <TableHead className="text-right">Plantas</TableHead>
                    <TableHead className="text-right">Última entrega</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientData.length === 0
                    ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin datos</TableCell></TableRow>
                    : patientData.map(p => (
                      <TableRow key={p.dni}>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="font-mono text-sm">{p.dni}</TableCell>
                        <TableCell className="text-center">{p.entregas}</TableCell>
                        <TableCell className="text-right">{p.total_vegetal.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{p.total_plantas}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{format(new Date(p.ultima), 'dd/MM/yyyy', { locale: es })}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Full detail */}
          <TabsContent value="detalle">
            <div className="card-elevated overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Genética</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
                    : entregas.length === 0
                    ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin entregas registradas</TableCell></TableRow>
                    : entregas.map(e => (
                      <TableRow key={e.id}>
                        <TableCell><code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{e.code || '-'}</code></TableCell>
                        <TableCell className="text-sm">{format(new Date(e.fecha_entrega), 'dd/MM/yyyy', { locale: es })}</TableCell>
                        <TableCell className="font-medium">{e.pacientes?.nombre_apellido || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.genetic_name || '-'}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{e.material_code || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{e.cantidad} {e.unidad}</TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

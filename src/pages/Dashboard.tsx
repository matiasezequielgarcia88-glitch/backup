import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/dashboard/StatCard';
import { PlantStateCard } from '@/components/dashboard/PlantStateCard';
import { VarietyChart } from '@/components/dashboard/VarietyChart';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Leaf, Flower2, Building2, Scissors, ChevronRight, Wheat, FlameKindling } from 'lucide-react';
import { PlantState } from '@/types/cultivation';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const stateOrder: PlantState[] = ['madre', 'esqueje', 'vegetativo', 'floracion'];

const STATE_CONFIG: Record<PlantState, { label: string; color: string; dot: string }> = {
  madre:      { label: 'Madres',     color: '#a855f7', dot: 'bg-purple-500' },
  esqueje:    { label: 'Esquejes',   color: '#3b82f6', dot: 'bg-blue-500' },
  vegetativo: { label: 'Vegetativo', color: '#22c55e', dot: 'bg-green-500' },
  floracion:  { label: 'Floración',  color: '#eab308', dot: 'bg-yellow-500' },
};

const STATE_BADGE: Record<string, string> = {
  madre: 'bg-purple-500', esqueje: 'bg-blue-500', vegetativo: 'bg-green-500', floracion: 'bg-yellow-500',
};

export default function Dashboard() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const { data: plants = [], isLoading: plantsLoading } = useQuery({
    queryKey: ['plants', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('id, name, serial_number, state, genetic_id, installation_id, warehouse_id').eq('organization_id', orgId);
      if (error) throw error;
      return data;
    },
  });

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('id, name, type').eq('organization_id', orgId).order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['installations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('installations').select('id, warehouse_id, name, state').eq('organization_id', orgId).order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: genetics = [] } = useQuery({
    queryKey: ['genetics', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('genetics').select('id, name').eq('organization_id', orgId);
      if (error) throw error;
      return data;
    },
  });

  // Get postcosecha installation IDs for this org
  const { data: postcosechaInsts = [] } = useQuery({
    queryKey: ['postcosecha-insts-dashboard', orgId],
    queryFn: async () => {
      const { data: wh } = await supabase.from('warehouses').select('id').eq('name', 'Post-Cosecha').eq('organization_id', orgId).single();
      if (!wh) return [];
      const { data } = await supabase.from('installations').select('id, name').eq('warehouse_id', wh.id).in('name', ['Secado', 'Curado', 'Despacho']);
      return data || [];
    },
    enabled: !!orgId,
  });

  const postcosechaInstIds = postcosechaInsts.map(i => i.id);

  const { data: harvestMaterials = [] } = useQuery({
    queryKey: ['harvest_materials', postcosechaInstIds.join(',')],
    queryFn: async () => {
      if (!postcosechaInstIds.length) return [];
      const { data, error } = await supabase
        .from('harvest_materials')
        .select('id, weight_grams, installation_id, genetic_name')
        .in('installation_id', postcosechaInstIds);
      if (error) throw error;
      return data;
    },
    enabled: postcosechaInstIds.length > 0,
  });

  const totalPlants = plants.length;

  const plantsByState = stateOrder.reduce((acc, state) => {
    acc[state] = plants.filter(p => p.state === state).length;
    return acc;
  }, {} as Record<PlantState, number>);

  const plantsByGenetic = genetics.reduce((acc, g) => {
    const count = plants.filter(p => p.genetic_id === g.id).length;
    if (count > 0) acc[g.name] = count;
    return acc;
  }, {} as Record<string, number>);

  // Bar chart data
  const barData = stateOrder.map(state => ({
    name: STATE_CONFIG[state].label,
    cantidad: plantsByState[state],
    color: STATE_CONFIG[state].color,
  }));

  // Mother plants for esquejado section
  const motherPlants = plants.filter(p => p.state === 'madre');

  const toNum = (v: number | string) => typeof v === 'string' ? parseFloat(v) || 0 : v;

  const getInstId = (name: string) => postcosechaInsts.find(i => i.name === name)?.id || '';
  const harvestByStage = {
    secado:   harvestMaterials.filter(m => m.installation_id === getInstId('Secado')).reduce((s, m) => s + toNum(m.weight_grams), 0),
    curado:   harvestMaterials.filter(m => m.installation_id === getInstId('Curado')).reduce((s, m) => s + toNum(m.weight_grams), 0),
    despacho: harvestMaterials.filter(m => m.installation_id === getInstId('Despacho')).reduce((s, m) => s + toNum(m.weight_grams), 0),
  };
  const totalHarvest = harvestByStage.secado + harvestByStage.curado + harvestByStage.despacho;

  const getInstallationsForWarehouse = (warehouseId: string) =>
    installations.filter(i => i.warehouse_id === warehouseId);

  const getPlantsForInstallation = (installationId: string) =>
    plants.filter(p => p.installation_id === installationId);

  const getGeneticName = (id: string | null) => genetics.find(g => g.id === id)?.name || '';

  return (
    <Layout title="Dashboard" subtitle="Resumen general del cultivo">
      <div className="space-y-6">

        {/* Estado vacío — org nueva sin datos */}
        {!plantsLoading && !warehousesLoading && plants.length === 0 && (
          <div className="card-elevated p-8 border-l-4 border-l-primary">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                <Leaf className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-1">¡Bienvenido a tu nuevo espacio!</h3>
                <p className="text-sm text-muted-foreground mb-4">Esta organización está vacía. Seguí estos pasos para empezar:</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Link to="/locaciones" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="text-sm font-medium">Crear locaciones</p>
                      <p className="text-xs text-muted-foreground">Salas y espacios de cultivo</p>
                    </div>
                  </Link>
                  <Link to="/geneticas" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="text-sm font-medium">Registrar genéticas</p>
                      <p className="text-xs text-muted-foreground">Variedades del cultivo</p>
                    </div>
                  </Link>
                  <Link to="/plantas" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="text-sm font-medium">Agregar plantas</p>
                      <p className="text-xs text-muted-foreground">Registro inicial de cultivo</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Plantas"
            value={totalPlants}
            subtitle="En todas las locaciones"
            icon={<Leaf className="h-6 w-6" />}
            variant="primary"
          />
          <StatCard
            title="En Floración"
            value={plantsByState.floracion}
            subtitle={totalPlants > 0 ? `${((plantsByState.floracion / totalPlants) * 100).toFixed(1)}% del total` : '0%'}
            icon={<Flower2 className="h-6 w-6" />}
          />
          <StatCard
            title="Salas Activas"
            value={warehouses.length}
            subtitle={`${installations.length} locaciones`}
            icon={<Building2 className="h-6 w-6" />}
          />
          <StatCard
            title="Plantas Madre"
            value={plantsByState.madre}
            subtitle="Disponibles para esquejado"
            icon={<Scissors className="h-6 w-6" />}
            variant="accent"
          />
        </div>

        {/* Plant states breakdown */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stateOrder.map(state => (
            <PlantStateCard
              key={state}
              state={state}
              count={plantsByState[state]}
              percentage={totalPlants > 0 ? (plantsByState[state] / totalPlants) * 100 : 0}
            />
          ))}
        </div>

        {/* Harvest stock cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Secado', key: 'secado', bg: 'bg-orange-100', text: 'text-orange-800', bar: 'bg-orange-500', icon: '🌿' },
            { label: 'Curado', key: 'curado', bg: 'bg-amber-100', text: 'text-amber-800', bar: 'bg-amber-500', icon: '🍃' },
            { label: 'Despacho', key: 'despacho', bg: 'bg-green-100', text: 'text-green-800', bar: 'bg-green-500', icon: '📦' },
          ].map(stage => {
            const grams = harvestByStage[stage.key as keyof typeof harvestByStage];
            const pct = totalHarvest > 0 ? (grams / totalHarvest) * 100 : 0;
            const lotes = harvestMaterials.filter(m => m.installation_id === getInstId(stage.label)).length;
            return (
              <div key={stage.key} className="card-elevated p-4 animate-slide-up">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${stage.bg}`}>
                    {stage.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{stage.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold ${stage.text}`}>{grams.toFixed(1)}g</span>
                      <span className="text-xs text-muted-foreground">{lotes} lote{lotes !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${stage.bar}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts row */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Pie chart por genética */}
          <VarietyChart data={plantsByGenetic} />

          {/* Bar chart por estado */}
          <div className="card-elevated">
            <div className="border-b border-border p-4">
              <h3 className="font-semibold text-foreground">Plantas por Estado</h3>
              <p className="text-sm text-muted-foreground">Distribución actual del cultivo</p>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value, 'Plantas']}
                  />
                  <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Mothers available + Location overview */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Plantas madre disponibles */}
          <div className="card-elevated">
            <div className="border-b border-border p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Plantas Madre</h3>
                <p className="text-sm text-muted-foreground">Disponibles para esquejado</p>
              </div>
              <Link to="/esquejado" className="text-xs text-primary hover:underline">
                Ir a esquejado →
              </Link>
            </div>
            <div className="divide-y divide-border">
              {motherPlants.length === 0 && (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No hay plantas en estado Madre.
                </div>
              )}
              {motherPlants.map(plant => {
                const geneticName = getGeneticName(plant.genetic_id);
                const installation = installations.find(i => i.id === plant.installation_id);
                const warehouse = warehouses.find(w => w.id === plant.warehouse_id);
                return (
                  <Link key={plant.id} to={`/planta/${plant.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                    <div className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{plant.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {geneticName && `${geneticName} • `}{warehouse?.name}{installation && ` → ${installation.name}`}
                      </p>
                    </div>
                    <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
                      {plant.serial_number}
                    </code>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Resumen de locaciones */}
          <div className="card-elevated">
            <div className="border-b border-border p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Resumen de Locaciones</h3>
                <p className="text-sm text-muted-foreground">Plantas por sala</p>
              </div>
              <Link to="/locaciones" className="text-xs text-primary hover:underline">
                Ver locaciones →
              </Link>
            </div>
            <div className="divide-y divide-border">
              {warehouses.length === 0 && (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No hay salas creadas aún.
                </div>
              )}
              {warehouses.map((warehouse, index) => {
                const warehouseInst = getInstallationsForWarehouse(warehouse.id);
                const totalW = warehouseInst.reduce((sum, inst) => sum + getPlantsForInstallation(inst.id).length, 0);

                return (
                  <div key={warehouse.id} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex items-center gap-3 p-3 bg-muted/20">
                      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="flex-1 text-sm font-semibold text-foreground">{warehouse.name}</span>
                      <span className="text-xs text-muted-foreground">{totalW} plantas</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="px-4 pb-2">
                      {warehouseInst.map(inst => {
                        const instPlants = getPlantsForInstallation(inst.id);
                        const counts = stateOrder.reduce((acc, s) => {
                          acc[s] = instPlants.filter(p => p.state === s).length;
                          return acc;
                        }, {} as Record<PlantState, number>);

                        return (
                          <div key={inst.id} className="flex items-center gap-2 py-1.5">
                            {inst.state && (
                              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', STATE_BADGE[inst.state] || 'bg-gray-400')} />
                            )}
                            <span className="flex-1 text-xs text-muted-foreground">{inst.name}</span>
                            <div className="flex items-center gap-1">
                              {(Object.entries(counts) as [PlantState, number][]).map(([state, count]) =>
                                count > 0 && (
                                  <div key={state} className={cn('flex items-center justify-center h-4 min-w-[16px] px-1 rounded text-[9px] font-bold text-white', STATE_BADGE[state])}>
                                    {count}
                                  </div>
                                )
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{instPlants.length}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Materia Vegetal Stock */}
        {totalHarvest > 0 && (
          <div className="card-elevated">
            <div className="border-b border-border p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Wheat className="h-4 w-4 text-yellow-600" />
                  Stock de Materia Vegetal
                </h3>
                <p className="text-sm text-muted-foreground">{totalHarvest.toFixed(1)}g en proceso</p>
              </div>
              <a href="/materia-vegetal" className="text-xs text-primary hover:underline">Ver detalle →</a>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                { label: 'Secado', value: harvestByStage.secado, color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Curado', value: harvestByStage.curado, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Despacho', value: harvestByStage.despacho, color: 'text-green-600', bg: 'bg-green-50' },
              ].map(stage => (
                <div key={stage.label} className={`p-4 text-center ${stage.bg}`}>
                  <p className="text-xs text-muted-foreground mb-1">{stage.label}</p>
                  <p className={`text-2xl font-bold ${stage.color}`}>{stage.value.toFixed(1)}g</p>
                  <p className="text-xs text-muted-foreground">
                    {harvestMaterials.filter(m => m.installation_id === getInstId(stage.label)).length} lote(s)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Acciones Rápidas</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link to="/esquejado" className="flex items-center gap-3 w-full p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Scissors className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm">Nuevo Esquejado</p>
                <p className="text-xs opacity-80">Generar clones de una madre</p>
              </div>
            </Link>
            <Link to="/cosecha" className="flex items-center gap-3 w-full p-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <FlameKindling className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm">Cosechar</p>
                <p className="text-xs opacity-80">Plantas en floración</p>
              </div>
            </Link>
            <Link to="/plantas" className="flex items-center gap-3 w-full p-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Leaf className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm">Ver Plantas</p>
                <p className="text-xs opacity-80">Registro completo</p>
              </div>
            </Link>
            <Link to="/locaciones" className="flex items-center gap-3 w-full p-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Building2 className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm">Ver Locaciones</p>
                <p className="text-xs opacity-80">Salas e instalaciones</p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </Layout>
  );
}

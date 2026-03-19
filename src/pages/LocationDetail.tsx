import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { PlantState, CHEMOTYPES, ChemotypeCode } from '@/types/cultivation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Leaf, Flower2, Sprout, TreeDeciduous, Eye, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATE_LABELS: Record<string, string> = {
  madre: 'Madres', esqueje: 'Esquejes', vegetativo: 'Vegetativo', floracion: 'Floración',
};

const STATE_COLORS: Record<string, string> = {
  madre: 'bg-purple-100 text-purple-800',
  esqueje: 'bg-blue-100 text-blue-800',
  vegetativo: 'bg-green-100 text-green-800',
  floracion: 'bg-yellow-100 text-yellow-800',
};

const stateConfig: Record<PlantState, { icon: React.ElementType; label: string; borderClass: string }> = {
  madre: { icon: TreeDeciduous, label: 'Madres', borderClass: 'border-l-purple-500' },
  esqueje: { icon: Sprout, label: 'Esquejes', borderClass: 'border-l-blue-500' },
  vegetativo: { icon: Leaf, label: 'Vegetativo', borderClass: 'border-l-green-500' },
  floracion: { icon: Flower2, label: 'Floración', borderClass: 'border-l-yellow-500' },
};

export default function LocationDetail() {
  const { installationId } = useParams<{ installationId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const { data: installation } = useQuery({
    queryKey: ['installation', installationId],
    queryFn: async () => {
      const { data, error } = await supabase.from('installations').select('*').eq('id', installationId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!installationId,
  });

  const { data: warehouse } = useQuery({
    queryKey: ['warehouse', installation?.warehouse_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('*').eq('id', installation!.warehouse_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!installation?.warehouse_id,
  });

  const { data: plants = [] } = useQuery({
    queryKey: ['plants-installation', installationId],
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('*').eq('installation_id', installationId!);
      if (error) throw error;
      return data;
    },
    enabled: !!installationId,
  });

  const { data: genetics = [] } = useQuery({
    queryKey: ['genetics', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('genetics').select('*').eq('organization_id', orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const plantsByState = (['madre', 'esqueje', 'vegetativo', 'floracion'] as PlantState[]).reduce((acc, state) => {
    acc[state] = plants.filter(p => p.state === state);
    return acc;
  }, {} as Record<PlantState, typeof plants>);

  const getPlantsByGenetic = (statePlants: typeof plants) => {
    return statePlants.reduce((acc, plant) => {
      const genetic = genetics.find(g => g.id === plant.genetic_id);
      const key = genetic?.name || 'Sin genética';
      if (!acc[key]) acc[key] = { genetic: genetic || null, plants: [] };
      acc[key].plants.push(plant);
      return acc;
    }, {} as Record<string, { genetic: (typeof genetics)[0] | null; plants: typeof plants }>);
  };

  if (!installation || !warehouse) {
    return (
      <Layout title="Locación" subtitle="">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Cargando locación...</p>
          <Button onClick={() => navigate('/locaciones')}>Volver a Locaciones</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={installation.name}
      subtitle={`${warehouse.name} • ${plants.length} plantas`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/locaciones')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Locaciones
          </Button>
          {installation.state && (
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATE_COLORS[installation.state] || 'bg-gray-100 text-gray-800'}`}>
              {STATE_LABELS[installation.state] || installation.state}
            </span>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['madre', 'esqueje', 'vegetativo', 'floracion'] as PlantState[]).map((state) => {
            const config = stateConfig[state];
            const Icon = config.icon;
            const count = plantsByState[state]?.length || 0;

            return (
              <div key={state} className={cn('card-elevated p-4 border-l-4', config.borderClass)}>
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{count}</p>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs by state */}
        <Tabs defaultValue="floracion" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            {(['floracion', 'vegetativo', 'esqueje', 'madre'] as PlantState[]).map((state) => {
              const config = stateConfig[state];
              const count = plantsByState[state]?.length || 0;
              return (
                <TabsTrigger key={state} value={state} className="gap-2">
                  <span>{config.label}</span>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{count}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(['floracion', 'vegetativo', 'esqueje', 'madre'] as PlantState[]).map((state) => {
            const statePlants = plantsByState[state] || [];
            const groupedByGenetic = getPlantsByGenetic(statePlants);

            return (
              <TabsContent key={state} value={state} className="space-y-4">
                {statePlants.length === 0 ? (
                  <div className="card-elevated p-8 text-center">
                    <p className="text-muted-foreground">
                      No hay plantas en estado {stateConfig[state].label.toLowerCase()} en esta locación.
                    </p>
                  </div>
                ) : (
                  Object.entries(groupedByGenetic).map(([geneticName, { genetic, plants: geneticPlants }]) => {
                    const chemotype = genetic ? CHEMOTYPES[genetic.chemotype_code as ChemotypeCode] : null;

                    return (
                      <div key={geneticName} className="card-elevated overflow-hidden">
                        {/* Genetic header */}
                        <div className="bg-muted/30 border-b border-border p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground">{geneticName}</h3>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                {chemotype && (
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                    {chemotype.name}
                                  </span>
                                )}
                                {genetic?.thc_range && <span>THC: {genetic.thc_range}</span>}
                                {genetic?.cbd_range && <span>CBD: {genetic.cbd_range}</span>}
                              </div>
                            </div>
                            <span className="text-lg font-bold text-primary">{geneticPlants.length} plantas</span>
                          </div>
                        </div>

                        {/* Plants grid */}
                        <div className="p-4">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {geneticPlants.map((plant, index) => (
                              <div
                                key={plant.id}
                                className="p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-colors animate-fade-in group"
                                style={{ animationDelay: `${index * 30}ms` }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <code className="font-mono text-xs font-semibold text-foreground">
                                    {plant.serial_number}
                                  </code>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link to={`/planta/${plant.id}`}>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Lote: {plant.lot_number}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATE_COLORS[plant.state] || 'bg-gray-100 text-gray-800'}`}>
                                    {STATE_LABELS[plant.state] || plant.state}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Siembra: {format(new Date(plant.planting_date), 'dd/MM/yy', { locale: es })}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </Layout>
  );
}

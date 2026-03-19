import { Warehouse, Plant, PlantState, PlantMaterial, Installation } from '@/types/cultivation';
import { Building2, ChevronRight, Leaf, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationOverviewProps {
  warehouses: Warehouse[];
  installations: Installation[];
  plants: Plant[];
  materials?: PlantMaterial[];
}

const POST_HARVEST_WAREHOUSE_IDS = ['wh-4', 'wh-5', 'wh-6'];

const stateColors: Record<PlantState, string> = {
  madre: 'bg-state-mother',
  esqueje: 'bg-state-clone',
  vegetativo: 'bg-state-vegetative',
  floracion: 'bg-state-flowering',
};

export function LocationOverview({ warehouses, installations, plants, materials = [] }: LocationOverviewProps) {
  const getInstallationsForWarehouse = (warehouseId: string) =>
    installations.filter((i) => i.warehouseId === warehouseId);

  const getPlantsForInstallation = (installationId: string) =>
    plants.filter((p) => p.installationId === installationId);

  const getMaterialsForInstallation = (installationId: string) =>
    materials.filter((m) => m.installationId === installationId);

  const isPostHarvest = (warehouseId: string) =>
    POST_HARVEST_WAREHOUSE_IDS.includes(warehouseId);

  const getPlantCountsByState = (installationId: string) => {
    const installationPlants = getPlantsForInstallation(installationId);
    return {
      madre: installationPlants.filter((p) => p.state === 'madre').length,
      esqueje: installationPlants.filter((p) => p.state === 'esqueje').length,
      vegetativo: installationPlants.filter((p) => p.state === 'vegetativo').length,
      floracion: installationPlants.filter((p) => p.state === 'floracion').length,
    };
  };

  return (
    <div className="card-elevated">
      <div className="border-b border-border p-4">
        <h3 className="font-semibold text-foreground">Resumen de Locaciones</h3>
        <p className="text-sm text-muted-foreground">Plantas por almacén e instalación</p>
      </div>
      <div className="divide-y divide-border">
        {warehouses.map((warehouse, index) => {
          const warehouseInstallations = getInstallationsForWarehouse(warehouse.id);
          const postHarvest = isPostHarvest(warehouse.id);
          const totalPlants = warehouseInstallations.reduce(
            (sum, inst) => sum + getPlantsForInstallation(inst.id).length,
            0
          );
          const totalGrams = postHarvest
            ? warehouseInstallations.reduce(
                (sum, inst) =>
                  sum + getMaterialsForInstallation(inst.id).reduce((s, m) => s + m.weightGrams, 0),
                0
              )
            : 0;

          return (
            <div
              key={warehouse.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Warehouse header */}
              <div className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  postHarvest ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-primary/10'
                )}>
                  {postHarvest
                    ? <Package className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                    : <Building2 className="h-5 w-5 text-primary" />
                  }
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{warehouse.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {warehouseInstallations.length} instalaciones •{' '}
                    {postHarvest ? `${totalGrams.toFixed(1)}g almacenados` : `${totalPlants} plantas`}
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">
                  {warehouse.type}
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Installations */}
              <div className="pl-8 pr-4 pb-4">
                <div className="grid gap-2">
                  {warehouseInstallations.map((installation) => {
                    if (postHarvest) {
                      const instMaterials = getMaterialsForInstallation(installation.id);
                      const instGrams = instMaterials.reduce((s, m) => s + m.weightGrams, 0);
                      return (
                        <div
                          key={installation.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="flex-1 text-sm font-medium">{installation.name}</span>
                          <div className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            {instGrams.toFixed(1)}g
                          </div>
                          <span className="text-xs text-muted-foreground">{instMaterials.length} lotes</span>
                        </div>
                      );
                    }

                    const counts = getPlantCountsByState(installation.id);
                    const total = Object.values(counts).reduce((a, b) => a + b, 0);

                    return (
                      <div
                        key={installation.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <Leaf className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm font-medium">{installation.name}</span>
                        {/* State badges */}
                        <div className="flex items-center gap-1.5">
                          {(Object.entries(counts) as [PlantState, number][]).map(
                            ([state, count]) =>
                              count > 0 && (
                                <div
                                  key={state}
                                  className={cn(
                                    'flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded text-[10px] font-semibold text-white',
                                    stateColors[state]
                                  )}
                                >
                                  {count}
                                </div>
                              )
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{total} total</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

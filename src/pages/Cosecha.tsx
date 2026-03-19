import { useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Flower2, Wheat, ArrowRight, Check, Layers, Scissors, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  organization_id: string;
};

type Genetic = { id: string; name: string; chemotype_code: string };

export default function Cosecha() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [selectedPlantIds, setSelectedPlantIds] = useState<Set<string>>(new Set());
  const [dragOverSecado, setDragOverSecado] = useState(false);
  const dragPlantId = useRef<string | null>(null);

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    plants: Plant[];
    mode: 'single' | 'multi';
  } | null>(null);
  const [harvestMode, setHarvestMode] = useState<'individual' | 'unified'>('individual');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));

  // Fetch plantas en floración
  const { data: plants = [], isLoading } = useQuery({
    queryKey: ['plants-floracion', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('state', 'floracion')
        .order('serial_number');
      if (error) throw error;
      return data as Plant[];
    },
    enabled: !!orgId,
  });

  const { data: genetics = [] } = useQuery({
    queryKey: ['genetics', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('genetics')
        .select('id, name, chemotype_code')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as Genetic[];
    },
    enabled: !!orgId,
  });

  // Fetch secado installation
  const { data: secadoInst } = useQuery({
    queryKey: ['secado-inst', orgId],
    queryFn: async () => {
      const { data: wh } = await supabase
        .from('warehouses')
        .select('id')
        .eq('name', 'Post-Cosecha')
        .eq('organization_id', orgId!)
        .single();
      if (!wh) return null;
      const { data } = await supabase
        .from('installations')
        .select('id, warehouse_id')
        .eq('warehouse_id', wh.id)
        .eq('name', 'Secado')
        .single();
      return data;
    },
    enabled: !!orgId,
  });

  const secadoId = secadoInst?.id;
  const postcosechaWhId = secadoInst?.warehouse_id;

  const getGenetic = (plant: Plant) => genetics.find(g => g.id === plant.genetic_id);

  const generateMvCode = (plant: Plant, date: string, suffix?: string) => {
    const genetic = getGenetic(plant);
    const dateCode = date.replace(/-/g, '').slice(2);
    const prefix = (genetic?.name || plant.serial_number).substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    return `MV-${prefix}-${dateCode}-${suffix || Date.now().toString().slice(-4)}`;
  };

  // Harvest mutation
  const harvestMutation = useMutation({
    mutationFn: async ({ plants, mode, date }: { plants: Plant[]; mode: 'individual' | 'unified'; date: string }) => {
      if (!secadoId || !postcosechaWhId) throw new Error('No se encontró la locación de Secado');

      if (mode === 'individual' || plants.length === 1) {
        // Crear un lote por cada planta
        for (let i = 0; i < plants.length; i++) {
          const plant = plants[i];
          const genetic = getGenetic(plant);
          const code = generateMvCode(plant, date, `${Date.now().toString().slice(-3)}${i}`);

          const { error: matError } = await supabase.from('harvest_materials').insert({
            organization_id: orgId,
            id: `mat-${Date.now()}-${i}`,
            code,
            name: `Materia Vegetal ${genetic?.name || plant.serial_number}`,
            plant_id: plant.id,
            plant_serial: plant.serial_number,
            genetic_id: plant.genetic_id,
            genetic_name: genetic?.name || null,
            weight_grams: 0,
            installation_id: secadoId,
            warehouse_id: postcosechaWhId,
            harvest_date: new Date(date).toISOString(),
            notes: null,
          });
          if (matError) throw matError;

          const { error: plantError } = await supabase.rpc('soft_delete_plant', {
            plant_id: plant.id,
            org_id: orgId,
          });
          if (plantError) throw plantError;
        }

        // Log
        await supabase.from('activity_logs').insert({
          organization_id: orgId,
          id: `log-${Date.now()}`,
          type: 'cosecha',
          description: `Cosecha de ${plants.length} planta${plants.length > 1 ? 's' : ''} — lotes individuales`,
          plant_ids: plants.map(p => p.id),
          target_installation_id: secadoId,
          metadata: { plantas: plants.map(p => p.serial_number), modo: 'individual' },
        });

      } else {
        // Crear un lote unificado
        const firstPlant = plants[0];
        const genetic = getGenetic(firstPlant);
        const dateCode = date.replace(/-/g, '').slice(2);
        const prefix = (genetic?.name || 'MIX').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
        const code = `MV-${prefix}-${dateCode}-${Date.now().toString().slice(-4)}`;

        const { error: matError } = await supabase.from('harvest_materials').insert({
          organization_id: orgId,
          id: `mat-${Date.now()}`,
          code,
          name: `Materia Vegetal Unificada${genetic ? ` ${genetic.name}` : ''}`,
          plant_id: plants.map(p => p.id).join(','),
          plant_serial: plants.map(p => p.serial_number).join(', '),
          genetic_id: firstPlant.genetic_id,
          genetic_name: genetic?.name || null,
          weight_grams: 0,
          installation_id: secadoId,
          warehouse_id: postcosechaWhId,
          harvest_date: new Date(date).toISOString(),
          notes: `Lote unificado de: ${plants.map(p => p.serial_number).join(', ')}`,
        });
        if (matError) throw matError;

        // Dar de baja todas las plantas
        for (const plant of plants) {
          const { error } = await supabase.rpc('soft_delete_plant', {
            plant_id: plant.id,
            org_id: orgId,
          });
          if (error) throw error;
        }

        // Log
        await supabase.from('activity_logs').insert({
          organization_id: orgId,
          id: `log-${Date.now()}`,
          type: 'cosecha',
          description: `Cosecha unificada de ${plants.length} plantas → ${code}`,
          plant_ids: plants.map(p => p.id),
          target_installation_id: secadoId,
          metadata: { code, plantas: plants.map(p => p.serial_number), modo: 'unificado' },
        });
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['plants-floracion', orgId] });
      queryClient.invalidateQueries({ queryKey: ['plants', orgId] });
      queryClient.invalidateQueries({ queryKey: ['harvest_materials'] });
      queryClient.invalidateQueries({ queryKey: ['activity_logs'] });
      setConfirmDialog(null);
      setSelectedPlantIds(new Set());
      setHarvestMode('individual');
      toast.success(
        vars.mode === 'unified'
          ? `Lote unificado creado en Secado`
          : `${vars.plants.length} lote${vars.plants.length > 1 ? 's' : ''} creado${vars.plants.length > 1 ? 's' : ''} en Secado`
      );
    },
    onError: (e: any) => toast.error(`Error al cosechar: ${e.message}`),
  });

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, plantId: string) => {
    dragPlantId.current = plantId;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSecado(true);
  };

  const handleDragLeave = () => setDragOverSecado(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSecado(false);
    const plantId = dragPlantId.current;
    if (!plantId) return;
    dragPlantId.current = null;

    const plant = plants.find(p => p.id === plantId);
    if (!plant) return;

    // Si hay seleccionadas y la planta drageada está entre ellas, mover todas
    if (selectedPlantIds.has(plantId) && selectedPlantIds.size > 1) {
      const selectedPlants = plants.filter(p => selectedPlantIds.has(p.id));
      setConfirmDialog({ plants: selectedPlants, mode: 'multi' });
    } else {
      setConfirmDialog({ plants: [plant], mode: 'single' });
    }
  };

  const handleConfirm = () => {
    if (!confirmDialog) return;
    harvestMutation.mutate({
      plants: confirmDialog.plants,
      mode: confirmDialog.plants.length === 1 ? 'individual' : harvestMode,
      date: harvestDate,
    });
  };

  const toggleSelect = (plantId: string) => {
    setSelectedPlantIds(prev => {
      const next = new Set(prev);
      if (next.has(plantId)) next.delete(plantId);
      else next.add(plantId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPlantIds.size === plants.length) {
      setSelectedPlantIds(new Set());
    } else {
      setSelectedPlantIds(new Set(plants.map(p => p.id)));
    }
  };

  const handleCosecharSeleccionadas = () => {
    const selected = plants.filter(p => selectedPlantIds.has(p.id));
    if (selected.length === 0) return;
    setConfirmDialog({ plants: selected, mode: 'multi' });
  };

  return (
    <Layout title="Cosecha" subtitle="Mover plantas en floración a Secado">
      <div className="space-y-6">

        {/* Info banner */}
        {!secadoId && !isLoading && (
          <div className="card-elevated p-4 border-l-4 border-l-yellow-500 bg-yellow-50">
            <p className="text-sm text-yellow-800 font-medium">No se encontró la locación "Secado" en Post-Cosecha. Verificá que exista en Locaciones.</p>
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={selectAll} disabled={plants.length === 0}>
              {selectedPlantIds.size === plants.length && plants.length > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </Button>
            {selectedPlantIds.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedPlantIds.size} planta{selectedPlantIds.size !== 1 ? 's' : ''} seleccionada{selectedPlantIds.size !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {selectedPlantIds.size > 0 && (
            <Button className="gap-2" onClick={handleCosecharSeleccionadas}>
              <Wheat className="h-4 w-4" />
              Cosechar seleccionadas ({selectedPlantIds.size})
            </Button>
          )}
        </div>

        {/* Two columns: Floración | Secado */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Columna Floración */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                <Flower2 className="h-4 w-4 text-yellow-700" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">En Floración</h3>
                <p className="text-xs text-muted-foreground">{plants.length} plantas • arrastrá a Secado para cosechar</p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Cargando...</div>
            ) : plants.length === 0 ? (
              <div className="card-elevated p-12 text-center">
                <Flower2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No hay plantas en floración</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {plants.map(plant => {
                  const genetic = getGenetic(plant);
                  const isSelected = selectedPlantIds.has(plant.id);
                  return (
                    <div
                      key={plant.id}
                      draggable
                      onDragStart={e => handleDragStart(e, plant.id)}
                      onClick={() => toggleSelect(plant.id)}
                      className={cn(
                        'card-elevated p-3 cursor-grab active:cursor-grabbing select-none transition-all',
                        isSelected
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:border-yellow-300'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                          isSelected ? 'bg-primary border-primary' : 'border-border bg-background'
                        )}>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-sm font-semibold">{plant.serial_number}</code>
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">Floración</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {genetic?.name || 'Sin genética'} • Siembra: {format(new Date(plant.planting_date), 'dd/MM/yy', { locale: es })}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Columna Secado (drop zone) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                <Wheat className="h-4 w-4 text-orange-700" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Secado</h3>
                <p className="text-xs text-muted-foreground">Soltá plantas aquí para cosechar</p>
              </div>
            </div>

            {/* Aviso importante */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                <strong>Atención:</strong> Al cosechar, la planta se da de baja del sistema y se crea un lote de materia vegetal en Secado.
              </p>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'rounded-xl border-2 border-dashed min-h-[400px] flex flex-col items-center justify-center gap-3 transition-all',
                dragOverSecado
                  ? 'border-orange-400 bg-orange-50 scale-[1.02]'
                  : 'border-muted-foreground/20 bg-muted/20 hover:border-muted-foreground/40'
              )}
            >
              {dragOverSecado ? (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                    <Wheat className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="font-semibold text-orange-700">Soltar para cosechar</p>
                </>
              ) : (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Scissors className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground text-sm text-center px-8">
                    Arrastrá una o más plantas aquí para iniciar la cosecha
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    También podés seleccionar y usar el botón
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={open => { if (!open) { setConfirmDialog(null); setHarvestMode('individual'); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Cosecha</DialogTitle>
            <DialogDescription>
              {confirmDialog?.plants.length === 1
                ? <>Se cosechará <strong>{confirmDialog.plants[0].serial_number}</strong> y se creará un lote en Secado.</>
                : <>Se cosecharán <strong>{confirmDialog?.plants.length} plantas</strong> y serán dadas de baja.</>
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">

            {/* Plantas a cosechar */}
            <div className="rounded-lg bg-muted/40 border border-border p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2">Plantas seleccionadas</p>
              <div className="flex flex-wrap gap-1">
                {confirmDialog?.plants.map(p => (
                  <code key={p.id} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                    {p.serial_number}
                  </code>
                ))}
              </div>
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de cosecha</label>
              <input
                type="date"
                value={harvestDate}
                onChange={e => setHarvestDate(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Modo (solo si son múltiples) */}
            {confirmDialog && confirmDialog.plants.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">¿Cómo crear los lotes?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setHarvestMode('individual')}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      harvestMode === 'individual'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Scissors className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Individual</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Un lote por cada planta ({confirmDialog.plants.length} lotes)
                    </p>
                  </button>
                  <button
                    onClick={() => setHarvestMode('unified')}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      harvestMode === 'unified'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Layers className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Unificado</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Todo en un solo lote
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Info peso */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Wheat className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                El peso se puede completar más adelante desde <strong>Materia Vegetal</strong> cuando se pese en Curado.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmDialog(null); setHarvestMode('individual'); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!harvestDate || harvestMutation.isPending || !secadoId}
            >
              {harvestMutation.isPending ? 'Cosechando...' : 'Confirmar Cosecha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

import { useState } from 'react';
import { Installation, Plant, PlantState, PlantMaterial } from '@/types/cultivation';
import { PlantGrid } from './PlantGrid';
import { PlantDetailDialog } from './PlantDetailDialog';
import { MaterialMoveDialog } from './MaterialMoveDialog';
import { PlantStateBadge } from '@/components/plants/PlantStateBadge';
import { Thermometer, Droplets, Eye, Package, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePlants } from '@/contexts/PlantContext';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InstallationCardProps {
  installation: Installation;
  plants: Plant[];
  materials: PlantMaterial[];
  onDelete: () => void;
  onEdit: () => void;
}

const stateColors: Record<PlantState, string> = {
  madre: 'bg-state-mother',
  esqueje: 'bg-state-clone',
  vegetativo: 'bg-state-vegetative',
  floracion: 'bg-state-flowering',
};

const stateLabels: Record<PlantState, string> = {
  madre: 'Madres',
  esqueje: 'Esquejes',
  vegetativo: 'Vegetativo',
  floracion: 'Floración',
};

const STATE_OPTIONS: { value: PlantState; label: string }[] = [
  { value: 'madre', label: 'Madre' },
  { value: 'esqueje', label: 'Esqueje' },
  { value: 'vegetativo', label: 'Vegetativo' },
  { value: 'floracion', label: 'Floración' },
];

export function InstallationCard({ installation, plants, materials, onDelete, onEdit }: InstallationCardProps) {
  const navigate = useNavigate();
  const { movePlant, moveMaterial, plantMaterials, updateInstallationState, clearInstallationPlants } = usePlants();
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // Material move dialog state
  const [materialMoveOpen, setMaterialMoveOpen] = useState(false);
  const [pendingMaterial, setPendingMaterial] = useState<PlantMaterial | null>(null);

  const handlePlantClick = (plant: Plant) => {
    setSelectedPlant(plant);
    setDialogOpen(true);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/locaciones/${installation.id}`);
  };

  const handleStateChange = (newState: PlantState) => {
    updateInstallationState(installation.id, newState);
    toast({
      title: "Estado actualizado",
      description: `${installation.name} cambiado a ${stateLabels[newState]}. ${plants.length} plantas actualizadas.`,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));

      if (data.type === 'material') {
        const { materialId, sourceInstallationId } = data;
        if (sourceInstallationId === installation.id) return;

        const material = plantMaterials.find(m => m.id === materialId);
        if (!material) return;

        setPendingMaterial(material);
        setMaterialMoveOpen(true);
        return;
      }

      const { plantId, sourceInstallationId } = data;
      if (sourceInstallationId === installation.id) return;

      movePlant({
        plantId,
        targetInstallationId: installation.id,
        targetWarehouseId: installation.warehouseId,
      });

      toast({
        title: "Planta movida",
        description: `Planta trasladada a ${installation.name}${installation.state ? ` (${stateLabels[installation.state]})` : ''}`,
      });
    } catch (error) {
      console.error('Error processing drop:', error);
    }
  };

  const handleMaterialMoveConfirm = (materialId: string, grams: number) => {
    moveMaterial({
      materialId,
      gramsToMove: grams,
      targetInstallationId: installation.id,
      targetWarehouseId: installation.warehouseId,
    });

    toast({
      title: "Materia vegetal movida",
      description: `${grams}g trasladados a ${installation.name}`,
    });
  };

  const handleMaterialDragStart = (e: React.DragEvent, material: PlantMaterial) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'material',
        materialId: material.id,
        sourceInstallationId: installation.id,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const totalPlants = plants.length;
  const totalMaterialWeight = materials.reduce((sum, m) => sum + m.weightGrams, 0);

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'bg-card rounded-xl border-2 overflow-hidden transition-all duration-200',
          isDragOver 
            ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg' 
            : 'border-border hover:border-primary/30'
        )}
      >
        {/* Header */}
        <div className="p-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-foreground">{installation.name}</h4>
            <div className="flex flex-wrap items-center gap-1 min-w-0">
              {plants.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setClearDialogOpen(true); }}
                  className="p-1.5 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                  title="Eliminar todas las plantas"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="p-1.5 rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors shrink-0"
                  title="Editar locación"
                >
                  <Eye className="h-3.5 w-3.5" /> {/* Temporarily using Eye or Pencil if it was imported */}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-1.5 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                  title="Eliminar locación"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={handleViewDetails}
                className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                title="Ver detalles"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Thermometer className="h-3 w-3" />
              24°C
            </div>
            <div className="flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              65%
            </div>
            <span className="font-medium text-foreground">
              {totalPlants > 0 && `${totalPlants} plantas`}
              {totalPlants > 0 && materials.length > 0 && ' • '}
              {materials.length > 0 && `${materials.length} lotes (${totalMaterialWeight.toFixed(1)}g)`}
            </span>
          </div>
          {/* State selector */}
          {installation.state && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Estado:</span>
              <Select value={installation.state} onValueChange={(v) => handleStateChange(v as PlantState)}>
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Plant Grid */}
        <div className={cn(
          'min-h-[80px] transition-colors',
          isDragOver ? 'bg-primary/5' : 'bg-background/50'
        )}>
          {totalPlants > 0 ? (
            <PlantGrid 
              plants={plants} 
              onPlantClick={handlePlantClick} 
              installationId={installation.id}
            />
          ) : materials.length > 0 ? null : (
            <div className={cn(
              'flex items-center justify-center h-20 text-sm',
              isDragOver 
                ? 'text-primary font-medium' 
                : 'text-muted-foreground'
            )}>
              {isDragOver ? 'Soltar aquí' : 'Sin plantas'}
            </div>
          )}

          {/* Materials Grid */}
          {materials.length > 0 && (
            <div className="p-3 flex flex-wrap gap-2">
              {materials.map(mat => (
                <div
                  key={mat.id}
                  draggable
                  onDragStart={(e) => handleMaterialDragStart(e, mat)}
                  className="h-10 px-3 rounded-lg border-2 border-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 flex items-center gap-1.5 cursor-grab active:cursor-grabbing hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                  title={`${mat.code}\nPeso: ${mat.weightGrams}g\nEstado: ${mat.state}\nArrastrar para mover`}
                >
                  <Package className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-300" />
                  <span className="text-[10px] font-mono font-semibold text-emerald-800 dark:text-emerald-300 leading-tight">
                    {mat.weightGrams}g
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend - simplified since all plants share installation state */}
        {installation.state && totalPlants > 0 && (
          <div className="p-2 border-t border-border bg-muted/20 flex items-center gap-1.5">
            <div className={cn('h-2.5 w-2.5 rounded-full', stateColors[installation.state])} />
            <span className="text-xs text-muted-foreground">
              {stateLabels[installation.state]}: <span className="font-medium text-foreground">{totalPlants}</span>
            </span>
          </div>
        )}
        {materials.length > 0 && (
          <div className={cn('p-2 bg-muted/20 flex items-center gap-1.5', totalPlants === 0 && 'border-t border-border')}>
            <Package className="h-2.5 w-2.5 text-emerald-700 dark:text-emerald-400" />
            <span className="text-xs text-muted-foreground">
              Material: <span className="font-medium text-foreground">{materials.length}</span>
            </span>
          </div>
        )}
      </div>

      <PlantDetailDialog
        plant={selectedPlant}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <MaterialMoveDialog
        material={pendingMaterial}
        targetInstallationName={installation.name}
        open={materialMoveOpen}
        onOpenChange={setMaterialMoveOpen}
        onConfirm={handleMaterialMoveConfirm}
      />

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar todas las plantas?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán permanentemente las <span className="font-semibold">{plants.length} plantas</span> de <span className="font-semibold">{installation.name}</span>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                clearInstallationPlants(installation.id);
                toast({
                  title: "Plantas eliminadas",
                  description: `Se eliminaron ${plants.length} plantas de ${installation.name}.`,
                });
              }}
            >
              Eliminar todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { Plant } from '@/types/cultivation';
import { mockGenetics, mockInstallations } from '@/data/mockData';
import { usePlants } from '@/contexts/PlantContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlantStateBadge } from '@/components/plants/PlantStateBadge';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dna, 
  Calendar, 
  MapPin, 
  Hash, 
  GitBranch,
  FlaskConical,
  Leaf
} from 'lucide-react';

interface PlantDetailDialogProps {
  plant: Plant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlantDetailDialog({ plant, open, onOpenChange }: PlantDetailDialogProps) {
  const { getPlantById, warehouses } = usePlants();
  
  if (!plant) return null;


  const genetic = mockGenetics.find(g => g.id === plant.geneticId);
  const installation = mockInstallations.find(i => i.id === plant.installationId);
  const warehouse = warehouses.find(w => w.id === plant.warehouseId);
  const predecessor = plant.predecessorId ? getPlantById(plant.predecessorId) : null;
  const predecessorGenetic = predecessor ? mockGenetics.find(g => g.id === predecessor.geneticId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Leaf className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-lg font-bold">{plant.serialNumber}</span>
              <div className="mt-1">
                <PlantStateBadge state={plant.state} />
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Genetic Info */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Dna className="h-4 w-4 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Genética</p>
                <p className="font-semibold">{genetic?.name || 'Desconocida'}</p>
                {genetic?.description && (
                  <p className="text-xs text-muted-foreground mt-1">{genetic.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FlaskConical className="h-4 w-4 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Quimiotipo</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="font-mono">
                    Tipo {genetic?.chemotypeCode}
                  </Badge>
                  {genetic && (
                    <span className="text-xs text-muted-foreground">
                      THC: {genetic.thcRange} | CBD: {genetic.cbdRange}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Identification */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Nº de Lote</p>
                <p className="font-medium text-sm">{plant.lotNumber}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Fecha de Siembra</p>
                <p className="font-medium text-sm">
                  {format(new Date(plant.plantingDate), "dd MMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Ubicación</p>
              <p className="font-medium text-sm">
                {warehouse?.name} → {installation?.name}
              </p>
            </div>
          </div>

          {/* Predecessor */}
          {predecessor && (
            <div className="flex items-start gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Planta Madre</p>
                <p className="font-medium text-sm">
                  {predecessor.serialNumber}
                  {predecessorGenetic && (
                    <span className="text-muted-foreground"> ({predecessorGenetic.name})</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {plant.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notas</p>
                <p className="text-sm">{plant.notes}</p>
              </div>
            </>
          )}

          {/* Timestamps */}
          <div className="pt-2 border-t text-xs text-muted-foreground flex justify-between">
            <span>Creado: {format(new Date(plant.createdAt), "dd/MM/yyyy HH:mm")}</span>
            <span>Actualizado: {format(new Date(plant.updatedAt), "dd/MM/yyyy HH:mm")}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

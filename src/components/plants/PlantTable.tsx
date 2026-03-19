import { useState } from 'react';
import { Plant } from '@/types/cultivation';
import { CHEMOTYPES } from '@/types/cultivation';
import { getGeneticById } from '@/data/mockData';
import { PlantStateBadge } from './PlantStateBadge';
import { EditPlantDialog } from './EditPlantDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Button } from '@/components/ui/button';
import { Eye, MoreHorizontal, QrCode, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePlants } from '@/contexts/PlantContext';
import { toast } from 'sonner';

interface PlantTableProps {
  plants: Plant[];
  onViewPlant?: (plant: Plant) => void;
}

export function PlantTable({ plants, onViewPlant }: PlantTableProps) {
  const { deletePlant } = usePlants();
  const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null);
  const [plantToEdit, setPlantToEdit] = useState<Plant | null>(null);

  const handleDelete = async () => {
    if (!plantToDelete) return;
    try {
      await deletePlant(plantToDelete.id);
      toast.success(`Planta ${plantToDelete.serialNumber} eliminada`);
      setPlantToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete plant:', error);
      toast.error(`Error al eliminar planta: ${error.message || 'Error desconocido'}`);
    }
  };

  return (
    <>
      <div className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead>Nombre</TableHead>
              <TableHead className="w-[160px]">Nº Serie</TableHead>
              <TableHead className="w-[120px]">Lote</TableHead>
              <TableHead>Quimiotipo</TableHead>
              <TableHead>Genética</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha Siembra</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plants.map((plant, index) => {
              const genetic = plant.geneticId ? getGeneticById(plant.geneticId) : null;
              const chemotype = CHEMOTYPES[plant.chemotypeCode];
              
              return (
                <TableRow
                  key={plant.id}
                  className="animate-fade-in cursor-pointer hover:bg-muted/50"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <span className="font-medium">{plant.name}</span>
                  </TableCell>
                  <TableCell>
                    <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                      {plant.serialNumber}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{plant.lotNumber}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {chemotype?.name || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{genetic?.name || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <PlantStateBadge state={plant.state} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {format(plant.plantingDate, 'dd MMM yyyy', { locale: es })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewPlant?.(plant)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPlantToEdit(plant)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar planta
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setPlantToDelete(plant)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar planta
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!plantToDelete} onOpenChange={(open) => !open && setPlantToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar planta?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás por eliminar la planta <strong>{plantToDelete?.serialNumber}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditPlantDialog 
        plant={plantToEdit} 
        open={!!plantToEdit} 
        onOpenChange={(open) => !open && setPlantToEdit(null)} 
      />
    </>
  );
}

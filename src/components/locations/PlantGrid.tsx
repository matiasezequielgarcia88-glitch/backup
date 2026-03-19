import { Plant, PlantState } from '@/types/cultivation';
import { mockGenetics } from '@/data/mockData';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PlantGridProps {
  plants: Plant[];
  onPlantClick: (plant: Plant) => void;
  installationId: string;
}

const stateBorderColors: Record<PlantState, string> = {
  madre: 'border-state-mother text-state-mother hover:bg-state-mother/10',
  esqueje: 'border-state-clone text-state-clone hover:bg-state-clone/10',
  vegetativo: 'border-state-vegetative text-state-vegetative hover:bg-state-vegetative/10',
  floracion: 'border-state-flowering text-state-flowering hover:bg-state-flowering/10',
};

const stateLabels: Record<PlantState, string> = {
  madre: 'Madre',
  esqueje: 'Esqueje',
  vegetativo: 'Vegetativo',
  floracion: 'Floración',
};

// Extract short code from serial number (e.g., "OGGI-2500001" -> "OGG-01")
const getShortCode = (serialNumber: string): string => {
  const parts = serialNumber.split('-');
  if (parts.length === 2) {
    const prefix = parts[0].substring(0, 3);
    const num = parts[1].slice(-2); // Last 2 digits
    return `${prefix}-${num}`;
  }
  return serialNumber.substring(0, 6);
};

export function PlantGrid({ plants, onPlantClick, installationId }: PlantGridProps) {
  const handleDragStart = (e: React.DragEvent, plant: Plant) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      plantId: plant.id,
      sourceInstallationId: installationId,
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex flex-wrap gap-2 p-3">
      {plants.map((plant) => {
        const genetic = mockGenetics.find(g => g.id === plant.geneticId);
        const shortCode = getShortCode(plant.serialNumber);
        
        return (
          <Tooltip key={plant.id}>
            <TooltipTrigger asChild>
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, plant)}
                onClick={() => onPlantClick(plant)}
                className={cn(
                  'h-10 w-10 rounded-full cursor-grab transition-all duration-200',
                  'border-2 bg-transparent flex items-center justify-center',
                  'hover:scale-110 active:scale-105 active:cursor-grabbing',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  stateBorderColors[plant.state]
                )}
                aria-label={`Planta ${plant.serialNumber}`}
              >
                <span className="text-[8px] font-bold leading-none text-center pointer-events-none">
                  {shortCode}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-semibold">{plant.serialNumber}</p>
              <p className="text-muted-foreground">
                {genetic?.name} • {stateLabels[plant.state]}
              </p>
              <p className="text-muted-foreground/70 text-[10px] mt-1">
                Arrastra para mover
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
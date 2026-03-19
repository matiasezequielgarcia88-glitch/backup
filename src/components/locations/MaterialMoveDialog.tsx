import { useState } from 'react';
import { PlantMaterial } from '@/types/cultivation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Package } from 'lucide-react';

interface MaterialMoveDialogProps {
  material: PlantMaterial | null;
  targetInstallationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (materialId: string, grams: number) => void;
}

export function MaterialMoveDialog({
  material,
  targetInstallationName,
  open,
  onOpenChange,
  onConfirm,
}: MaterialMoveDialogProps) {
  const [moveType, setMoveType] = useState<'total' | 'parcial'>('total');
  const [partialGrams, setPartialGrams] = useState('');

  if (!material) return null;

  const handleConfirm = () => {
    const grams = moveType === 'total' ? material.weightGrams : parseFloat(partialGrams);
    if (isNaN(grams) || grams <= 0 || grams > material.weightGrams) return;
    onConfirm(material.id, grams);
    onOpenChange(false);
    setMoveType('total');
    setPartialGrams('');
  };

  const isValid =
    moveType === 'total' ||
    (partialGrams !== '' &&
      !isNaN(parseFloat(partialGrams)) &&
      parseFloat(partialGrams) > 0 &&
      parseFloat(partialGrams) <= material.weightGrams);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Mover Materia Vegetal
          </DialogTitle>
          <DialogDescription>
            Elige cuánto mover a <span className="font-semibold">{targetInstallationName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Material info */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-sm font-mono font-semibold text-foreground">{material.code}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Peso disponible: <span className="font-bold text-foreground">{material.weightGrams}g</span>
            </p>
          </div>

          {/* Move type selection */}
          <RadioGroup value={moveType} onValueChange={(v) => setMoveType(v as 'total' | 'parcial')}>
            <div className="flex items-center space-x-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="total" id="total" />
              <Label htmlFor="total" className="flex-1 cursor-pointer">
                <span className="font-medium">Mover todo</span>
                <span className="text-sm text-muted-foreground ml-2">({material.weightGrams}g)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="parcial" id="parcial" />
              <Label htmlFor="parcial" className="flex-1 cursor-pointer">
                <span className="font-medium">Mover una parte</span>
              </Label>
            </div>
          </RadioGroup>

          {/* Partial amount input */}
          {moveType === 'parcial' && (
            <div className="space-y-2 pl-8">
              <Label htmlFor="grams">Cantidad a mover (gramos)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="grams"
                  type="number"
                  min={0.1}
                  max={material.weightGrams}
                  step={0.1}
                  value={partialGrams}
                  onChange={(e) => setPartialGrams(e.target.value)}
                  placeholder={`Máx: ${material.weightGrams}g`}
                  className="max-w-[180px]"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground">/ {material.weightGrams}g</span>
              </div>
              {partialGrams && parseFloat(partialGrams) > material.weightGrams && (
                <p className="text-xs text-destructive">No puedes mover más del total disponible</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Mover {moveType === 'total' ? `${material.weightGrams}g` : partialGrams ? `${partialGrams}g` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

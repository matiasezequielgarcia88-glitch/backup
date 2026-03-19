import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CHEMOTYPES, ChemotypeCode } from '@/types/cultivation';
import { usePlants } from '@/contexts/PlantContext';
import { toast } from 'sonner';

interface NewPlantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPlantDialog({ open, onOpenChange }: NewPlantDialogProps) {
  const { plants, installations, genetics, addPlant, warehouses } = usePlants();
  const [name, setName] = useState('');
  const [chemotypeCode, setChemotypeCode] = useState<ChemotypeCode | ''>('');
  const [geneticId, setGeneticId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [installationId, setInstallationId] = useState('');
  const [notes, setNotes] = useState('');

  const filteredInstallations = installations.filter(
    (inst) => inst.warehouseId === warehouseId
  );

  const filteredGenetics = chemotypeCode
    ? genetics.filter((g) => g.chemotypeCode === chemotypeCode)
    : genetics;

  const selectedInstallation = installations.find(i => i.id === installationId);

  const stateLabels: Record<string, string> = {
    madre: 'Madre',
    esqueje: 'Esqueje',
    vegetativo: 'Vegetativo',
    floracion: 'Floración',
  };

  const handleSubmit = () => {
    if (!name || !chemotypeCode || !warehouseId || !installationId) {
      toast.error('Completá todos los campos obligatorios');
      return;
    }

    const now = new Date();
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const maxIndex = plants.reduce((max, p) => {
      const match = p.serialNumber.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const serialNumber = `${prefix}${chemotypeCode}-25${String(maxIndex + 1).padStart(5, '0')}`;
    const lotNumber = `${prefix}${now.toISOString().slice(2, 10).replace(/-/g, '')}`;

    const newPlant = {
      id: `plant-new-${Date.now()}`,
      name,
      serialNumber,
      lotNumber,
      geneticId: geneticId || undefined,
      chemotypeCode: chemotypeCode as ChemotypeCode,
      state: selectedInstallation?.state || ('esqueje' as const),
      plantingDate: now,
      installationId,
      warehouseId,
      notes: notes || undefined,
      createdAt: now,
      updatedAt: now,
    };

    addPlant(newPlant);
    toast.success(`Planta "${name}" (${serialNumber}) creada exitosamente`);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setChemotypeCode('');
    setGeneticId('');
    setWarehouseId('');
    setInstallationId('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Planta</DialogTitle>
          <DialogDescription>
            Registrá una nueva planta. El estado se hereda de la instalación seleccionada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              placeholder="Nombre de la planta"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Quimiotipo *</Label>
            <Select
              value={chemotypeCode}
              onValueChange={(v) => {
                setChemotypeCode(v as ChemotypeCode);
                setGeneticId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar quimiotipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CHEMOTYPES).map((ct) => (
                  <SelectItem key={ct.code} value={ct.code}>
                    {ct.name} — {ct.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Genética (opcional)</Label>
            <Select value={geneticId} onValueChange={setGeneticId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar genética" />
              </SelectTrigger>
              <SelectContent>
                {filteredGenetics.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ubicación *</Label>
            <Select
              value={warehouseId}
              onValueChange={(v) => {
                setWarehouseId(v);
                setInstallationId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar almacén" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {warehouseId && (
            <div className="space-y-2">
              <Label>Instalación *</Label>
              <Select value={installationId} onValueChange={setInstallationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar instalación" />
                </SelectTrigger>
                <SelectContent>
                  {filteredInstallations.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name} {inst.state ? `(${stateLabels[inst.state]})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedInstallation?.state && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Estado asignado: </span>
              <span className="font-medium text-foreground">
                {stateLabels[selectedInstallation.state]}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                La planta hereda el estado de la instalación.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              placeholder="Notas opcionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Crear Planta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

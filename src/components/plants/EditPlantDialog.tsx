import { useState, useEffect } from 'react';
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
import { CHEMOTYPES, ChemotypeCode, Plant } from '@/types/cultivation';
import { usePlants } from '@/contexts/PlantContext';
import { toast } from 'sonner';

interface EditPlantDialogProps {
  plant: Plant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPlantDialog({ plant, open, onOpenChange }: EditPlantDialogProps) {
  const { installations, genetics, updatePlant, warehouses } = usePlants();
  const [name, setName] = useState('');
  const [chemotypeCode, setChemotypeCode] = useState<ChemotypeCode | ''>('');
  const [geneticId, setGeneticId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [installationId, setInstallationId] = useState('');
  const [notes, setNotes] = useState('');

  // Sincronizar estado cuando se abre con una nueva planta
  useEffect(() => {
    if (plant && open) {
      setName(plant.name);
      setChemotypeCode(plant.chemotypeCode);
      setGeneticId(plant.geneticId || '');
      setWarehouseId(plant.warehouseId);
      setInstallationId(plant.installationId);
      setNotes(plant.notes || '');
    }
  }, [plant, open]);

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
    if (!plant || !name || !chemotypeCode || !warehouseId || !installationId) {
      toast.error('Completá todos los campos obligatorios');
      return;
    }

    updatePlant(plant.id, {
      name,
      geneticId: geneticId || undefined,
      chemotypeCode: chemotypeCode as ChemotypeCode,
      installationId,
      warehouseId,
      notes: notes || undefined,
    });

    toast.success(`Planta "${name}" (${plant.serialNumber}) actualizada exitosamente`);
    onOpenChange(false);
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
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) resetForm();
      onOpenChange(v);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Planta</DialogTitle>
          <DialogDescription>
            Modificá los detalles de la planta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {plant && (
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nº Serie</Label>
                <div className="font-mono text-sm bg-muted/50 p-2 rounded">{plant.serialNumber}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Lote</Label>
                <div className="font-mono text-sm bg-muted/50 p-2 rounded">{plant.lotNumber}</div>
              </div>
            </div>
          )}

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
          <Button onClick={handleSubmit}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

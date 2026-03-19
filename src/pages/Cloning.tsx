import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CHEMOTYPES, ChemotypeCode } from '@/types/cultivation';
import { Scissors, ArrowRight, Check, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Plant = {
  id: string;
  name: string;
  serial_number: string;
  lot_number: string;
  genetic_id: string | null;
  chemotype_code: string;
  state: string;
  planting_date: string;
  installation_id: string;
  warehouse_id: string;
  notes: string | null;
  predecessor_id: string | null;
};

type Genetic = { id: string; name: string; chemotype_code: string; };
type Warehouse = { id: string; name: string; };
type Installation = { id: string; warehouse_id: string; name: string; state: string | null; };

export default function Cloning() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [selectedMother, setSelectedMother] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [targetInstallationId, setTargetInstallationId] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [generatedSerials, setGeneratedSerials] = useState<string[]>([]);

  // Fetch data
  const { data: plants = [] } = useQuery({
    queryKey: ['plants', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('*').eq('organization_id', orgId!);
      if (error) throw error;
      return data as Plant[];
    },
  });

  const { data: genetics = [] } = useQuery({
    queryKey: ['genetics', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('genetics').select('id, name, chemotype_code').eq('organization_id', orgId!);
      if (error) throw error;
      return data as Genetic[];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('id, name').eq('organization_id', orgId!).order('name');
      if (error) throw error;
      return data as Warehouse[];
    },
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['installations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('installations').select('id, warehouse_id, name, state').eq('organization_id', orgId!).order('name');
      if (error) throw error;
      return data as Installation[];
    },
  });

  const motherPlants = plants.filter(p => p.state === 'madre');
  const selectedMotherData = motherPlants.find(p => p.id === selectedMother);
  const selectedMotherGenetic = selectedMotherData ? genetics.find(g => g.id === selectedMotherData.genetic_id) : null;
  const filteredInstallations = installations.filter(i => i.warehouse_id === targetWarehouseId);
  const selectedInstallation = installations.find(i => i.id === targetInstallationId);

  // Generate correlative serial numbers based on mother plant
  // Format: PREFIX-CHEMOTYPE-YYCnnn (e.g. PUN-I-26C001)
  const generateCloneSerials = (mother: Plant, qty: number, allPlants: Plant[]): string[] => {
    const parts = mother.serial_number.split('-');
    const prefix = parts[0] || mother.serial_number.substring(0, 3);
    const chemotype = mother.chemotype_code || parts[1] || '';
    const year = new Date().getFullYear().toString().slice(-2);
    const existingCloneNums = allPlants
      .filter(p => p.predecessor_id === mother.id)
      .map(p => {
        const match = p.serial_number.match(/C(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
    const startNum = existingCloneNums.length > 0 ? Math.max(...existingCloneNums) + 1 : 1;
    return Array.from({ length: qty }, (_, i) =>
      `${prefix}-${chemotype}-${year}C${String(startNum + i).padStart(3, '0')}`
    );
  };

  // Create clones mutation
  const cloneMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMotherData || !targetInstallationId || !selectedInstallation) return;
      const now = new Date();
      const serials = generateCloneSerials(selectedMotherData, quantity, plants);
      const genetic = genetics.find(g => g.id === selectedMotherData.genetic_id);
      const lotNumber = genetic
        ? `${genetic.name.substring(0, 3).toUpperCase()}${now.toISOString().slice(2, 10).replace(/-/g, '')}`
        : selectedMotherData.lot_number;

      const newPlants = serials.map((serial, i) => ({
        organization_id: orgId,
        id: `plant-clone-${Date.now()}-${i}`,
        name: `${genetic?.name || 'Clon'} Clon ${i + 1}`,
        serial_number: serial,
        lot_number: lotNumber,
        genetic_id: selectedMotherData.genetic_id,
        chemotype_code: selectedMotherData.chemotype_code,
        state: selectedInstallation.state || 'esqueje',
        planting_date: now.toISOString(),
        predecessor_id: selectedMotherData.id,
        installation_id: targetInstallationId,
        warehouse_id: targetWarehouseId,
        notes: notes.trim() || null,
      }));

      const { error } = await supabase.from('plants').insert(newPlants);
      if (error) throw error;
      return serials;
    },
    onSuccess: (serials) => {
      queryClient.invalidateQueries({ queryKey: ['plants', orgId] });
      setGeneratedSerials(serials || []);
      setStep(3);
      toast.success(`Se generaron ${quantity} esquejes correctamente`);
    },
    onError: (error: any) => toast.error(`Error al generar esquejes: ${error.message}`),
  });

  const handleReset = () => {
    setStep(1);
    setSelectedMother('');
    setQuantity(10);
    setTargetWarehouseId('');
    setTargetInstallationId('');
    setNotes('');
    setGeneratedSerials([]);
  };

  return (
    <Layout title="Generación de Esquejes" subtitle="Crear nuevos clones a partir de plantas madre">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Progress steps */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Seleccionar Madre' },
              { num: 2, label: 'Configurar Esquejes' },
              { num: 3, label: 'Confirmación' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className={cn(
                  'flex items-center justify-center h-10 w-10 rounded-full font-semibold transition-colors',
                  step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {step > s.num ? <Check className="h-5 w-5" /> : s.num}
                </div>
                <span className={cn('ml-3 text-sm font-medium hidden sm:block', step >= s.num ? 'text-foreground' : 'text-muted-foreground')}>
                  {s.label}
                </span>
                {idx < 2 && <ArrowRight className="mx-4 h-5 w-5 text-muted-foreground hidden sm:block" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select mother plant */}
        {step === 1 && (
          <div className="card-elevated p-6 space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Seleccionar Planta Madre</h2>
              <p className="text-sm text-muted-foreground">Elegí la planta madre de la cual se generarán los esquejes</p>
            </div>

            {motherPlants.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay plantas en estado "Madre". Creá una planta y asignala a una locación con estado Madre.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {motherPlants.map((plant) => {
                const genetic = genetics.find(g => g.id === plant.genetic_id);
                const chemotype = genetic ? CHEMOTYPES[genetic.chemotype_code as ChemotypeCode] : null;
                const cloneCount = plants.filter(p => p.predecessor_id === plant.id).length;

                return (
                  <div
                    key={plant.id}
                    onClick={() => setSelectedMother(plant.id)}
                    className={cn(
                      'p-4 rounded-lg border-2 cursor-pointer transition-all',
                      selectedMother === plant.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                        <Leaf className="h-5 w-5 text-purple-700" />
                      </div>
                      {selectedMother === plant.id && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <h3 className="font-semibold text-foreground">{genetic?.name || 'Sin genética'}</h3>
                    <p className="text-xs text-muted-foreground mb-1">{chemotype?.name || plant.chemotype_code}</p>
                    <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono block mb-1">{plant.serial_number}</code>
                    <p className="text-xs text-muted-foreground">{cloneCount} esquejes previos</p>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!selectedMother}>
                Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Configure clones */}
        {step === 2 && selectedMotherData && (
          <div className="card-elevated p-6 space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Configurar Esquejes</h2>
              <p className="text-sm text-muted-foreground">Definí la cantidad y destino de los nuevos esquejes</p>
            </div>

            {/* Mother summary */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Planta Madre</p>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <Leaf className="h-6 w-6 text-purple-700" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedMotherGenetic?.name || 'Sin genética'}</p>
                  <p className="text-sm text-muted-foreground font-mono">{selectedMotherData.serial_number}</p>
                  {selectedMotherGenetic && (
                    <p className="text-xs text-muted-foreground">{CHEMOTYPES[selectedMotherGenetic.chemotype_code as ChemotypeCode]?.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cantidad de Esquejes</Label>
                <Input
                  type="number" min={1} max={100} value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <p className="text-xs text-muted-foreground">Se generarán {quantity} códigos correlativos desde la madre</p>
              </div>

              <div className="space-y-2">
                <Label>Sala destino *</Label>
                <Select value={targetWarehouseId} onValueChange={v => { setTargetWarehouseId(v); setTargetInstallationId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar sala" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {targetWarehouseId && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Locación destino *</Label>
                  <Select value={targetInstallationId} onValueChange={setTargetInstallationId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar locación" /></SelectTrigger>
                    <SelectContent>
                      {filteredInstallations.map(inst => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.name}{inst.state ? ` (${inst.state})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Observaciones sobre el proceso de esquejado..."
                value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              />
            </div>

            {/* Preview */}
            <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30">
              <p className="text-sm font-medium text-foreground mb-2">Vista previa</p>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Planta madre:</span>
                  <code className="text-xs font-mono">{selectedMotherData.serial_number}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cantidad:</span>
                  <span className="font-medium">{quantity} esquejes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Genética heredada:</span>
                  <span>{selectedMotherGenetic?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ejemplo de código:</span>
                  <code className="text-xs font-mono">{selectedMotherData.serial_number.split('-')[0]}-{selectedMotherData.serial_number.split('-')[1]}-{new Date().getFullYear().toString().slice(-2)}C001</code>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
              <Button
                onClick={() => cloneMutation.mutate()}
                disabled={!targetInstallationId || cloneMutation.isPending}
                className="gap-2"
              >
                <Scissors className="h-4 w-4" />
                {cloneMutation.isPending ? 'Generando...' : `Generar ${quantity} Esquejes`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="card-elevated p-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
                <Check className="h-8 w-8 text-green-700" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">¡Esquejes Generados!</h2>
              <p className="text-muted-foreground">
                Se crearon {generatedSerials.length} registros vinculados a la planta madre en Supabase
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border mb-6">
              <p className="text-sm font-medium text-foreground mb-3">Códigos generados:</p>
              <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto">
                {generatedSerials.map((serial, idx) => (
                  <code key={idx} className="text-xs bg-muted px-2 py-1 rounded font-mono">{serial}</code>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleReset}>Nuevo Esquejado</Button>
              <Button onClick={() => navigate('/plantas')}>Ver Plantas</Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

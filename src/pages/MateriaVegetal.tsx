import { useState, useRef, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, Wheat, ArrowRight, Package, Plus, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Material = {
  id: string;
  code: string;
  name: string;
  plant_id: string;
  plant_serial: string;
  genetic_id: string | null;
  genetic_name: string | null;
  weight_grams: number;
  installation_id: string;
  warehouse_id: string;
  harvest_date: string;
  notes: string | null;
  created_at: string;
};

type Installation = { id: string; warehouse_id: string; name: string; };
type Warehouse = { id: string; name: string; };
type Genetic = { id: string; name: string; chemotype_code: string; };

const STAGE_DEFS = [
  { name: 'Secado',   bg: 'bg-orange-50',  border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800' },
  { name: 'Curado',   bg: 'bg-amber-50',   border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-800' },
  { name: 'Despacho', bg: 'bg-green-50',   border: 'border-green-200',  badge: 'bg-green-100 text-green-800' },
];

export default function MateriaVegetal() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const dragMaterialId = useRef<string | null>(null);
  const isDragging = useRef(false);
  const [dragOverInstId, setDragOverInstId] = useState<string | null>(null);

  // Move dialog state
  const [moveDialog, setMoveDialog] = useState<{ material: Material; targetInstId: string } | null>(null);
  const [moveAmount, setMoveAmount] = useState('');
  const [moveAll, setMoveAll] = useState(true);

  // Delete state
  const [deleteMaterial, setDeleteMaterial] = useState<Material | null>(null);

  // Editar peso state
  const [editWeightMaterial, setEditWeightMaterial] = useState<Material | null>(null);
  const [editWeightValue, setEditWeightValue] = useState('');

  // Creación manual state
  const [createOpen, setCreateOpen] = useState(false);
  const [createGeneticId, setCreateGeneticId] = useState('');
  const [createWeight, setCreateWeight] = useState('');
  const [createDate, setCreateDate] = useState(new Date().toISOString().slice(0, 10));
  const [createInstallationId, setCreateInstallationId] = useState('');
  const [createNotes, setCreateNotes] = useState('');

  const resetCreateForm = () => {
    setCreateGeneticId(''); setCreateWeight(''); setCreateNotes('');
    setCreateDate(new Date().toISOString().slice(0, 10)); setCreateInstallationId('');
  };

  // Fetch postcosecha installations dynamically — filter by warehouse name Post-Cosecha
  const { data: postcosaechaInsts = [] } = useQuery({
    queryKey: ['postcosecha-installations', orgId],
    queryFn: async () => {
      const { data: wh } = await supabase
        .from('warehouses')
        .select('id')
        .eq('name', 'Post-Cosecha')
        .eq('organization_id', orgId)
        .single();
      if (!wh) return [];
      const { data, error } = await supabase
        .from('installations')
        .select('id, name, warehouse_id')
        .eq('warehouse_id', wh.id)
        .in('name', ['Secado', 'Curado', 'Despacho'])
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Build dynamic stage order and labels
  // Map installation name -> id from fetched data
  const instIdByName = useMemo(() =>
    postcosaechaInsts.reduce<Record<string, string>>((acc, i) => { acc[i.name] = i.id; return acc; }, {}),
    [postcosaechaInsts]
  );
  const postcosechaWarehouseId = postcosaechaInsts[0]?.warehouse_id || 'wh-postcosecha';
  const despachoPostcosechaId = instIdByName['Despacho'] || 'inst-despacho';

  const { data: materials = [] } = useQuery({
    queryKey: ['harvest_materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('harvest_materials')
        .select('*')
        .order('harvest_date', { ascending: false });
      if (error) throw error;
      return data as Material[];
    },
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['installations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installations')
        .select('id, warehouse_id, name')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as Installation[];
    },
    enabled: !!orgId,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as Warehouse[];
    },
    enabled: !!orgId,
  });

  const { data: genetics = [] } = useQuery({
    queryKey: ['genetics', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('genetics')
        .select('id, name, chemotype_code')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return data as Genetic[];
    },
    enabled: !!orgId,
  });

  const getInstName = (id: string) => installations.find(i => i.id === id)?.name || id;
  const toNum = (v: number | string) => typeof v === 'string' ? parseFloat(v) || 0 : v;

  // Creación manual de materia vegetal
  const createMutation = useMutation({
    mutationFn: async () => {
      const genetic = genetics.find(g => g.id === createGeneticId);
      if (!genetic) throw new Error('Seleccioná una genética');
      if (!createInstallationId) throw new Error('Seleccioná una locación');
      const inst = postcosaechaInsts.find(i => i.id === createInstallationId);
      if (!inst) throw new Error('Locación inválida');

      const dateCode = createDate.replace(/-/g, '').slice(2);
      const prefix = genetic.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      const code = `MV-${prefix}-${dateCode}-${Date.now().toString().slice(-4)}`;

      const { error } = await supabase.from('harvest_materials').insert({
        organization_id: orgId,
        id: `mat-${Date.now()}`,
        code,
        name: `Materia Vegetal ${genetic.name}`,
        plant_id: 'manual',
        plant_serial: 'MANUAL',
        genetic_id: createGeneticId,
        genetic_name: genetic.name,
        weight_grams: parseFloat(createWeight),
        installation_id: createInstallationId,
        warehouse_id: inst.warehouse_id,
        harvest_date: new Date(createDate).toISOString(),
        notes: createNotes.trim() || null,
      });
      if (error) throw error;

      await supabase.from('activity_logs').insert({
        organization_id: orgId,
        id: `log-${Date.now()}`,
        type: 'cosecha',
        description: `Carga manual de materia vegetal: ${code} (${createWeight}g) — ${genetic.name}`,
        plant_ids: [],
        target_installation_id: createInstallationId,
        metadata: { code, weight: createWeight, genetic: genetic.name, manual: true },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest_materials'] });
      queryClient.invalidateQueries({ queryKey: ['activity_logs'] });
      toast.success('Lote de materia vegetal creado correctamente');
      setCreateOpen(false);
      resetCreateForm();
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  // Editar peso mutation
  const editWeightMutation = useMutation({
    mutationFn: async ({ id, weight }: { id: string; weight: number }) => {
      const { error } = await supabase
        .from('harvest_materials')
        .update({ weight_grams: weight, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest_materials'] });
      toast.success('Peso actualizado correctamente');
      setEditWeightMaterial(null);
      setEditWeightValue('');
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  // Move / split mutation
  const moveMutation = useMutation({
    mutationFn: async ({ material, targetInstId, grams }: { material: Material; targetInstId: string; grams: number }) => {
      const isFullMove = grams >= material.weight_grams;

      if (isFullMove) {
        // Move entire lot
        const { error } = await supabase.from('harvest_materials').update({
          installation_id: targetInstId,
          warehouse_id: postcosechaWarehouseId,
          updated_at: new Date().toISOString(),
        }).eq('id', material.id);
        if (error) throw error;
      } else {
        // Split: reduce original
        const { error: e1 } = await supabase.from('harvest_materials').update({
          weight_grams: Math.round((material.weight_grams - grams) * 10) / 10,
          updated_at: new Date().toISOString(),
        }).eq('id', material.id);
        if (e1) throw e1;

        // Create new lot
        const dateCode = format(new Date(material.harvest_date), 'ddMMyy');
        const prefix = (material.genetic_name || material.name).substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
        const newCode = `MV-${prefix}-${dateCode}-${Date.now().toString().slice(-4)}`;
        const { error: e2 } = await supabase.from('harvest_materials').insert({
          organization_id: orgId,
          id: `mat-${Date.now()}`,
          code: newCode,
          name: material.name,
          plant_id: material.plant_id,
          plant_serial: material.plant_serial,
          genetic_id: material.genetic_id,
          genetic_name: material.genetic_name,
          weight_grams: grams,
          installation_id: targetInstId,
          warehouse_id: postcosechaWarehouseId,
          harvest_date: material.harvest_date,
          notes: `Fracción de ${material.code}`,
        });
        if (e2) throw e2;
      }

      // Log
      await supabase.from('activity_logs').insert({
        organization_id: orgId,
        id: `log-${Date.now()}`,
        type: 'movimiento',
        description: `Traslado de ${grams}g de ${material.code} → ${getInstName(targetInstId)}`,
        plant_ids: [material.plant_id],
        source_installation_id: material.installation_id,
        target_installation_id: targetInstId,
        metadata: { code: material.code, grams, isPartial: !isFullMove },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest_materials'] });
      queryClient.invalidateQueries({ queryKey: ['activity_logs'] });
      toast.success('Materia vegetal movida correctamente');
      setMoveDialog(null);
      setMoveAmount('');
      setMoveAll(true);
    },
    onError: (e: any) => toast.error(`Error al mover: ${e.message}`),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('soft_delete_harvest_material', { material_id: id, org_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest_materials'] });
      toast.success('Lote eliminado');
      setDeleteMaterial(null);
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, materialId: string) => {
    dragMaterialId.current = materialId;
    isDragging.current = true;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, instId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverInstId(instId);
  };

  const handleDragLeave = () => setDragOverInstId(null);

  const handleDrop = (e: React.DragEvent, targetInstId: string) => {
    e.preventDefault();
    setDragOverInstId(null);
    isDragging.current = false;
    const matId = dragMaterialId.current;
    if (!matId) return;
    const material = materials.find(m => m.id === matId);
    if (!material || material.installation_id === targetInstId) return;
    dragMaterialId.current = null;
    // Open move dialog to choose amount
    setMoveAmount(String(material.weight_grams));
    setMoveAll(true);
    setMoveDialog({ material, targetInstId });
  };

  const handleConfirmMove = () => {
    if (!moveDialog) return;
    const grams = moveAll ? moveDialog.material.weight_grams : parseFloat(moveAmount);
    if (!grams || grams <= 0) { toast.error('Ingresá un peso válido'); return; }
    if (grams > moveDialog.material.weight_grams) { toast.error(`No podés mover más de ${moveDialog.material.weight_grams}g`); return; }

    // Validar peso obligatorio si el destino es Curado o Despacho
    const targetName = STAGE_DEFS.find(s => instIdByName[s.name] === moveDialog.targetInstId)?.name;
    if ((targetName === 'Curado' || targetName === 'Despacho') && toNum(moveDialog.material.weight_grams) === 0) {
      toast.error(`Debés ingresar el peso antes de mover a ${targetName}`);
      return;
    }

    moveMutation.mutate({ material: moveDialog.material, targetInstId: moveDialog.targetInstId, grams });
  };

  const totalStock = materials.reduce((sum, m) => sum + m.weight_grams, 0);

  return (
    <Layout title="Materia Vegetal" subtitle={`${materials.length} lotes • ${totalStock.toFixed(1)}g total`}>
      <div className="space-y-6">

        {/* Header con botón */}
        <div className="flex justify-end">
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo Lote Manual
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {STAGE_DEFS.map(stage => {
            const instId = instIdByName[stage.name] || '';
            const lotes = materials.filter(m => m.installation_id === instId);
            const grams = lotes.reduce((sum, m) => sum + toNum(m.weight_grams), 0);
            return (
              <div key={stage.name} className={`card-elevated p-4 border-l-4 ${stage.border}`}>
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{stage.name}</p>
                    <p className="text-2xl font-bold text-foreground">{grams.toFixed(1)}g</p>
                    <p className="text-xs text-muted-foreground">{lotes.length} lote{lotes.length !== 1 && 's'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Flow hint */}
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          {STAGE_DEFS.map((s, i) => (
            <div key={s.name} className="flex items-center gap-3">
              {i > 0 && <ArrowRight className="h-4 w-4" />}
              <span className={`px-3 py-1 rounded-full font-medium ${s.badge}`}>{s.name}</span>
            </div>
          ))}
          <span className="ml-2">• Arrastrá los lotes entre etapas</span>
        </div>

        {/* Stages with drag and drop */}
        <div className="grid gap-6 lg:grid-cols-3">
          {STAGE_DEFS.map(stage => {
            const instId = instIdByName[stage.name] || '';
            const instMaterials = materials.filter(m => m.installation_id === instId);
            const isDragOver = dragOverInstId === instId;
            const stageGrams = instMaterials.reduce((sum, m) => sum + toNum(m.weight_grams), 0);

            return (
              <div
                key={stage.name}
                className={`rounded-xl border-2 transition-all min-h-[300px] ${stage.bg} ${isDragOver ? 'border-primary scale-[1.02]' : stage.border}`}
                onDragOver={e => handleDragOver(e, instId)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, instId)}
              >
                {/* Stage header */}
                <div className={`p-4 border-b ${stage.border}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{stage.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stage.badge}`}>
                      {stageGrams.toFixed(1)}g
                    </span>
                  </div>
                </div>

                {/* Materials */}
                <div className="p-3 space-y-2">
                  {instMaterials.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border border-dashed border-muted-foreground/30 rounded-lg">
                      Soltá lotes aquí
                    </div>
                  )}
                  {instMaterials.map(mat => (
                    <div
                      key={mat.id}
                      draggable
                      onDragStart={e => handleDragStart(e, mat.id)}
                      onDragEnd={() => { isDragging.current = false; }}
                      className="bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Wheat className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
                            <code className="text-xs font-mono font-bold text-foreground truncate">{mat.code}</code>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{mat.name}</p>
                          {mat.genetic_name && (
                            <p className="text-xs text-muted-foreground">Genética: {mat.genetic_name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Planta: {mat.plant_serial}</p>
                          <p className="text-xs text-muted-foreground">
                            Cosecha: {format(new Date(mat.harvest_date), 'dd/MM/yyyy', { locale: es })}
                          </p>
                          {mat.notes && <p className="text-xs text-muted-foreground italic mt-1">{mat.notes}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {toNum(mat.weight_grams) === 0 ? (
                            <button
                              onClick={() => { setEditWeightMaterial(mat); setEditWeightValue(''); }}
                              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors font-medium"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                              Sin pesar
                            </button>
                          ) : (
                            <button
                              onClick={() => { setEditWeightMaterial(mat); setEditWeightValue(String(mat.weight_grams)); }}
                              className="flex items-center gap-1 text-lg font-bold text-foreground whitespace-nowrap hover:text-primary transition-colors group/weight"
                            >
                              {mat.weight_grams}g
                              <Pencil className="h-3 w-3 opacity-0 group-hover/weight:opacity-100 transition-opacity" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteMaterial(mat)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Dialog Editar Peso */}
      <Dialog open={!!editWeightMaterial} onOpenChange={open => { if (!open) { setEditWeightMaterial(null); setEditWeightValue(''); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Actualizar Peso</DialogTitle>
            <DialogDescription>
              <code className="font-mono">{editWeightMaterial?.code}</code> — {editWeightMaterial?.genetic_name || editWeightMaterial?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Peso en gramos *</Label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                placeholder="Ej: 250.5"
                value={editWeightValue}
                onChange={e => setEditWeightValue(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditWeightMaterial(null); setEditWeightValue(''); }}>Cancelar</Button>
            <Button
              onClick={() => editWeightMaterial && editWeightMutation.mutate({ id: editWeightMaterial.id, weight: parseFloat(editWeightValue) })}
              disabled={!editWeightValue || parseFloat(editWeightValue) <= 0 || editWeightMutation.isPending}
            >
              {editWeightMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Creación Manual */}
      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetCreateForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Lote de Materia Vegetal</DialogTitle>
            <DialogDescription>Cargá un lote de materia vegetal de forma manual eligiendo la genética y la locación destino.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">

            <div className="space-y-2">
              <Label>Genética *</Label>
              <Select value={createGeneticId} onValueChange={setCreateGeneticId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar genética..." /></SelectTrigger>
                <SelectContent>
                  {genetics.length === 0 ? (
                    <SelectItem value="none" disabled>No hay genéticas registradas</SelectItem>
                  ) : (
                    genetics.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Peso (gramos) *</Label>
                <Input
                  type="number" min="0.1" step="0.1"
                  placeholder="Ej: 250"
                  value={createWeight}
                  onChange={e => setCreateWeight(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={createDate}
                  onChange={e => setCreateDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Locación destino (Post-Cosecha) *</Label>
              <Select value={createInstallationId} onValueChange={setCreateInstallationId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar locación..." /></SelectTrigger>
                <SelectContent>
                  {postcosaechaInsts.length === 0 ? (
                    <SelectItem value="none" disabled>No hay locaciones de Post-Cosecha</SelectItem>
                  ) : (
                    postcosaechaInsts.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Solo se muestran locaciones dentro de Post-Cosecha</p>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Observaciones opcionales..."
                value={createNotes}
                onChange={e => setCreateNotes(e.target.value)}
                rows={2}
              />
            </div>

            {createGeneticId && createWeight && createDate && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
                Código que se generará: <code className="font-mono font-bold text-foreground">
                  MV-{genetics.find(g => g.id === createGeneticId)?.name.substring(0, 3).toUpperCase() || 'XXX'}-{createDate.replace(/-/g, '').slice(2)}-XXXX
                </code>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!createGeneticId || !createWeight || parseFloat(createWeight) <= 0 || !createInstallationId || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creando...' : 'Crear Lote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move / Split Dialog */}
      <Dialog open={!!moveDialog} onOpenChange={open => { if (!open) { setMoveDialog(null); setMoveAmount(''); setMoveAll(true); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mover Materia Vegetal</DialogTitle>
            <DialogDescription>
              Moviendo <strong>{moveDialog?.material.code}</strong> ({moveDialog?.material.weight_grams}g) → <strong>{moveDialog ? (STAGE_DEFS.find(s => instIdByName[s.name] === moveDialog.targetInstId)?.name || moveDialog.targetInstId) : ''}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-3">
              <button
                onClick={() => { setMoveAll(true); setMoveAmount(String(moveDialog?.material.weight_grams || '')); }}
                className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${moveAll ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
              >
                Todo el lote
                <p className="text-xs font-normal mt-0.5">{moveDialog?.material.weight_grams}g</p>
              </button>
              <button
                onClick={() => { setMoveAll(false); setMoveAmount(''); }}
                className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${!moveAll ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
              >
                Fracción
                <p className="text-xs font-normal mt-0.5">Especificar gramos</p>
              </button>
            </div>

            {!moveAll && (
              <div className="space-y-2">
                <Label>Gramos a mover *</Label>
                <Input
                  type="number" min="0.1" step="0.1"
                  max={moveDialog?.material.weight_grams}
                  placeholder={`Máx: ${moveDialog?.material.weight_grams}g`}
                  value={moveAmount}
                  onChange={e => setMoveAmount(e.target.value)}
                />
                {moveAmount && moveDialog && parseFloat(moveAmount) < moveDialog.material.weight_grams && (
                  <p className="text-xs text-muted-foreground">
                    Quedarán {(toNum(moveDialog.material.weight_grams) - parseFloat(moveAmount)).toFixed(1)}g en {STAGE_DEFS.find(s => instIdByName[s.name] === moveDialog.material.installation_id)?.name || moveDialog.material.installation_id}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog(null)}>Cancelar</Button>
            <Button
              onClick={handleConfirmMove}
              disabled={(!moveAll && (!moveAmount || parseFloat(moveAmount) <= 0)) || moveMutation.isPending}
            >
              {moveMutation.isPending ? 'Moviendo...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteMaterial} onOpenChange={open => !open && setDeleteMaterial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lote?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteMaterial?.code}</strong> ({deleteMaterial?.weight_grams}g). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMaterial && deleteMutation.mutate(deleteMaterial.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

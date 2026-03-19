import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Package, AlertTriangle, Wheat, Eye, Trash2, Pencil, Search, Plus, X, Leaf } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Entrega = {
  id: string; paciente_id: string; tipo_entrega: 'materia_vegetal' | 'plantas';
  cantidad: number; unidad: string; fecha_entrega: string; created_at: string;
  code: string | null; material_code: string | null; genetic_name: string | null;
  notas: string | null; material_id: string | null; plant_ids: string[] | null;
  pacientes: { nombre_apellido: string; dni: string } | null;
};
type Paciente = { id: string; dni: string; nombre_apellido: string };
type Material = { id: string; code: string; name: string; genetic_name: string | null; weight_grams: number | string };
type EsquejePlant = { id: string; name: string; serial_number: string; genetic_id: string | null; planting_date: string };
type GeneticStock = { genetic_id: string | null; genetic_name: string; count: number; plants: EsquejePlant[] };

const toNum = (v: number | string | undefined) => v === undefined ? 0 : typeof v === 'string' ? parseFloat(v) || 0 : v;

// Item types for the multi-item form
type VegetalItem = { id: string; material_id: string; cantidad: string };
type PlantaItem = { id: string; genetic_id: string; cantidad: string };

export default function Entregas() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailEntrega, setDetailEntrega] = useState<Entrega | null>(null);
  const [editEntrega, setEditEntrega] = useState<Entrega | null>(null);
  const [deleteEntrega, setDeleteEntrega] = useState<Entrega | null>(null);

  // Form state
  const [pacienteId, setPacienteId] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<'materia_vegetal' | 'plantas' | ''>('');
  const [fechaEntrega, setFechaEntrega] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notas, setNotas] = useState('');
  const [vegetalItems, setVegetalItems] = useState<VegetalItem[]>([{ id: '1', material_id: '', cantidad: '' }]);
  const [plantaItems, setPlantaItems] = useState<PlantaItem[]>([{ id: '1', genetic_id: '', cantidad: '' }]);

  const [editForm, setEditForm] = useState({ cantidad: '', fecha_entrega: '', notas: '' });

  // Queries
  const { data: entregas = [], isLoading } = useQuery({
    queryKey: ['entregas', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('entregas').select('*, pacientes(nombre_apellido, dni)').eq('organization_id', orgId!).order('fecha_entrega', { ascending: false });
      if (error) throw error;
      return data as Entrega[];
    },
    enabled: !!orgId,
  });

  const { data: pacientes = [] } = useQuery({
    queryKey: ['pacientes-list', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('pacientes').select('id, dni, nombre_apellido').eq('organization_id', orgId!).order('nombre_apellido');
      if (error) throw error;
      return data as Paciente[];
    },
    enabled: !!orgId,
  });

  // Despacho de Post-Cosecha (para materia vegetal)
  const { data: despachoInst } = useQuery({
    queryKey: ['despacho-postcosecha-inst', orgId],
    queryFn: async () => {
      const { data: wh } = await supabase.from('warehouses').select('id').eq('name', 'Post-Cosecha').eq('organization_id', orgId).single();
      if (!wh) return null;
      const { data } = await supabase.from('installations').select('id, warehouse_id').eq('warehouse_id', wh.id).eq('name', 'Despacho').single();
      return data;
    },
    enabled: !!orgId,
  });

  // Despacho de Sala Principal (para esquejes)
  const { data: despachoCultivoInst } = useQuery({
    queryKey: ['despacho-cultivo-inst', orgId],
    queryFn: async () => {
      const { data: wh } = await supabase.from('warehouses').select('id').eq('name', 'Sala Principal').eq('organization_id', orgId).single();
      if (!wh) return null;
      const { data } = await supabase.from('installations').select('id, warehouse_id').eq('warehouse_id', wh.id).eq('name', 'Despacho').single();
      return data;
    },
    enabled: !!orgId,
  });
  const despachoId = despachoInst?.id || 'inst-despacho';
  const despachoWarehouseId = despachoInst?.warehouse_id || 'wh-postcosecha';
  const despachoCultivoId = despachoCultivoInst?.id || 'inst-despacho-cultivo-c57db891';
  const despachoCultivoWhId = despachoCultivoInst?.warehouse_id || 'wh-principal-c57db891';

  const { data: stockDespacho = [] } = useQuery({
    queryKey: ['stock-despacho', despachoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('harvest_materials').select('id, code, name, genetic_name, weight_grams').eq('installation_id', despachoId).order('code');
      if (error) throw error;
      return data as Material[];
    },
  });

  const { data: esquejesRaw = [] } = useQuery({
    queryKey: ['esquejes-disponibles', despachoCultivoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('id, name, serial_number, genetic_id, planting_date').eq('state', 'esqueje').eq('installation_id', despachoCultivoId).order('planting_date', { ascending: true });
      if (error) throw error;
      return data as EsquejePlant[];
    },
  });

  const { data: genetics = [] } = useQuery({
    queryKey: ['genetics', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('genetics').select('id, name').eq('organization_id', orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Group esquejes by genetic
  const esquejesByGenetic: GeneticStock[] = Object.values(
    esquejesRaw.reduce<Record<string, GeneticStock>>((acc, p) => {
      const key = p.genetic_id || 'sin-genetica';
      const geneticName = genetics.find(g => g.id === p.genetic_id)?.name || 'Sin genética';
      if (!acc[key]) acc[key] = { genetic_id: p.genetic_id, genetic_name: geneticName, count: 0, plants: [] };
      acc[key].count++;
      acc[key].plants.push(p);
      return acc;
    }, {})
  );

  const totalDespacho = stockDespacho.reduce((sum, m) => sum + toNum(m.weight_grams), 0);

  const resetForm = () => {
    setPacienteId(''); setTipoEntrega(''); setFechaEntrega(format(new Date(), 'yyyy-MM-dd')); setNotas('');
    setVegetalItems([{ id: '1', material_id: '', cantidad: '' }]);
    setPlantaItems([{ id: '1', genetic_id: '', cantidad: '' }]);
  };

  const generateCode = () => {
    const date = format(new Date(), 'yyMMdd');
    const todayCount = entregas.filter(e => e.fecha_entrega.startsWith(new Date().toISOString().slice(0, 10))).length;
    return `ENT-${date}-${String(todayCount + 1).padStart(3, '0')}`;
  };

  // Validate items
  const activeVegetalItems = vegetalItems.filter(i => i.material_id && i.cantidad && parseFloat(i.cantidad) > 0);
  const activePlantaItems = plantaItems.filter(i => i.genetic_id && i.cantidad && parseInt(i.cantidad) > 0);

  const canSubmit = pacienteId && tipoEntrega && (
    tipoEntrega === 'materia_vegetal' ? activeVegetalItems.length > 0 : activePlantaItems.length > 0
  );

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const code = generateCode();

      if (tipoEntrega === 'materia_vegetal') {
        // Validate all items
        for (const item of activeVegetalItems) {
          const mat = stockDespacho.find(m => m.id === item.material_id);
          if (!mat) throw new Error(`Lote no encontrado`);
          const qty = parseFloat(item.cantidad);
          if (qty > toNum(mat.weight_grams)) throw new Error(`Stock insuficiente en ${mat.code}: disponible ${mat.weight_grams}g`);
        }
        // Apply changes
        for (const item of activeVegetalItems) {
          const mat = stockDespacho.find(m => m.id === item.material_id)!;
          const qty = parseFloat(item.cantidad);
          const newWeight = Math.round((toNum(mat.weight_grams) - qty) * 10) / 10;
          if (newWeight <= 0) {
            const { error } = await supabase.from('harvest_materials').delete().eq('id', item.material_id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('harvest_materials').update({ weight_grams: newWeight, updated_at: new Date().toISOString() }).eq('id', item.material_id);
            if (error) throw error;
          }
        }
        // Register one entrega per item
        for (const item of activeVegetalItems) {
          const mat = stockDespacho.find(m => m.id === item.material_id)!;
          const { error } = await supabase.from('entregas').insert({
            organization_id: orgId,
            paciente_id: pacienteId, tipo_entrega: 'materia_vegetal',
            cantidad: parseFloat(item.cantidad), unidad: 'gramos',
            fecha_entrega: fechaEntrega, code,
            material_code: mat.code, genetic_name: mat.genetic_name,
            material_id: item.material_id,
            notas: notas.trim() || null,
          });
          if (error) throw error;
        }
      } else {
        // Validate all plant items
        for (const item of activePlantaItems) {
          const stock = esquejesByGenetic.find(g => g.genetic_id === item.genetic_id);
          if (!stock) throw new Error(`Genética no encontrada`);
          if (parseInt(item.cantidad) > stock.count) throw new Error(`Solo hay ${stock.count} esquejes de ${stock.genetic_name}`);
        }
        // Apply changes
        for (const item of activePlantaItems) {
          const stock = esquejesByGenetic.find(g => g.genetic_id === item.genetic_id)!;
          const qty = parseInt(item.cantidad);
          const plantsToDelete = stock.plants.slice(0, qty).map(p => p.id);
          const { error } = await supabase.from('plants').delete().in('id', plantsToDelete);
          if (error) throw error;

          const geneticName = genetics.find(g => g.id === item.genetic_id)?.name || 'Sin genética';
          const deletedPlantIds = stock.plants.slice(0, qty).map(p => p.id);
          const { error: e2 } = await supabase.from('entregas').insert({
            organization_id: orgId,
            paciente_id: pacienteId, tipo_entrega: 'plantas',
            cantidad: qty, unidad: 'unidades',
            fecha_entrega: fechaEntrega, code,
            genetic_name: geneticName, notas: notas.trim() || null,
            plant_ids: deletedPlantIds,
          });
          if (e2) throw e2;
        }
      }

      // Log
      const paciente = pacientes.find(p => p.id === pacienteId);
      const totalItems = tipoEntrega === 'materia_vegetal' ? activeVegetalItems.length : activePlantaItems.length;
      await supabase.from('activity_logs').insert({
        organization_id: orgId,
        id: `log-${Date.now()}`, type: 'cambio_estado',
        description: `Entrega ${code}: ${totalItems} ítem(s) a ${paciente?.nombre_apellido || 'paciente'}`,
        plant_ids: [], metadata: { code, tipo: tipoEntrega, items: totalItems },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['stock-despacho', despachoId] });
      queryClient.invalidateQueries({ queryKey: ['harvest_materials'] });
      queryClient.invalidateQueries({ queryKey: ['esquejes-disponibles', despachoCultivoId] });
      queryClient.invalidateQueries({ queryKey: ['plants'] });
      queryClient.invalidateQueries({ queryKey: ['activity_logs'] });
      toast.success('Entrega registrada correctamente');
      setCreateOpen(false); resetForm();
    },
    onError: (e: any) => toast.error(e.message || 'Error al registrar entrega'),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editEntrega) return;
      const { error } = await supabase.from('entregas').update({ cantidad: parseFloat(editForm.cantidad), fecha_entrega: editForm.fecha_entrega, notas: editForm.notas.trim() || null }).eq('id', editEntrega.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['entregas'] }); toast.success('Entrega actualizada'); setEditEntrega(null); },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (entrega: Entrega) => {
      // Restore stock before deleting
      if (entrega.tipo_entrega === 'materia_vegetal' && entrega.material_id) {
        // Try to restore to original lot
        const { data: existingLot } = await supabase
          .from('harvest_materials')
          .select('id, weight_grams')
          .eq('id', entrega.material_id)
          .single();

        if (existingLot) {
          // Lot still exists, add back the grams
          const { error } = await supabase.from('harvest_materials').update({
            weight_grams: (typeof existingLot.weight_grams === 'string'
              ? parseFloat(existingLot.weight_grams)
              : existingLot.weight_grams) + entrega.cantidad,
            updated_at: new Date().toISOString(),
          }).eq('id', entrega.material_id);
          if (error) throw error;
        } else {
          // Lot was deleted, create a new one in Despacho
          const { error } = await supabase.from('harvest_materials').insert({
            id: `mat-${Date.now()}`,
            organization_id: orgId,
            code: `MV-REST-${Date.now().toString().slice(-6)}`,
            name: `Materia Vegetal Restaurada${entrega.genetic_name ? ` (${entrega.genetic_name})` : ''}`,
            plant_id: 'restored',
            plant_serial: 'REST',
            genetic_name: entrega.genetic_name,
            weight_grams: entrega.cantidad,
            installation_id: despachoId,
            warehouse_id: despachoWarehouseId,
            harvest_date: entrega.fecha_entrega,
            notes: `Restaurado al eliminar entrega ${entrega.code}`,
          });
          if (error) throw error;
        }
      } else if (entrega.tipo_entrega === 'plantas' && entrega.plant_ids && entrega.plant_ids.length > 0) {
        // Restore plants as esquejes in Despacho
        const plantsToRestore = entrega.plant_ids.map((pid, i) => ({
          id: `plant-rest-${Date.now()}-${i}`,
          organization_id: orgId,
          name: `Esqueje Restaurado ${entrega.genetic_name || ''}`.trim(),
          serial_number: `REST-${Date.now().toString().slice(-6)}-${String(i+1).padStart(3,'0')}`,
          lot_number: `REST${Date.now().toString().slice(-6)}`,
          genetic_id: null,
          chemotype_code: 'I',
          state: 'esqueje',
          planting_date: entrega.fecha_entrega,
          installation_id: 'inst-despacho',
          warehouse_id: 'wh-postcosecha',
          notes: `Restaurado al eliminar entrega ${entrega.code}. Genética: ${entrega.genetic_name || 'desconocida'}`,
        }));
        const { error } = await supabase.from('plants').insert(plantsToRestore);
        if (error) throw error;
      }

      const { error } = await supabase.rpc('soft_delete_record', { table_name: 'entregas', record_id: entrega.id, org_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['stock-despacho', despachoId] });
      queryClient.invalidateQueries({ queryKey: ['harvest_materials'] });
      queryClient.invalidateQueries({ queryKey: ['plants'] });
      toast.success('Entrega eliminada y stock restaurado');
      setDeleteEntrega(null);
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const openEdit = (e: Entrega) => { setEditEntrega(e); setEditForm({ cantidad: String(e.cantidad), fecha_entrega: e.fecha_entrega.slice(0, 10), notas: e.notas || '' }); };

  // Item management
  const addVegetalItem = () => setVegetalItems(prev => [...prev, { id: Date.now().toString(), material_id: '', cantidad: '' }]);
  const removeVegetalItem = (id: string) => setVegetalItems(prev => prev.filter(i => i.id !== id));
  const updateVegetalItem = (id: string, field: keyof VegetalItem, value: string) => setVegetalItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const addPlantaItem = () => setPlantaItems(prev => [...prev, { id: Date.now().toString(), genetic_id: '', cantidad: '' }]);
  const removePlantaItem = (id: string) => setPlantaItems(prev => prev.filter(i => i.id !== id));
  const updatePlantaItem = (id: string, field: keyof PlantaItem, value: string) => setPlantaItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const filtered = entregas.filter(e => {
    const q = search.toLowerCase();
    return (e.pacientes?.nombre_apellido?.toLowerCase() || '').includes(q) || (e.pacientes?.dni || '').includes(q) || (e.code?.toLowerCase() || '').includes(q);
  });

  // Total summary for form
  const totalVegetalGrams = activeVegetalItems.reduce((sum, i) => sum + parseFloat(i.cantidad || '0'), 0);
  const totalPlantasUnits = activePlantaItems.reduce((sum, i) => sum + parseInt(i.cantidad || '0'), 0);

  return (
    <Layout title="Entregas" subtitle="Registro de entregas a pacientes">
      <div className="space-y-4">

        {/* Stock summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`card-elevated p-4 border-l-4 ${totalDespacho > 0 ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
            <div className="flex items-center gap-3">
              <Wheat className={`h-5 w-5 ${totalDespacho > 0 ? 'text-green-600' : 'text-yellow-600'}`} />
              <div>
                <p className="text-sm font-medium">Stock en Despacho</p>
                <p className="text-xs text-muted-foreground">{totalDespacho > 0 ? `${totalDespacho.toFixed(1)}g disponibles` : 'Sin stock'}</p>
              </div>
            </div>
          </div>
          <div className={`card-elevated p-4 border-l-4 ${esquejesRaw.length > 0 ? 'border-l-blue-500' : 'border-l-yellow-500'}`}>
            <div className="flex items-center gap-3">
              <Leaf className={`h-5 w-5 ${esquejesRaw.length > 0 ? 'text-blue-600' : 'text-yellow-600'}`} />
              <div>
                <p className="text-sm font-medium">Esquejes disponibles</p>
                <p className="text-xs text-muted-foreground">{esquejesRaw.length > 0 ? `${esquejesRaw.length} plantas en estado esqueje` : 'Sin esquejes'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por paciente, DNI o código..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}><Package className="h-4 w-4" /> Nueva Entrega</Button>
        </div>

        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Genética / Lote</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No se encontraron entregas</TableCell></TableRow>
              ) : filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell><code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{e.code || '-'}</code></TableCell>
                  <TableCell className="text-sm">{format(new Date(e.fecha_entrega), 'dd/MM/yyyy', { locale: es })}</TableCell>
                  <TableCell className="font-medium">{e.pacientes?.nombre_apellido || '-'}</TableCell>
                  <TableCell><Badge variant={e.tipo_entrega === 'plantas' ? 'default' : 'secondary'}>{e.tipo_entrega === 'materia_vegetal' ? 'Mat. Vegetal' : 'Plantas'}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.genetic_name || '-'}
                    {e.material_code && <span className="ml-1 font-mono text-xs">({e.material_code})</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium">{e.cantidad} {e.unidad}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailEntrega(e)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteEntrega(e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Entrega</DialogTitle>
            <DialogDescription>Podés agregar múltiples ítems en una misma entrega.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">

            {/* Paciente y fecha */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Paciente *</Label>
                <Select value={pacienteId} onValueChange={setPacienteId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar paciente..." /></SelectTrigger>
                  <SelectContent>{pacientes.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre_apellido} — DNI {p.dni}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tipo de entrega *</Label>
                <Select value={tipoEntrega} onValueChange={v => { setTipoEntrega(v as any); }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="materia_vegetal">Materia Vegetal</SelectItem>
                    <SelectItem value="plantas">Plantas (Esquejes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Materia Vegetal items */}
            {tipoEntrega === 'materia_vegetal' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Lotes a entregar</Label>
                  <Button variant="outline" size="sm" className="gap-1 h-7" onClick={addVegetalItem}><Plus className="h-3 w-3" /> Agregar lote</Button>
                </div>
                {stockDespacho.length === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                    <AlertTriangle className="h-4 w-4" /> No hay materia vegetal en Despacho.
                  </div>
                )}
                {vegetalItems.map((item, idx) => {
                  const mat = stockDespacho.find(m => m.id === item.material_id);
                  const qty = parseFloat(item.cantidad || '0');
                  return (
                    <div key={item.id} className="flex gap-2 items-start p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="flex-1 space-y-2">
                        <Select value={item.material_id} onValueChange={v => updateVegetalItem(item.id, 'material_id', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar lote..." /></SelectTrigger>
                          <SelectContent>
                            {stockDespacho.map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.code} — {m.genetic_name || m.name} ({toNum(m.weight_grams)}g)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Input type="number" step="0.1" min="0.1" max={toNum(mat?.weight_grams)} placeholder="Gramos"
                            value={item.cantidad} onChange={e => updateVegetalItem(item.id, 'cantidad', e.target.value)}
                            className="h-8 text-xs" disabled={!item.material_id} />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {mat ? `/ ${toNum(mat.weight_grams)}g` : ''}
                          </span>
                        </div>
                        {mat && qty > 0 && qty <= toNum(mat.weight_grams) && (
                          <p className="text-xs text-muted-foreground">Quedará: {(toNum(mat.weight_grams) - qty).toFixed(1)}g en {mat.genetic_name || mat.name}</p>
                        )}
                        {mat && qty > toNum(mat.weight_grams) && (
                          <p className="text-xs text-destructive">Excede el stock disponible</p>
                        )}
                      </div>
                      {vegetalItems.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => removeVegetalItem(item.id)}><X className="h-3.5 w-3.5" /></Button>
                      )}
                    </div>
                  );
                })}
                {activeVegetalItems.length > 0 && (
                  <div className="text-sm font-medium text-right text-foreground">Total: {totalVegetalGrams.toFixed(1)}g</div>
                )}
              </div>
            )}

            {/* Plantas items */}
            {tipoEntrega === 'plantas' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Genéticas a entregar</Label>
                  <Button variant="outline" size="sm" className="gap-1 h-7" onClick={addPlantaItem}><Plus className="h-3 w-3" /> Agregar genética</Button>
                </div>
                {esquejesByGenetic.length === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                    <AlertTriangle className="h-4 w-4" /> No hay esquejes disponibles.
                  </div>
                )}
                {plantaItems.map((item) => {
                  const stock = esquejesByGenetic.find(g => g.genetic_id === item.genetic_id);
                  const qty = parseInt(item.cantidad || '0');
                  return (
                    <div key={item.id} className="flex gap-2 items-start p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="flex-1 space-y-2">
                        <Select value={item.genetic_id} onValueChange={v => updatePlantaItem(item.id, 'genetic_id', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar genética..." /></SelectTrigger>
                          <SelectContent>
                            {esquejesByGenetic.map(g => (
                              <SelectItem key={g.genetic_id || 'none'} value={g.genetic_id || 'none'}>
                                {g.genetic_name} — {g.count} esquejes
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Input type="number" step="1" min="1" max={stock?.count} placeholder="Cantidad"
                            value={item.cantidad} onChange={e => updatePlantaItem(item.id, 'cantidad', e.target.value)}
                            className="h-8 text-xs" disabled={!item.genetic_id} />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {stock ? `/ ${stock.count} disp.` : ''}
                          </span>
                        </div>
                        {stock && qty > 0 && qty <= stock.count && (
                          <p className="text-xs text-muted-foreground">Quedarán: {stock.count - qty} esquejes de {stock.genetic_name}</p>
                        )}
                        {stock && qty > stock.count && (
                          <p className="text-xs text-destructive">Solo hay {stock.count} esquejes disponibles</p>
                        )}
                      </div>
                      {plantaItems.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => removePlantaItem(item.id)}><X className="h-3.5 w-3.5" /></Button>
                      )}
                    </div>
                  );
                })}
                {activePlantaItems.length > 0 && (
                  <div className="text-sm font-medium text-right text-foreground">Total: {totalPlantasUnits} plantas</div>
                )}
              </div>
            )}

            {/* Notas */}
            {tipoEntrega && (
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea placeholder="Observaciones opcionales..." value={notas} onChange={e => setNotas(e.target.value)} className="text-sm" />
              </div>
            )}

            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!canSubmit || createMutation.isPending}>
              {createMutation.isPending ? 'Registrando...' : 'Confirmar Entrega'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailEntrega} onOpenChange={open => !open && setDetailEntrega(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Detalle de Entrega</DialogTitle><DialogDescription><code className="font-mono">{detailEntrega?.code || 'Sin código'}</code></DialogDescription></DialogHeader>
          {detailEntrega && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Paciente</p><p className="font-medium">{detailEntrega.pacientes?.nombre_apellido}</p></div>
                <div><p className="text-xs text-muted-foreground">DNI</p><p className="font-mono">{detailEntrega.pacientes?.dni}</p></div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Tipo</p><p className="font-medium">{detailEntrega.tipo_entrega === 'materia_vegetal' ? 'Materia Vegetal' : 'Plantas'}</p></div>
                <div><p className="text-xs text-muted-foreground">Cantidad</p><p className="font-bold text-lg">{detailEntrega.cantidad} {detailEntrega.unidad}</p></div>
              </div>
              {detailEntrega.material_code && <div><p className="text-xs text-muted-foreground">Lote</p><p className="font-mono text-xs">{detailEntrega.material_code}</p></div>}
              {detailEntrega.genetic_name && <div><p className="text-xs text-muted-foreground">Genética</p><p className="font-medium">{detailEntrega.genetic_name}</p></div>}
              <div><p className="text-xs text-muted-foreground">Fecha</p><p>{format(new Date(detailEntrega.fecha_entrega), "dd 'de' MMMM 'de' yyyy", { locale: es })}</p></div>
              {detailEntrega.notas && <div><p className="text-xs text-muted-foreground">Notas</p><p className="text-muted-foreground italic">{detailEntrega.notas}</p></div>}
              <Separator />
              <p className="text-xs text-muted-foreground">Registrado: {format(new Date(detailEntrega.created_at), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editEntrega} onOpenChange={open => !open && setEditEntrega(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar Entrega</DialogTitle><DialogDescription><code className="font-mono">{editEntrega?.code}</code></DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Cantidad ({editEntrega?.unidad})</Label><Input type="number" step="0.01" min="0.01" value={editForm.cantidad} onChange={e => setEditForm({ ...editForm, cantidad: e.target.value })} /></div>
            <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={editForm.fecha_entrega} onChange={e => setEditForm({ ...editForm, fecha_entrega: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={editForm.notas} onChange={e => setEditForm({ ...editForm, notas: e.target.value })} /></div>
            <Button className="w-full" onClick={() => editMutation.mutate()} disabled={!editForm.cantidad || editMutation.isPending}>{editMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteEntrega} onOpenChange={open => !open && setDeleteEntrega(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar entrega?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará <strong>{deleteEntrega?.code}</strong> — {deleteEntrega?.cantidad} {deleteEntrega?.unidad} a {deleteEntrega?.pacientes?.nombre_apellido}. El stock será restaurado automáticamente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteEntrega && deleteMutation.mutate(deleteEntrega)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

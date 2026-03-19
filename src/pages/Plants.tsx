import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Download, Eye, MoreHorizontal, Trash2, Pencil, QrCode, Wheat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CHEMOTYPES, ChemotypeCode } from '@/types/cultivation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type PlantState = 'madre' | 'esqueje' | 'vegetativo' | 'floracion';

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
  created_at: string;
  updated_at: string;
};

type Warehouse = { id: string; name: string; };
type Installation = { id: string; warehouse_id: string; name: string; state: string | null; };
type Genetic = { id: string; name: string; chemotype_code: string; };

const STATE_LABELS: Record<string, string> = {
  madre: 'Madre', esqueje: 'Esqueje', vegetativo: 'Vegetativo', floracion: 'Floración',
};

const STATE_COLORS: Record<string, string> = {
  madre: 'bg-purple-100 text-purple-800',
  esqueje: 'bg-blue-100 text-blue-800',
  vegetativo: 'bg-green-100 text-green-800',
  floracion: 'bg-yellow-100 text-yellow-800',
};

export default function Plants() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const orgId = profile?.organization_id;

  const auditLog = async (action: string, tableName: string, recordId: string, oldData?: any, newData?: any) => {
    await supabase.from('audit_logs').insert({
      organization_id: orgId,
      user_id: profile?.user_id,
      user_email: (await supabase.auth.getUser()).data.user?.email,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData || null,
      new_data: newData || null,
    });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<PlantState | 'all'>('all');
  const [geneticFilter, setGeneticFilter] = useState('all');

  const [newPlantOpen, setNewPlantOpen] = useState(false);
  const [editPlant, setEditPlant] = useState<Plant | null>(null);
  const [deletePlant, setDeletePlant] = useState<Plant | null>(null);
  const [harvestPlant, setHarvestPlant] = useState<Plant | null>(null);
  const [harvestWeight, setHarvestWeight] = useState('');
  const [harvestNotes, setHarvestNotes] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Form state (shared for create/edit)
  const [name, setName] = useState('');
  const [chemotypeCode, setChemotypeCode] = useState<ChemotypeCode | ''>('');
  const [geneticId, setGeneticId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [installationId, setInstallationId] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName(''); setChemotypeCode(''); setGeneticId('');
    setWarehouseId(''); setInstallationId(''); setNotes('');
  };

  // Fetch data
  const { data: plants = [] } = useQuery({
    queryKey: ['plants', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as Plant[];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('id, name').eq('organization_id', orgId).order('name');
      if (error) throw error;
      return data as Warehouse[];
    },
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['installations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('installations').select('id, warehouse_id, name, state').eq('organization_id', orgId).order('name');
      if (error) throw error;
      return data as Installation[];
    },
  });

  const { data: genetics = [] } = useQuery({
    queryKey: ['genetics', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('genetics').select('id, name, chemotype_code').eq('organization_id', orgId).order('name');
      if (error) throw error;
      return data as Genetic[];
    },
  });

  // Reset page when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const prevFilters = `${searchQuery}-${stateFilter}-${geneticFilter}`;
  useMemo(() => { setCurrentPage(1); }, [prevFilters]);

  // Get postcosecha installation IDs dynamically — from Post-Cosecha warehouse only
  const { data: postcosechaData } = useQuery({
    queryKey: ['postcosecha-ids', orgId],
    queryFn: async () => {
      const { data: wh } = await supabase
        .from('warehouses')
        .select('id')
        .eq('name', 'Post-Cosecha')
        .eq('organization_id', orgId)
        .single();
      if (!wh) return [];
      const { data } = await supabase
        .from('installations')
        .select('id, name, warehouse_id')
        .eq('warehouse_id', wh.id)
        .in('name', ['Secado']);
      return data || [];
    },
    enabled: !!orgId,
  });
  const secadoId = postcosechaData?.find(i => i.name === 'Secado')?.id || 'inst-secado';
  const postcosechaWhId = postcosechaData?.[0]?.warehouse_id || 'wh-postcosecha';

  // Filtered data for form
  const filteredInstallations = installations.filter(i => i.warehouse_id === warehouseId);
  const filteredGenetics = chemotypeCode ? genetics.filter(g => g.chemotype_code === chemotypeCode) : genetics;
  const selectedInstallation = installations.find(i => i.id === installationId);

  // Filtered plants for table
  const filteredPlants = useMemo(() => {
    return plants.filter(plant => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const genetic = genetics.find(g => g.id === plant.genetic_id);
        const matches =
          plant.name.toLowerCase().includes(query) ||
          plant.serial_number.toLowerCase().includes(query) ||
          plant.lot_number.toLowerCase().includes(query) ||
          (genetic?.name.toLowerCase().includes(query) ?? false);
        if (!matches) return false;
      }
      if (stateFilter !== 'all' && plant.state !== stateFilter) return false;
      if (geneticFilter !== 'all' && plant.genetic_id !== geneticFilter) return false;
      return true;
    });
  }, [plants, searchQuery, stateFilter, geneticFilter, genetics]);

  // Paginated plants
  const totalPages = Math.max(1, Math.ceil(filteredPlants.length / PAGE_SIZE));
  const paginatedPlants = filteredPlants.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Generate serial number — same format as clones: PREFIX-CODE-YYnnn
  const generateSerialNumber = (plantName: string, code: string) => {
    const prefix = plantName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const year = new Date().getFullYear().toString().slice(-2);
    const pattern = new RegExp(`^${prefix}-${code}-${year}(\\d+)$`);
    const maxNum = plants.reduce((max, p) => {
      const match = p.serial_number.match(pattern);
      if (match) { const n = parseInt(match[1]); return n > max ? n : max; }
      return max;
    }, 0);
    return `${prefix}-${code}-${year}${String(maxNum + 1).padStart(3, '0')}`;
  };

  // Create plant
  const createMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      const serialNumber = generateSerialNumber(name, chemotypeCode as string);
      const lotNumber = `${prefix}${now.toISOString().slice(2, 10).replace(/-/g, '')}`;
      const { error } = await supabase.from('plants').insert({
        id: `plant-${Date.now()}`,
        organization_id: orgId,
        name: name.trim(),
        serial_number: serialNumber,
        lot_number: lotNumber,
        genetic_id: geneticId || null,
        chemotype_code: chemotypeCode,
        state: selectedInstallation?.state || 'esqueje',
        planting_date: now.toISOString(),
        installation_id: installationId,
        warehouse_id: warehouseId,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants', orgId] });
      toast.success(`Planta "${name}" creada exitosamente`);
      setNewPlantOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(`Error al crear planta: ${error.message}`),
  });

  // Update plant
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editPlant) return;
      const { error } = await supabase.from('plants').update({
        name: name.trim(),
        genetic_id: geneticId || null,
        chemotype_code: chemotypeCode,
        installation_id: installationId,
        warehouse_id: warehouseId,
        state: selectedInstallation?.state || editPlant.state,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editPlant.id);
      if (error) throw error;
      await supabase.from('activity_logs').insert({
        id: `log-${Date.now()}`,
        organization_id: orgId,
        type: 'cambio_estado',
        description: `Edición de planta ${editPlant.serial_number}`,
        plant_ids: [editPlant.id],
        metadata: { serial: editPlant.serial_number, name: name.trim() },
      });
      await supabase.from('audit_logs').insert({
        organization_id: orgId,
        user_id: profile?.user_id,
        user_email: profile?.full_name,
        action: 'UPDATE',
        table_name: 'plants',
        record_id: editPlant.id,
        old_data: { name: editPlant.name, state: editPlant.state, installation_id: editPlant.installation_id },
        new_data: { name: name.trim(), installation_id: installationId },
      });
      await supabase.from('audit_logs').insert({
        organization_id: orgId,
        user_id: profile?.user_id,
        user_email: profile?.full_name,
        action: 'UPDATE',
        table_name: 'plants',
        record_id: editPlant.id,
        old_data: { name: editPlant.name, state: editPlant.state },
        new_data: { name: name.trim(), state: selectedInstallation?.state || editPlant.state },
      });
      await supabase.from('audit_logs').insert({
        organization_id: orgId,
        user_id: profile?.user_id,
        user_email: user?.email,
        action: 'UPDATE',
        table_name: 'plants',
        record_id: editPlant.id,
        old_data: { name: editPlant.name, state: editPlant.state, installation_id: editPlant.installation_id },
        new_data: { name: name.trim(), installation_id: installationId },
      });
      await supabase.from('audit_logs').insert({
        organization_id: orgId,
        user_id: user?.id,
        user_email: user?.email,
        action: 'UPDATE',
        table_name: 'plants',
        record_id: editPlant.id,
        old_data: { name: editPlant.name, state: editPlant.state, installation_id: editPlant.installation_id },
        new_data: { name: name.trim(), installation_id: installationId },
      });
      await supabase.from('audit_logs').insert({
        organization_id: orgId,
        user_id: profile?.user_id,
        user_email: profile?.full_name,
        action: 'UPDATE',
        table_name: 'plants',
        record_id: editPlant.id,
        old_data: { name: editPlant.name, state: editPlant.state },
        new_data: { name: name.trim(), state: selectedInstallation?.state || editPlant.state },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants', orgId] });
      queryClient.invalidateQueries({ queryKey: ['activity_logs', orgId] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast.success('Planta actualizada');
      setEditPlant(null);
      resetForm();
    },
    onError: (error: any) => toast.error(`Error al actualizar: ${error.message}`),
  });

  // Delete plant
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const plant = plants.find(p => p.id === id);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('soft_delete_plant', { plant_id: id, org_id: orgId });
      if (error) throw error;
      await supabase.from('audit_logs').insert({ organization_id: orgId, user_id: user?.id, user_email: user?.email, action: 'SOFT_DELETE', table_name: 'plants', record_id: id, old_data: plant ? { serial_number: plant.serial_number, name: plant.name, state: plant.state } : null });
      if (plant) {
        await supabase.from('activity_logs').insert({
          id: `log-${Date.now()}`,
          type: 'cambio_estado',
          description: `Eliminación de planta ${plant.serial_number}`,
          plant_ids: [id],
          metadata: { serial: plant.serial_number, name: plant.name },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants', orgId] });
      queryClient.invalidateQueries({ queryKey: ['activity_logs', orgId] });
      toast.success('Planta eliminada');
      setDeletePlant(null);
    },
    onError: (error: any) => toast.error(`Error al eliminar: ${error.message}`),
  });

  // Harvest mutation
  const harvestMutation = useMutation({
    mutationFn: async () => {
      if (!harvestPlant) return;
      const genetic = genetics.find(g => g.id === harvestPlant.genetic_id);
      const dateCode = harvestDate.replace(/-/g, '').slice(2);
      const prefix = (genetic?.name || harvestPlant.name).substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      const code = `MV-${prefix}-${dateCode}-${Date.now().toString().slice(-4)}`;

      // Create harvest material
      const { error: matError } = await supabase.from('harvest_materials').insert({
        id: `mat-${Date.now()}`,
        organization_id: orgId,
        code,
        name: `Materia Vegetal ${genetic?.name || harvestPlant.name}`,
        plant_id: harvestPlant.id,
        plant_serial: harvestPlant.serial_number,
        genetic_id: harvestPlant.genetic_id,
        genetic_name: genetic?.name || null,
        weight_grams: parseFloat(harvestWeight),
        installation_id: secadoId,
        warehouse_id: postcosechaWhId,
        harvest_date: new Date(harvestDate).toISOString(),
        notes: harvestNotes.trim() || null,
      });
      if (matError) throw matError;

      // Delete plant via secure function
      const { error: plantError } = await supabase.rpc('soft_delete_plant', { plant_id: harvestPlant.id, org_id: orgId });
      if (plantError) throw plantError;
      const { data: { user: harvestUser } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert({ organization_id: orgId, user_id: harvestUser?.id, user_email: harvestUser?.email, action: 'SOFT_DELETE', table_name: 'plants', record_id: harvestPlant.id, old_data: { serial_number: harvestPlant.serial_number, name: harvestPlant.name, reason: 'cosecha' } });

      // Log activity
      await supabase.from('activity_logs').insert({
        id: `log-${Date.now()}`,
        organization_id: orgId,
        type: 'cosecha',
        description: `Cosecha de ${harvestPlant.serial_number} → ${code} (${harvestWeight}g)`,
        plant_ids: [harvestPlant.id],
        metadata: { code, weight: harvestWeight, genetic: genetic?.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants', orgId] });
      queryClient.invalidateQueries({ queryKey: ['activity_logs', orgId] });
      toast.success(`Cosecha registrada correctamente`);
      setHarvestPlant(null);
      setHarvestWeight('');
      setHarvestNotes('');
      setHarvestDate(new Date().toISOString().slice(0, 10));
    },
    onError: (error: any) => toast.error(`Error al cosechar: ${error.message}`),
  });

  const openEdit = (plant: Plant) => {
    setEditPlant(plant);
    setName(plant.name);
    setChemotypeCode(plant.chemotype_code as ChemotypeCode);
    setGeneticId(plant.genetic_id || '');
    setWarehouseId(plant.warehouse_id);
    setInstallationId(plant.installation_id);
    setNotes(plant.notes || '');
  };

  const formFields = (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Nombre *</Label>
        <Input placeholder="Nombre de la planta" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Quimiotipo *</Label>
        <Select value={chemotypeCode} onValueChange={v => { setChemotypeCode(v as ChemotypeCode); setGeneticId(''); }}>
          <SelectTrigger><SelectValue placeholder="Seleccionar quimiotipo" /></SelectTrigger>
          <SelectContent>
            {Object.values(CHEMOTYPES).map(ct => (
              <SelectItem key={ct.code} value={ct.code}>{ct.name} — {ct.description}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Genética (opcional)</Label>
        <Select value={geneticId} onValueChange={setGeneticId}>
          <SelectTrigger><SelectValue placeholder="Seleccionar genética" /></SelectTrigger>
          <SelectContent>
            {filteredGenetics.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Sala *</Label>
        <Select value={warehouseId} onValueChange={v => { setWarehouseId(v); setInstallationId(''); }}>
          <SelectTrigger><SelectValue placeholder="Seleccionar sala" /></SelectTrigger>
          <SelectContent>
            {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {warehouseId && (
        <div className="space-y-2">
          <Label>Locación *</Label>
          <Select value={installationId} onValueChange={setInstallationId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar locación" /></SelectTrigger>
            <SelectContent>
              {filteredInstallations.map(inst => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name}{inst.state ? ` (${STATE_LABELS[inst.state]})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {selectedInstallation?.state && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <span className="text-muted-foreground">Estado asignado: </span>
          <span className="font-medium">{STATE_LABELS[selectedInstallation.state]}</span>
          <p className="text-xs text-muted-foreground mt-1">La planta hereda el estado de la locación.</p>
        </div>
      )}
      <div className="space-y-2">
        <Label>Notas</Label>
        <Textarea placeholder="Notas opcionales..." value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
    </div>
  );

  return (
    <Layout title="Registro de Plantas" subtitle={`${filteredPlants.length} plantas encontradas`}>
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button className="gap-2" onClick={() => { resetForm(); setNewPlantOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nueva Planta
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Buscar por nombre, serie, lote..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Select value={stateFilter} onValueChange={v => setStateFilter(v as PlantState | 'all')}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="madre">Madre</SelectItem>
              <SelectItem value="esqueje">Esqueje</SelectItem>
              <SelectItem value="vegetativo">Vegetativo</SelectItem>
              <SelectItem value="floracion">Floración</SelectItem>
            </SelectContent>
          </Select>
          <Select value={geneticFilter} onValueChange={setGeneticFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Genética" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las genéticas</SelectItem>
              {genetics.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {(searchQuery || stateFilter !== 'all' || geneticFilter !== 'all') && (
            <Button variant="ghost" onClick={() => { setSearchQuery(''); setStateFilter('all'); setGeneticFilter('all'); }}>
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Nombre</TableHead>
                <TableHead>Nº Serie</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Quimiotipo</TableHead>
                <TableHead>Genética</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Siembra</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay plantas registradas.
                  </TableCell>
                </TableRow>
              )}
              {paginatedPlants.map((plant, index) => {
                const genetic = genetics.find(g => g.id === plant.genetic_id);
                const chemotype = CHEMOTYPES[plant.chemotype_code as ChemotypeCode];
                return (
                  <TableRow key={plant.id} className="animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                    <TableCell className="font-medium">{plant.name}</TableCell>
                    <TableCell>
                      <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{plant.serial_number}</code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{plant.lot_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{chemotype?.name || plant.chemotype_code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{genetic?.name || '-'}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATE_COLORS[plant.state] || 'bg-gray-100 text-gray-800'}`}>
                        {STATE_LABELS[plant.state] || plant.state}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {plant.planting_date
                        ? (() => { try { return format(new Date(plant.planting_date), 'dd MMM yyyy', { locale: es }); } catch { return '-'; } })()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/planta/${plant.id}`}>
                              <Eye className="h-4 w-4 mr-2" />Ver detalle
                            </Link>
                          </DropdownMenuItem>
                          {plant.state === 'floracion' && (
                            <DropdownMenuItem onClick={() => setHarvestPlant(plant)} className="text-yellow-700 focus:text-yellow-700">
                              <Wheat className="h-4 w-4 mr-2" />Cosechar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openEdit(plant)}>
                            <Pencil className="h-4 w-4 mr-2" />Editar planta
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletePlant(plant)}>
                            <Trash2 className="h-4 w-4 mr-2" />Eliminar planta
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredPlants.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Mostrando {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredPlants.length)}–{Math.min(currentPage * PAGE_SIZE, filteredPlants.length)} de {filteredPlants.length} plantas
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                Anterior
              </Button>
              <span className="px-2">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={newPlantOpen} onOpenChange={v => { if (!v) resetForm(); setNewPlantOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Planta</DialogTitle>
            <DialogDescription>Registrá una nueva planta. El estado se hereda de la locación seleccionada.</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPlantOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name.trim() || !chemotypeCode || !warehouseId || !installationId || createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Planta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPlant} onOpenChange={open => { if (!open) { setEditPlant(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Planta</DialogTitle>
            <DialogDescription>Modificá los detalles de la planta.</DialogDescription>
          </DialogHeader>
          {editPlant && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nº Serie</Label>
                <div className="font-mono text-sm bg-muted/50 p-2 rounded">{editPlant.serial_number}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Lote</Label>
                <div className="font-mono text-sm bg-muted/50 p-2 rounded">{editPlant.lot_number}</div>
              </div>
            </div>
          )}
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditPlant(null); resetForm(); }}>Cancelar</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={!name.trim() || !chemotypeCode || !warehouseId || !installationId || updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePlant} onOpenChange={open => !open && setDeletePlant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar planta?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás por eliminar <strong>{deletePlant?.serial_number}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePlant && deleteMutation.mutate(deletePlant.id)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Harvest Dialog */}
      <Dialog open={!!harvestPlant} onOpenChange={open => { if (!open) { setHarvestPlant(null); setHarvestWeight(''); setHarvestNotes(''); setHarvestDate(new Date().toISOString().slice(0, 10)); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wheat className="h-5 w-5 text-yellow-600" />
              Cosechar Planta
            </DialogTitle>
            <DialogDescription>
              La planta <strong>{harvestPlant?.serial_number}</strong> será dada de baja y se creará un lote de materia vegetal en Secado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Fecha de cosecha *</Label>
              <Input type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Peso cosechado (gramos) *</Label>
              <Input
                type="number" min="1" step="0.1"
                placeholder="Ej: 250"
                value={harvestWeight}
                onChange={e => setHarvestWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea placeholder="Observaciones opcionales..." value={harvestNotes} onChange={e => setHarvestNotes(e.target.value)} />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <p className="font-medium text-foreground">Se generará:</p>
              <p className="text-muted-foreground font-mono text-xs">
                MV-{harvestPlant ? (genetics.find(g => g.id === harvestPlant.genetic_id)?.name || harvestPlant.name).substring(0, 3).toUpperCase() : 'XXX'}-{harvestDate.replace(/-/g, '').slice(2)}
              </p>
              <p className="text-muted-foreground text-xs">Ubicación inicial: Secado</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHarvestPlant(null)}>Cancelar</Button>
            <Button
              onClick={() => harvestMutation.mutate()}
              disabled={!harvestWeight || parseFloat(harvestWeight) <= 0 || !harvestDate || harvestMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {harvestMutation.isPending ? 'Cosechando...' : 'Confirmar Cosecha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Layout>
  );
}

import { useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Building2, ChevronDown, ChevronRight, Trash2, Pencil, Eye, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type CultivationType = 'indoor' | 'outdoor' | 'invernadero';
type PlantState = 'madre' | 'esqueje' | 'vegetativo' | 'floracion';

type Warehouse = {
  id: string; name: string; description: string | null; type: CultivationType; created_at: string;
};
type Installation = {
  id: string; warehouse_id: string; name: string; description: string | null; state: PlantState | null; created_at: string;
};
type Plant = {
  id: string; name: string; serial_number: string; genetic_id: string | null; state: string; installation_id: string; warehouse_id: string;
};
type Genetic = { id: string; name: string; };

const cultivationTypeLabels: Record<CultivationType, string> = {
  indoor: 'Indoor', outdoor: 'Outdoor', invernadero: 'Invernadero',
};

const STATE_OPTIONS: { value: PlantState; label: string }[] = [
  { value: 'madre', label: 'Madre' },
  { value: 'esqueje', label: 'Esqueje' },
  { value: 'vegetativo', label: 'Vegetativo' },
  { value: 'floracion', label: 'Floración' },
];

const STATE_CIRCLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  madre:      { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-900', label: 'Madre' },
  esqueje:    { bg: 'bg-blue-100',   border: 'border-blue-400',   text: 'text-blue-900',   label: 'Esqueje' },
  vegetativo: { bg: 'bg-green-100',  border: 'border-green-400',  text: 'text-green-900',  label: 'Vegetativo' },
  floracion:  { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-900', label: 'Floración' },
};

const STATE_DOT: Record<string, string> = {
  madre: 'bg-purple-500', esqueje: 'bg-blue-500', vegetativo: 'bg-green-500', floracion: 'bg-yellow-500',
};

export default function Locations() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const orgId = profile?.organization_id;

  const auditLog = async (action: string, tableName: string, recordId: string, oldData?: any) => {
    await supabase.from('audit_logs').insert({
      organization_id: orgId,
      user_id: profile?.user_id,
      user_email: (await supabase.auth.getUser()).data.user?.email,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData || null,
    });
  };
  const [expandedWarehouses, setExpandedWarehouses] = useState<string[]>([]);
  const [plantSearch, setPlantSearch] = useState('');
  const dragPlantId = useRef<string | null>(null);
  const isDragging = useRef(false);
  const [dragOverInstId, setDragOverInstId] = useState<string | null>(null);

  const [createWhOpen, setCreateWhOpen] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null);
  const [deleteWarehouse, setDeleteWarehouse] = useState<Warehouse | null>(null);
  const [whName, setWhName] = useState('');
  const [whDesc, setWhDesc] = useState('');
  const [whType, setWhType] = useState<CultivationType>('indoor');

  const [createInstOpen, setCreateInstOpen] = useState(false);
  const [editInstallation, setEditInstallation] = useState<Installation | null>(null);
  const [deleteInstallation, setDeleteInstallation] = useState<Installation | null>(null);
  const [instName, setInstName] = useState('');
  const [instWarehouseId, setInstWarehouseId] = useState('');
  const [instState, setInstState] = useState<PlantState | ''>('');

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from('warehouses').select('*').eq('organization_id', orgId).neq('name', 'Post-Cosecha').order('created_at');
      if (error) throw error;
      return data as Warehouse[];
    },
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['installations', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from('installations').select('*').eq('organization_id', orgId).order('created_at');
      if (error) throw error;
      return data as Installation[];
    },
  });

  const { data: plants = [] } = useQuery({
    queryKey: ['plants', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from('plants').select('id, name, serial_number, genetic_id, state, installation_id, warehouse_id').eq('organization_id', orgId);
      if (error) throw error;
      return data as Plant[];
    },
  });

  const { data: genetics = [] } = useQuery({
    queryKey: ['genetics', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from('genetics').select('id, name').eq('organization_id', orgId);
      if (error) throw error;
      return data as Genetic[];
    },
  });

  const movePlantMutation = useMutation({
    mutationFn: async ({ plantId, targetInstId, targetWarehouseId, newState, sourceInstId, plantSerial, sourceInstName, targetInstName, sourceWarehouseName, targetWarehouseName }: {
      plantId: string; targetInstId: string; targetWarehouseId: string; newState: string | null;
      sourceInstId: string; plantSerial: string;
      sourceInstName: string; targetInstName: string;
      sourceWarehouseName: string; targetWarehouseName: string;
    }) => {
      const { error } = await supabase.from('plants').update({
        installation_id: targetInstId,
        warehouse_id: targetWarehouseId,
        state: newState || undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', plantId);
      if (error) throw error;

      // Registrar en bitácora
      await supabase.from('activity_logs').insert({
        id: `log-${Date.now()}`,
        organization_id: orgId,
        type: 'movimiento',
        description: `${plantSerial} movida de ${sourceWarehouseName} → ${sourceInstName} a ${targetWarehouseName} → ${targetInstName}`,
        plant_ids: [plantId],
        source_installation_id: sourceInstId,
        target_installation_id: targetInstId,
        metadata: { plantSerial, from: `${sourceWarehouseName} / ${sourceInstName}`, to: `${targetWarehouseName} / ${targetInstName}`, newState },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants', orgId] });
      queryClient.invalidateQueries({ queryKey: ['activity_logs', orgId] });
      toast.success('Planta movida correctamente');
    },
    onError: (e: any) => toast.error(`Error al mover planta: ${e.message}`),
  });

  const handleDragStart = (e: React.DragEvent, plantId: string) => {
    dragPlantId.current = plantId;
    isDragging.current = true;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, instId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverInstId(instId);
  };

  const handleDragLeave = () => setDragOverInstId(null);

  const handleDrop = (e: React.DragEvent, targetInst: Installation) => {
    e.preventDefault();
    setDragOverInstId(null);
    const plantId = dragPlantId.current;
    if (!plantId) return;
    const plant = plants.find(p => p.id === plantId);
    if (!plant || plant.installation_id === targetInst.id) return;
    const sourceInst = installations.find(i => i.id === plant.installation_id);
    const sourceWarehouse = warehouses.find(w => w.id === plant.warehouse_id);
    const targetWarehouse = warehouses.find(w => w.id === targetInst.warehouse_id);
    movePlantMutation.mutate({
      plantId,
      targetInstId: targetInst.id,
      targetWarehouseId: targetInst.warehouse_id,
      newState: targetInst.state,
      sourceInstId: plant.installation_id,
      plantSerial: plant.serial_number,
      sourceInstName: sourceInst?.name || 'Desconocida',
      targetInstName: targetInst.name,
      sourceWarehouseName: sourceWarehouse?.name || 'Desconocida',
      targetWarehouseName: targetWarehouse?.name || 'Desconocida',
    });
    dragPlantId.current = null;
    isDragging.current = false;
  };

  const createWarehouseMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('warehouses').insert({ id: `wh-${Date.now()}`, organization_id: orgId, name: whName.trim(), description: whDesc.trim() || null, type: whType });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses', orgId] });
      toast.success(`Sala "${whName}" creada`);
      setCreateWhOpen(false); setWhName(''); setWhDesc(''); setWhType('indoor');
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: async () => {
      if (!editWarehouse) return;
      const { error } = await supabase.from('warehouses').update({ name: editWarehouse.name, description: editWarehouse.description, type: editWarehouse.type }).eq('id', editWarehouse.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['warehouses', orgId] }); toast.success('Sala actualizada'); setEditWarehouse(null); },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: string) => {
      const wh = warehouses.find(w => w.id === id);
      const { error } = await supabase.rpc('soft_delete_record', { table_name: 'warehouses', record_id: id, org_id: orgId });
      if (error) throw error;
      if (wh) {
        await supabase.from('activity_logs').insert({
          id: `log-${Date.now()}`,
          organization_id: orgId,
          type: 'cambio_estado',
          description: `Sala "${wh.name}" eliminada`,
          plant_ids: [],
          metadata: { name: wh.name },
        });
        await auditLog('SOFT_DELETE', 'warehouses', id, wh);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses', orgId] });
      queryClient.invalidateQueries({ queryKey: ['installations', orgId] });
      queryClient.invalidateQueries({ queryKey: ['plants', orgId] });
      queryClient.invalidateQueries({ queryKey: ['activity_logs', orgId] });
      toast.success('Sala eliminada'); setDeleteWarehouse(null);
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const createInstallationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('installations').insert({ id: `inst-${Date.now()}`, organization_id: orgId, warehouse_id: instWarehouseId, name: instName.trim(), state: instState || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installations', orgId] });
      toast.success(`Locación "${instName}" creada`);
      setCreateInstOpen(false); setInstName(''); setInstWarehouseId(''); setInstState('');
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const updateInstallationMutation = useMutation({
    mutationFn: async () => {
      if (!editInstallation) return;
      const { error } = await supabase.from('installations').update({ name: editInstallation.name, warehouse_id: editInstallation.warehouse_id, state: editInstallation.state }).eq('id', editInstallation.id);
      if (error) throw error;
      await supabase.from('activity_logs').insert({
        id: `log-${Date.now()}`,
        organization_id: orgId,
        type: 'cambio_estado',
        description: `Locación "${editInstallation.name}" actualizada${editInstallation.state ? ` → estado: ${editInstallation.state}` : ''}`,
        plant_ids: [],
        target_installation_id: editInstallation.id,
        metadata: { name: editInstallation.name, state: editInstallation.state },
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['installations', orgId] }); queryClient.invalidateQueries({ queryKey: ['activity_logs', orgId] }); toast.success('Locación actualizada'); setEditInstallation(null); },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const deleteInstallationMutation = useMutation({
    mutationFn: async (id: string) => {
      const inst = installations.find(i => i.id === id);
      const { error } = await supabase.rpc('soft_delete_record', { table_name: 'installations', record_id: id, org_id: orgId });
      if (error) throw error;
      if (inst) {
        await supabase.from('activity_logs').insert({
          id: `log-${Date.now()}`,
          organization_id: orgId,
          type: 'cambio_estado',
          description: `Locación "${inst.name}" eliminada`,
          plant_ids: [],
          metadata: { name: inst.name },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installations', orgId] });
      queryClient.invalidateQueries({ queryKey: ['plants', orgId] });
      queryClient.invalidateQueries({ queryKey: ['activity_logs', orgId] });
      toast.success('Locación eliminada'); setDeleteInstallation(null);
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const toggleWarehouse = (id: string) => {
    setExpandedWarehouses(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  };

  // Protected installations cannot be deleted
  const isProtectedInstallation = (inst: Installation) => {
    return inst.name === 'Despacho';
  };

  const getInstallationPlants = (instId: string) => {
    const instPlants = plants.filter(p => p.installation_id === instId);
    if (!plantSearch.trim()) return instPlants;
    const q = plantSearch.toLowerCase();
    return instPlants.filter(p =>
      p.serial_number.toLowerCase().includes(q) ||
      (getGeneticName(p.genetic_id)).toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q)
    );
  };

  // Find which warehouses contain matching plants (for auto-expand)
  const matchingInstIds = plantSearch.trim()
    ? installations.filter(inst => getInstallationPlants(inst.id).length > 0).map(i => i.id)
    : [];
  const getGeneticName = (id: string | null) => genetics.find(g => g.id === id)?.name || '';

  return (
    <Layout title="Locaciones" subtitle="Gestión de salas e instalaciones">
      <div className="space-y-6">

        <div className="flex items-center gap-4 flex-wrap">
          {Object.entries(STATE_CIRCLE).map(([state, cfg]) => (
            <div key={state} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={`w-3 h-3 rounded-full ${STATE_DOT[state]}`} />
              {cfg.label}
            </div>
          ))}
          <span className="text-xs text-muted-foreground ml-2">• Arrastrá las plantas entre locaciones</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button className="gap-2" onClick={() => setCreateWhOpen(true)}><Plus className="h-4 w-4" /> Nueva Sala</Button>
            <Button variant="outline" className="gap-2" onClick={() => setCreateInstOpen(true)}><Plus className="h-4 w-4" /> Nueva Locación</Button>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar planta por serie, genética..."
              value={plantSearch}
              onChange={e => {
                setPlantSearch(e.target.value);
                if (e.target.value.trim()) {
                  const warehouseIds = installations
                    .filter(inst => plants.filter(p => p.installation_id === inst.id).some(p =>
                      p.serial_number.toLowerCase().includes(e.target.value.toLowerCase()) ||
                      (genetics.find(g => g.id === p.genetic_id)?.name || '').toLowerCase().includes(e.target.value.toLowerCase()) ||
                      p.name.toLowerCase().includes(e.target.value.toLowerCase())
                    ))
                    .map(i => i.warehouse_id);
                  setExpandedWarehouses(prev => [...new Set([...prev, ...warehouseIds])]);
                }
              }}
              className="w-full h-9 pl-9 pr-8 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {plantSearch && (
              <button onClick={() => setPlantSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {plantSearch && (
          <p className="text-xs text-muted-foreground">
            {plants.filter(p =>
              p.serial_number.toLowerCase().includes(plantSearch.toLowerCase()) ||
              (genetics.find(g => g.id === p.genetic_id)?.name || '').toLowerCase().includes(plantSearch.toLowerCase()) ||
              p.name.toLowerCase().includes(plantSearch.toLowerCase())
            ).length} planta(s) encontrada(s)
          </p>
        )}

        <div className="space-y-4">
          {warehouses.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No hay salas creadas. Creá la primera sala para empezar.</div>
          )}

          {warehouses.map((warehouse, index) => {
            const isExpanded = expandedWarehouses.includes(warehouse.id);
            const whInstallations = installations.filter(i => i.warehouse_id === warehouse.id);
            const totalPlants = whInstallations.reduce((sum, inst) => sum + getInstallationPlants(inst.id).length, 0);

            return (
              <div key={warehouse.id} className="card-elevated animate-slide-up overflow-hidden" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center gap-4 p-5 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleWarehouse(warehouse.id)}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground">{warehouse.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {warehouse.description && `${warehouse.description} • `}{whInstallations.length} locaciones • {totalPlants} plantas
                    </p>
                  </div>
                  <span className="text-sm font-medium px-3 py-1 rounded-full bg-secondary text-secondary-foreground">{cultivationTypeLabels[warehouse.type]}</span>
                  <button onClick={e => { e.stopPropagation(); setEditWarehouse(warehouse); }} className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                  <button onClick={e => { e.stopPropagation(); setDeleteWarehouse(warehouse); }} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-4">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {whInstallations.map(inst => {
                        const instPlants = getInstallationPlants(inst.id);
                        const isDragOver = dragOverInstId === inst.id;

                        return (
                          <div
                            key={inst.id}
                            className={`rounded-xl border-2 bg-card p-4 transition-all min-h-[140px] ${isDragOver ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border'}`}
                            onDragOver={e => handleDragOver(e, inst.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={e => handleDrop(e, inst)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-foreground text-sm">{inst.name}</h4>
                                {inst.state && <div className={`w-2 h-2 rounded-full ${STATE_DOT[inst.state] || 'bg-gray-400'}`} />}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">{instPlants.length}</span>
                                <button onClick={() => setEditInstallation(inst)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                                {!isProtectedInstallation(inst) ? (
                                  <button onClick={() => setDeleteInstallation(inst)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                                ) : (
                                  <div className="p-1 w-5 h-5" title="Locación protegida — no se puede eliminar" />
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {(instPlants.length > 12 ? instPlants.slice(0, 11) : instPlants).map(plant => {
                                const cfg = STATE_CIRCLE[plant.state] || STATE_CIRCLE.vegetativo;
                                const geneticName = getGeneticName(plant.genetic_id);
                                return (
                                  <div
                                    key={plant.id}
                                    draggable
                                    onDragStart={e => handleDragStart(e, plant.id)}
                                    onClick={() => { if (!isDragging.current) navigate(`/planta/${plant.id}`); isDragging.current = false; }}
                                    className={`group relative flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 cursor-grab active:cursor-grabbing transition-all hover:scale-110 hover:shadow-md ${cfg.bg} ${cfg.border} ${plantSearch && (plant.serial_number.toLowerCase().includes(plantSearch.toLowerCase()) || getGeneticName(plant.genetic_id).toLowerCase().includes(plantSearch.toLowerCase()) || plant.name.toLowerCase().includes(plantSearch.toLowerCase())) ? "ring-2 ring-primary ring-offset-1 scale-110" : ""}`}
                                    title={`${plant.serial_number} — ${geneticName}`}
                                  >
                                    <span className={`text-[8px] font-bold leading-tight text-center px-1 ${cfg.text}`}>
                                      {plant.serial_number.split('-').slice(-1)[0]}
                                    </span>
                                    {geneticName && (
                                      <span className={`text-[7px] leading-tight text-center px-1 w-full truncate ${cfg.text} opacity-80`}>
                                        {geneticName.length > 8 ? geneticName.substring(0, 7) + '…' : geneticName}
                                      </span>
                                    )}
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg p-2 text-xs shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">
                                      <p className="font-mono font-bold">{plant.serial_number}</p>
                                      {geneticName && <p className="text-muted-foreground">{geneticName}</p>}
                                      <p className="text-muted-foreground capitalize">{cfg.label}</p>
                                      <p className="text-primary text-[10px] mt-1">Click para ver detalle</p>
                                    </div>
                                  </div>
                                );
                              })}

                              {instPlants.length > 12 && (
                                <div
                                  onClick={() => navigate(`/locaciones/${inst.id}`)}
                                  className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 bg-muted/30 cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all"
                                  title={`Ver las ${instPlants.length - 11} plantas restantes`}
                                >
                                  <span className="text-sm font-bold text-muted-foreground">+{instPlants.length - 11}</span>
                                  <span className="text-[8px] text-muted-foreground">más</span>
                                </div>
                              )}

                              {instPlants.length === 0 && (
                                <div className="w-full h-10 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-muted-foreground/30 rounded-lg">
                                  Soltá plantas aquí
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <div onClick={() => { setInstWarehouseId(warehouse.id); setCreateInstOpen(true); }}
                        className="flex items-center justify-center border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer min-h-[140px]">
                        <div className="text-center">
                          <Plus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm font-medium text-muted-foreground">Agregar locación</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Dialog open={createWhOpen} onOpenChange={setCreateWhOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nueva Sala</DialogTitle><DialogDescription>Creá una nueva sala o almacén.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Nombre *</Label><Input placeholder="Ej: Sala Norte" value={whName} onChange={e => setWhName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Descripción</Label><Input placeholder="Opcional" value={whDesc} onChange={e => setWhDesc(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={whType} onValueChange={v => setWhType(v as CultivationType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indoor">Indoor</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                    <SelectItem value="invernadero">Invernadero</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateWhOpen(false)}>Cancelar</Button>
              <Button onClick={() => createWarehouseMutation.mutate()} disabled={!whName.trim() || createWarehouseMutation.isPending}>{createWarehouseMutation.isPending ? 'Creando...' : 'Crear Sala'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editWarehouse} onOpenChange={open => !open && setEditWarehouse(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Editar Sala</DialogTitle><DialogDescription>Modificá los detalles.</DialogDescription></DialogHeader>
            {editWarehouse && (
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label>Nombre *</Label><Input value={editWarehouse.name} onChange={e => setEditWarehouse({ ...editWarehouse, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Descripción</Label><Input value={editWarehouse.description || ''} onChange={e => setEditWarehouse({ ...editWarehouse, description: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={editWarehouse.type} onValueChange={v => setEditWarehouse({ ...editWarehouse, type: v as CultivationType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">Indoor</SelectItem>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
                      <SelectItem value="invernadero">Invernadero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditWarehouse(null)}>Cancelar</Button>
              <Button onClick={() => updateWarehouseMutation.mutate()} disabled={!editWarehouse?.name.trim() || updateWarehouseMutation.isPending}>{updateWarehouseMutation.isPending ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={createInstOpen} onOpenChange={setCreateInstOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nueva Locación</DialogTitle><DialogDescription>Creá una locación dentro de una sala.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Nombre *</Label><Input placeholder="Ej: Carpa 3" value={instName} onChange={e => setInstName(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Sala *</Label>
                <Select value={instWarehouseId} onValueChange={setInstWarehouseId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar sala" /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado inicial (opcional)</Label>
                <Select value={instState} onValueChange={v => setInstState(v as PlantState)}>
                  <SelectTrigger><SelectValue placeholder="Sin estado" /></SelectTrigger>
                  <SelectContent>{STATE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateInstOpen(false)}>Cancelar</Button>
              <Button onClick={() => createInstallationMutation.mutate()} disabled={!instName.trim() || !instWarehouseId || createInstallationMutation.isPending}>{createInstallationMutation.isPending ? 'Creando...' : 'Crear Locación'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editInstallation} onOpenChange={open => !open && setEditInstallation(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Editar Locación</DialogTitle><DialogDescription>Modificá los detalles.</DialogDescription></DialogHeader>
            {editInstallation && (
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label>Nombre *</Label><Input value={editInstallation.name} onChange={e => setEditInstallation({ ...editInstallation, name: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Sala *</Label>
                  <Select value={editInstallation.warehouse_id} onValueChange={v => setEditInstallation({ ...editInstallation, warehouse_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={editInstallation.state || ''} onValueChange={v => setEditInstallation({ ...editInstallation, state: v as PlantState })}>
                    <SelectTrigger><SelectValue placeholder="Sin estado" /></SelectTrigger>
                    <SelectContent>{STATE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditInstallation(null)}>Cancelar</Button>
              <Button onClick={() => updateInstallationMutation.mutate()} disabled={!editInstallation?.name.trim() || updateInstallationMutation.isPending}>{updateInstallationMutation.isPending ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteWarehouse} onOpenChange={open => !open && setDeleteWarehouse(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Eliminar sala?</AlertDialogTitle><AlertDialogDescription>Se eliminará <strong>{deleteWarehouse?.name}</strong> con todas sus locaciones y plantas.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteWarehouse && deleteWarehouseMutation.mutate(deleteWarehouse.id)}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteInstallation} onOpenChange={open => !open && setDeleteInstallation(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Eliminar locación?</AlertDialogTitle><AlertDialogDescription>Se eliminará <strong>{deleteInstallation?.name}</strong> con todas sus plantas.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteInstallation && deleteInstallationMutation.mutate(deleteInstallation.id)}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </Layout>
  );
}

import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CHEMOTYPES, ChemotypeCode } from '@/types/cultivation';

type Genetic = {
  id: string;
  name: string;
  chemotype_code: string;
  thc_range: string | null;
  cbd_range: string | null;
  description: string | null;
  created_at: string;
};

export default function Genetics() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const orgId = profile?.organization_id;
  const [createOpen, setCreateOpen] = useState(false);
  const [editGenetic, setEditGenetic] = useState<Genetic | null>(null);
  const [deleteGenetic, setDeleteGenetic] = useState<Genetic | null>(null);

  const [name, setName] = useState('');
  const [chemotypeCode, setChemotypeCode] = useState<ChemotypeCode | ''>('');
  const [thcRange, setThcRange] = useState('');
  const [cbdRange, setCbdRange] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setName(''); setChemotypeCode(''); setThcRange(''); setCbdRange(''); setDescription('');
  };

  // Fetch genetics
  const { data: genetics = [] } = useQuery({
    queryKey: ['genetics', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('genetics')
        .select('*')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return data as Genetic[];
    },
    enabled: !!orgId,
  });

  // Fetch plant counts per genetic
  const { data: plantCounts = {} } = useQuery({
    queryKey: ['plant-counts-genetics', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plants')
        .select('genetic_id')
        .eq('organization_id', orgId!);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach(p => {
        if (p.genetic_id) counts[p.genetic_id] = (counts[p.genetic_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!orgId,
  });

  // Create genetic
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('genetics').insert({
        organization_id: orgId,
        id: `gen-${Date.now()}`,
        name: name.trim(),
        chemotype_code: chemotypeCode,
        thc_range: thcRange.trim() || null,
        cbd_range: cbdRange.trim() || null,
        description: description.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genetics', orgId] });
      toast.success(`Genética "${name}" creada`);
      setCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(`Error al crear: ${error.message}`),
  });

  // Update genetic
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editGenetic) return;
      const { error } = await supabase.from('genetics').update({
        name: editGenetic.name,
        chemotype_code: editGenetic.chemotype_code,
        thc_range: editGenetic.thc_range,
        cbd_range: editGenetic.cbd_range,
        description: editGenetic.description,
        updated_at: new Date().toISOString(),
      }).eq('id', editGenetic.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genetics', orgId] });
      toast.success('Genética actualizada');
      setEditGenetic(null);
    },
    onError: (error: any) => toast.error(`Error al actualizar: ${error.message}`),
  });

  // Delete genetic
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('soft_delete_record', { table_name: 'genetics', record_id: id, org_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genetics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['plant-counts-genetics'] });
      toast.success('Genética eliminada');
      setDeleteGenetic(null);
    },
    onError: (error: any) => toast.error(`Error al eliminar: ${error.message}`),
  });

  return (
    <Layout title="Genéticas" subtitle={`${genetics.length} genéticas registradas`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button className="gap-2" onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nueva Genética
          </Button>
        </div>

        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Nombre</TableHead>
                <TableHead>Quimiotipo</TableHead>
                <TableHead>THC</TableHead>
                <TableHead>CBD</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Plantas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {genetics.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay genéticas registradas.
                  </TableCell>
                </TableRow>
              )}
              {genetics.map((g) => {
                const chemotype = CHEMOTYPES[g.chemotype_code as ChemotypeCode];
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell><span className="text-sm text-muted-foreground">{chemotype?.name || g.chemotype_code}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{g.thc_range || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{g.cbd_range || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{g.description || '-'}</TableCell>
                    <TableCell className="text-sm">{plantCounts[g.id] || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditGenetic(g)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteGenetic(g)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) resetForm(); setCreateOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Genética</DialogTitle>
            <DialogDescription>Registrá una nueva variedad genética.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: OG Kush" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Quimiotipo *</Label>
              <Select value={chemotypeCode} onValueChange={v => setChemotypeCode(v as ChemotypeCode)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar quimiotipo" /></SelectTrigger>
                <SelectContent>
                  {Object.values(CHEMOTYPES).map(ct => (
                    <SelectItem key={ct.code} value={ct.code}>{ct.name} — {ct.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rango THC</Label>
                <Input placeholder="Ej: 20-25%" value={thcRange} onChange={e => setThcRange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rango CBD</Label>
                <Input placeholder="Ej: <1%" value={cbdRange} onChange={e => setCbdRange(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea placeholder="Descripción opcional..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name.trim() || !chemotypeCode || createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Genética'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editGenetic} onOpenChange={open => !open && setEditGenetic(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Genética</DialogTitle>
            <DialogDescription>Modificá los detalles de esta variedad genética.</DialogDescription>
          </DialogHeader>
          {editGenetic && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={editGenetic.name} onChange={e => setEditGenetic({ ...editGenetic, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Quimiotipo *</Label>
                <Select value={editGenetic.chemotype_code} onValueChange={v => setEditGenetic({ ...editGenetic, chemotype_code: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(CHEMOTYPES).map(ct => (
                      <SelectItem key={ct.code} value={ct.code}>{ct.name} — {ct.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rango THC</Label>
                  <Input value={editGenetic.thc_range || ''} onChange={e => setEditGenetic({ ...editGenetic, thc_range: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Rango CBD</Label>
                  <Input value={editGenetic.cbd_range || ''} onChange={e => setEditGenetic({ ...editGenetic, cbd_range: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={editGenetic.description || ''} onChange={e => setEditGenetic({ ...editGenetic, description: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGenetic(null)}>Cancelar</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={!editGenetic?.name.trim() || updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGenetic} onOpenChange={open => !open && setDeleteGenetic(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar genética?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás por eliminar <strong>{deleteGenetic?.name}</strong>.
              {deleteGenetic && (plantCounts[deleteGenetic.id] || 0) > 0 && (
                <span className="block mt-2">
                  Tiene {plantCounts[deleteGenetic.id]} planta(s) asociada(s). Las plantas quedarán sin genética asignada.
                </span>
              )}
              {' '}Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteGenetic && deleteMutation.mutate(deleteGenetic.id)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, Trash2, Eye, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Paciente = {
  id: string;
  dni: string;
  nombre_apellido: string;
  localidad: string | null;
  telefono: string | null;
  email: string | null;
  numero_tramite_reprocann: string | null;
  created_at: string;
};

export default function Pacientes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Paciente | null>(null);
  const [detailTarget, setDetailTarget] = useState<Paciente | null>(null);

  const [form, setForm] = useState({
    dni: '',
    nombre_apellido: '',
    localidad: '',
    telefono: '',
    email: '',
    numero_tramite_reprocann: '',
  });

  const { data: pacientes = [], isLoading } = useQuery({
    queryKey: ['pacientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Paciente[];
    },
  });

  const { data: entregasByPaciente = {} } = useQuery({
    queryKey: ['entregas-count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('entregas').select('paciente_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((e) => {
        counts[e.paciente_id] = (counts[e.paciente_id] || 0) + 1;
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pacientes').insert({
        dni: form.dni,
        nombre_apellido: form.nombre_apellido,
        localidad: form.localidad || null,
        telefono: form.telefono || null,
        email: form.email || null,
        numero_tramite_reprocann: form.numero_tramite_reprocann || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      toast.success('Paciente registrado correctamente');
      setDialogOpen(false);
      setForm({ dni: '', nombre_apellido: '', localidad: '', telefono: '', email: '', numero_tramite_reprocann: '' });
    },
    onError: (err: any) => {
      if (err.message?.includes('duplicate')) {
        toast.error('Ya existe un paciente con ese DNI');
      } else {
        toast.error('Error al registrar paciente');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('soft_delete_record', { table_name: 'pacientes', record_id: id, org_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      queryClient.invalidateQueries({ queryKey: ['entregas-count'] });
      toast.success('Paciente eliminado correctamente');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Error al eliminar paciente'),
  });

  const filtered = pacientes.filter(
    (p) =>
      p.nombre_apellido.toLowerCase().includes(search.toLowerCase()) ||
      p.dni.includes(search)
  );

  return (
    <Layout title="Pacientes" subtitle="Registro y gestión de pacientes">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Nuevo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Paciente</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.dni || !form.nombre_apellido) {
                    toast.error('DNI y nombre son obligatorios');
                    return;
                  }
                  createMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>DNI *</Label>
                    <Input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} placeholder="12345678" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre y Apellido *</Label>
                    <Input value={form.nombre_apellido} onChange={(e) => setForm({ ...form, nombre_apellido: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Localidad</Label>
                    <Input value={form.localidad} onChange={(e) => setForm({ ...form, localidad: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nº Trámite REPROCANN</Label>
                    <Input value={form.numero_tramite_reprocann} onChange={(e) => setForm({ ...form, numero_tramite_reprocann: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Registrando...' : 'Registrar Paciente'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DNI</TableHead>
                <TableHead>Nombre y Apellido</TableHead>
                <TableHead>Localidad</TableHead>
                <TableHead>REPROCANN</TableHead>
                <TableHead className="text-center">Entregas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No se encontraron pacientes
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-medium">{p.dni}</TableCell>
                    <TableCell className="font-medium">{p.nombre_apellido}</TableCell>
                    <TableCell className="text-muted-foreground">{p.localidad || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{p.numero_tramite_reprocann || '-'}</TableCell>
                    <TableCell className="text-center">{entregasByPaciente[p.id] || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailTarget(p)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailTarget} onOpenChange={() => setDetailTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del Paciente</DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">DNI:</span> <strong>{detailTarget.dni}</strong></div>
                <div><span className="text-muted-foreground">Nombre:</span> <strong>{detailTarget.nombre_apellido}</strong></div>
                <div><span className="text-muted-foreground">Localidad:</span> {detailTarget.localidad || '-'}</div>
                <div><span className="text-muted-foreground">Teléfono:</span> {detailTarget.telefono || '-'}</div>
                <div><span className="text-muted-foreground">Email:</span> {detailTarget.email || '-'}</div>
                <div><span className="text-muted-foreground">REPROCANN:</span> {detailTarget.numero_tramite_reprocann || '-'}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Registrado:</span> {format(new Date(detailTarget.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a <strong>{deleteTarget?.nombre_apellido}</strong> (DNI: {deleteTarget?.dni}) y todas sus entregas asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Users, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Profile = {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
  role: string;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  cultivo: 'Operador Cultivo',
  entregas: 'Operador Entregas',
  readonly: 'Solo Lectura',
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-red-100 text-red-800',
  admin: 'bg-purple-100 text-purple-800',
  cultivo: 'bg-green-100 text-green-800',
  entregas: 'bg-blue-100 text-blue-800',
  readonly: 'bg-gray-100 text-gray-800',
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['Acceso completo', 'Crear/eliminar usuarios (no admins)'],
  cultivo: ['Dashboard', 'Plantas', 'Genéticas', 'Locaciones', 'Esquejado', 'Materia Vegetal', 'Bitácora', 'Etiquetas', 'Calendario'],
  entregas: ['Dashboard', 'Pacientes', 'Entregas', 'Reportes de Entregas'],
  readonly: ['Dashboard', 'Plantas', 'Genéticas', 'Locaciones', 'Bitácora', 'Reportes'],
};

export default function AdminUsuarios() {
  const { profile: currentProfile, organization } = useAuth();
  const orgId = currentProfile?.organization_id;
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [deleteProfile, setDeleteProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: '' });
  const [editRole, setEditRole] = useState('');

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc('get_org_profiles', { org_id: orgId });
      if (error) throw error;
      return (data || []) as Profile[];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
          organization_id: orgId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al crear usuario');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success(`Usuario ${form.full_name} creado correctamente`);
      setCreateOpen(false);
      setForm({ email: '', full_name: '', password: '', role: 'cultivo' });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editProfile) return;
      const { error } = await supabase.rpc('update_profile_role', {
        profile_id: editProfile.id,
        new_role: editRole,
        org_id: orgId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Rol actualizado');
      setEditProfile(null);
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (profile: Profile) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: profile.user_id,
          organization_id: orgId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al eliminar usuario');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Usuario eliminado');
      setDeleteProfile(null);
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const openEdit = (p: Profile) => { setEditProfile(p); setEditRole(p.role); };

  return (
    <Layout title="Gestión de Usuarios" subtitle={`Organización: ${organization?.name || ''}`}>
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total usuarios</p>
                <p className="text-2xl font-bold">{profiles.length}</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4 col-span-2">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Tu rol</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[currentProfile?.role || '']}`}>
                  {ROLE_LABELS[currentProfile?.role || ''] || currentProfile?.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nuevo Usuario
          </Button>
        </div>

        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : profiles.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay usuarios</TableCell></TableRow>
              ) : profiles.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[p.role] || 'bg-gray-100 text-gray-800'}`}>
                      {ROLE_LABELS[p.role] || p.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(ROLE_PERMISSIONS[p.role] || ['Acceso total']).slice(0, 3).map(perm => (
                        <span key={perm} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{perm}</span>
                      ))}
                      {(ROLE_PERMISSIONS[p.role] || []).length > 3 && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">+{(ROLE_PERMISSIONS[p.role] || []).length - 3} más</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(p.created_at), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.user_id !== currentProfile?.user_id && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteProfile(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                      {p.user_id === currentProfile?.user_id && (
                        <span className="text-xs text-muted-foreground px-2">Vos</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) setForm({ email: '', full_name: '', password: '', role: 'cultivo' }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
            <DialogDescription>Creá un usuario para tu organización.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input placeholder="Juan García" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" placeholder="juan@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contraseña inicial *</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol..." /></SelectTrigger>
                <SelectContent>
                  {[
                    ...(currentProfile?.role === 'superadmin' ? [{ value: 'admin', label: 'Administrador — acceso completo (sin gestión de usuarios)' }] : []),
                    { value: 'cultivo', label: 'Operador Cultivo — plantas y locaciones' },
                    { value: 'entregas', label: 'Operador Entregas — pacientes y entregas' },
                    { value: 'readonly', label: 'Solo Lectura — no puede modificar' },
                  ].map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.role && ROLE_PERMISSIONS[form.role] && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-foreground mb-2">Secciones accesibles:</p>
                <div className="flex flex-wrap gap-1">
                  {ROLE_PERMISSIONS[form.role].map(p => (
                    <span key={p} className="text-xs bg-background border border-border px-2 py-0.5 rounded">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.email || !form.full_name || !form.password || form.password.length < 6 || !form.role || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editProfile} onOpenChange={open => !open && setEditProfile(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar Rol</DialogTitle>
            <DialogDescription>{editProfile?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[
                  ...(currentProfile?.role === 'superadmin' ? [{ value: 'admin', label: 'Administrador' }] : []),
                  { value: 'cultivo', label: 'Operador Cultivo' },
                  { value: 'entregas', label: 'Operador Entregas' },
                  { value: 'readonly', label: 'Solo Lectura' },
                ].map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editRole && ROLE_PERMISSIONS[editRole] && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium mb-2">Secciones accesibles:</p>
                <div className="flex flex-wrap gap-1">
                  {ROLE_PERMISSIONS[editRole].map(p => (
                    <span key={p} className="text-xs bg-background border border-border px-2 py-0.5 rounded">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfile(null)}>Cancelar</Button>
            <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
              {editMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteProfile} onOpenChange={open => !open && setDeleteProfile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteProfile?.full_name}</strong> y perderá acceso al sistema. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteProfile && deleteMutation.mutate(deleteProfile)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

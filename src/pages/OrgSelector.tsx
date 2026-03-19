import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Leaf, LogOut, Users, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';

type OrgWithStats = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  userCount?: number;
};

export default function OrgSelector() {
  const { profile, allOrganizations, selectOrganization, signOut, reloadOrganizations } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [localOrgs, setLocalOrgs] = useState<typeof allOrganizations | null>(null);
  const [selectingOrgId, setSelectingOrgId] = useState<string | null>(null);

  // Delete org state
  const [deleteOrg, setDeleteOrg] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteConfirmCheck, setDeleteConfirmCheck] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    org_name: '',
    org_slug: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });

  // Usar orgs locales si las tenemos (post-creación), sino las del context
  const orgs = localOrgs ?? allOrganizations;

  const resetForm = () => setForm({
    org_name: '', org_slug: '', admin_name: '', admin_email: '', admin_password: '',
  });

  const handleOrgNameChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      org_name: value,
      org_slug: value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }));
  };

  const handleCreate = async () => {
    if (!form.org_name || !form.org_slug || !form.admin_name || !form.admin_email || !form.admin_password) {
      toast.error('Completá todos los campos');
      return;
    }
    if (form.admin_password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-organization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al crear organizacion');

      toast.success('Organizacion "' + form.org_name + '" creada correctamente');
      setCreateOpen(false);
      resetForm();

      // Recargar lista de orgs en el context y entrar a la nueva org
      await reloadOrganizations();
      await selectOrganization(data.org_id);
      queryClient.clear();
      navigate('/');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteOrg) return;
    if (deleteConfirmName !== deleteOrg.name) {
      toast.error('El nombre no coincide');
      return;
    }
    if (!deleteConfirmCheck) {
      toast.error('Debés confirmar que entendés las consecuencias');
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteOrg.id);
      if (error) throw error;

      toast.success(`Organización "${deleteOrg.name}" eliminada`);
      setDeleteOrg(null);
      setDeleteConfirmName('');
      setDeleteConfirmCheck(false);
      await reloadOrganizations();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const { data: profileCounts = [] } = useQuery({
    queryKey: ['org-user-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('organization_id');
      return data || [];
    },
  });

  const getUserCount = (orgId: string) =>
    profileCounts.filter(p => p.organization_id === orgId).length;

  const handleSelect = async (orgId: string) => {
    setSelectingOrgId(orgId);
    await selectOrganization(orgId);
    queryClient.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Registro de Cultivo</h1>
            <p className="text-xs text-muted-foreground">Panel Superadmin - {profile?.full_name}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Cerrar sesion
        </Button>
      </div>

      <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Seleccionar Organizacion</h2>
              <p className="text-muted-foreground mt-1">Elegi la organizacion a la que queres acceder y administrar.</p>
            </div>
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva Organizacion
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org, index) => (
            <button
              key={org.id}
              onClick={() => handleSelect(org.id)}
              disabled={!!selectingOrgId}
              className="card-elevated p-6 text-left hover:border-primary hover:shadow-lg transition-all animate-slide-up group disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${selectingOrgId === org.id ? 'bg-primary/30 animate-pulse' : 'bg-primary/10 group-hover:bg-primary/20'}`}>
                  {selectingOrgId === org.id
                    ? <Leaf className="h-6 w-6 text-primary animate-pulse" />
                    : <Building2 className="h-6 w-6 text-primary" />
                  }
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {org.slug}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteOrg({ id: org.id, name: org.name }); setDeleteConfirmName(''); setDeleteConfirmCheck(false); }}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar organización"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-1">{org.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {selectingOrgId === org.id ? (
                  <span className="text-primary font-medium animate-pulse">Ingresando...</span>
                ) : (
                  <>
                    <Users className="h-3.5 w-3.5" />
                    <span>{getUserCount(org.id)} usuario{getUserCount(org.id) !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            </button>
          ))}

          {orgs.length === 0 && (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              No hay organizaciones creadas aun.
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Organizacion</DialogTitle>
            <DialogDescription>
              Se creara la organizacion con su estructura base de salas y locaciones, y un usuario administrador inicial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-3 border-b border-border pb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Organizacion</p>
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  placeholder="Ej: Club Cannabis Buenos Aires"
                  value={form.org_name}
                  onChange={e => handleOrgNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (identificador unico) *</Label>
                <Input
                  placeholder="club-cannabis-ba"
                  value={form.org_slug}
                  onChange={e => setForm({ ...form, org_slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                />
                <p className="text-xs text-muted-foreground">Solo letras minusculas, numeros y guiones</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Usuario Administrador</p>
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <Input
                  placeholder="Juan Garcia"
                  value={form.admin_name}
                  onChange={e => setForm({ ...form, admin_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="admin@organizacion.com"
                  value={form.admin_email}
                  onChange={e => setForm({ ...form, admin_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contrasena inicial *</Label>
                <Input
                  type="password"
                  placeholder="Minimo 6 caracteres"
                  value={form.admin_password}
                  onChange={e => setForm({ ...form, admin_password: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Se creara automaticamente:</p>
              <p>Sala Principal: Madre, Vegetativo, Floracion, Despacho</p>
              <p>Post-Cosecha: Secado, Curado, Despacho</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !form.org_name || !form.org_slug || !form.admin_name || !form.admin_email || !form.admin_password}
            >
              {creating ? 'Creando...' : 'Crear Organizacion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog Eliminar Organización */}
      <Dialog open={!!deleteOrg} onOpenChange={open => { if (!open) { setDeleteOrg(null); setDeleteConfirmName(''); setDeleteConfirmCheck(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Eliminar Organización
            </DialogTitle>
            <DialogDescription>
              Esta acción ocultará la organización del sistema. Los datos quedarán en la base de datos pero no serán accesibles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 space-y-2">
              <p className="text-sm font-semibold text-destructive">⚠️ Se perderá acceso a:</p>
              <ul className="text-xs text-destructive/80 space-y-1 ml-2">
                <li>• Todos los usuarios de la organización</li>
                <li>• Todas las plantas, genéticas y locaciones</li>
                <li>• Todo el historial de cosechas y entregas</li>
                <li>• Todos los pacientes registrados</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Escribí el nombre de la organización para confirmar:</Label>
              <p className="text-xs font-mono font-bold text-foreground">{deleteOrg?.name}</p>
              <Input
                placeholder="Escribí el nombre exacto..."
                value={deleteConfirmName}
                onChange={e => setDeleteConfirmName(e.target.value)}
                className={deleteConfirmName && deleteConfirmName !== deleteOrg?.name ? 'border-destructive' : ''}
              />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="confirm-delete"
                checked={deleteConfirmCheck}
                onCheckedChange={v => setDeleteConfirmCheck(v as boolean)}
              />
              <label htmlFor="confirm-delete" className="text-sm text-muted-foreground cursor-pointer leading-snug">
                Entiendo que esta acción ocultará la organización y que los datos no serán accesibles para sus usuarios.
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOrg(null); setDeleteConfirmName(''); setDeleteConfirmCheck(false); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || deleteConfirmName !== deleteOrg?.name || !deleteConfirmCheck}
            >
              {deleting ? 'Eliminando...' : 'Eliminar Organización'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

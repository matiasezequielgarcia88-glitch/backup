import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, CalendarIcon, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { useTasks, Task, TaskInsert } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { format, isSameDay, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRIORITY_COLORS: Record<string, string> = {
  baja: 'bg-muted text-muted-foreground',
  media: 'bg-accent/20 text-accent-foreground',
  alta: 'bg-destructive/20 text-destructive',
};

const PRIORITY_LABELS: Record<string, string> = {
  baja: 'Baja', media: 'Media', alta: 'Alta',
};

export default function CalendarPage() {
  const { tasks, isLoading, addTask, updateTask, deleteTask, urgentTasks } = useTasks();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['installations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installations')
        .select('id, warehouse_id, name')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Task | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [priority, setPriority] = useState<'baja' | 'media' | 'alta'>('media');
  const [warehouseId, setWarehouseId] = useState('');
  const [installationId, setInstallationId] = useState('');
  const [dueDateOpen, setDueDateOpen] = useState(false);

  useEffect(() => {
    if (urgentTasks.length > 0) {
      toast.warning(`Tenés ${urgentTasks.length} tarea(s) próxima(s) o vencida(s)`, { duration: 5000 });
    }
  }, [urgentTasks.length]);

  const resetForm = () => {
    setTitle(''); setDescription(''); setDueDate(new Date());
    setPriority('media'); setWarehouseId(''); setInstallationId('');
  };

  const handleCreate = () => {
    if (!title) { toast.error('Ingresá un título'); return; }
    const newTask: TaskInsert = {
      title,
      description: description || null,
      due_date: format(dueDate, 'yyyy-MM-dd'),
      priority,
      warehouse_id: warehouseId || null,
      installation_id: installationId || null,
    };
    addTask.mutate(newTask, {
      onSuccess: () => { toast.success('Tarea creada'); setCreateOpen(false); resetForm(); },
      onError: () => toast.error('Error al crear tarea'),
    });
  };

  const handleStatusChange = (task: Task, status: string) => {
    updateTask.mutate({ id: task.id, status: status as Task['status'] }, {
      onSuccess: () => toast.success('Estado actualizado'),
    });
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteTask.mutate(toDelete.id, {
      onSuccess: () => { toast.success('Tarea eliminada'); setToDelete(null); },
    });
  };

  const tasksForDate = tasks.filter(t => isSameDay(parseISO(t.due_date), selectedDate));

  const taskDates = tasks.reduce((acc, t) => {
    if (!acc[t.due_date]) acc[t.due_date] = [];
    acc[t.due_date].push(t);
    return acc;
  }, {} as Record<string, Task[]>);

  const filteredInstallations = warehouseId
    ? installations.filter(i => i.warehouse_id === warehouseId)
    : installations;

  const getLocationLabel = (task: Task) => {
    const wh = warehouses.find(w => w.id === task.warehouse_id);
    const inst = installations.find(i => i.id === task.installation_id);
    if (wh && inst) return `${wh.name} → ${inst.name}`;
    if (wh) return wh.name;
    if (inst) return inst.name;
    return null;
  };

  const getDateIndicator = (task: Task) => {
    const d = parseISO(task.due_date);
    if (task.status === 'completada' || task.status === 'cancelada') return null;
    if (isPast(d) && !isToday(d)) return { icon: AlertTriangle, color: 'text-destructive', label: 'Vencida' };
    if (isToday(d)) return { icon: Clock, color: 'text-accent', label: 'Hoy' };
    if (isTomorrow(d)) return { icon: Clock, color: 'text-accent', label: 'Mañana' };
    return null;
  };

  return (
    <Layout title="Calendario" subtitle={`${tasks.length} tareas registradas`}>
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Calendar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card-elevated p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              locale={es}
              className="pointer-events-auto"
              modifiers={{
                hasTask: Object.keys(taskDates).map(d => parseISO(d)),
                urgent: urgentTasks.map(t => parseISO(t.due_date)),
              }}
              modifiersClassNames={{
                hasTask: 'bg-primary/15 font-bold text-primary',
                urgent: 'bg-destructive/20 text-destructive font-bold',
              }}
            />
          </div>

          <div className="card-elevated p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Leyenda</p>
            <div className="flex items-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-sm bg-primary/15" />
              <span className="text-muted-foreground">Día con tareas</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-sm bg-destructive/20" />
              <span className="text-muted-foreground">Tarea próxima / vencida</span>
            </div>
          </div>

          <Button className="w-full gap-2" onClick={() => { setDueDate(selectedDate); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nueva Tarea
          </Button>
        </div>

        {/* Tasks for selected date */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </h3>
            <span className="text-sm text-muted-foreground">
              {tasksForDate.length} tarea{tasksForDate.length !== 1 && 's'}
            </span>
          </div>

          {tasksForDate.length === 0 ? (
            <div className="card-elevated p-12 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Sin tareas para este día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasksForDate.map((task) => {
                const indicator = getDateIndicator(task);
                const location = getLocationLabel(task);
                const isDone = task.status === 'completada' || task.status === 'cancelada';
                return (
                  <div key={task.id} className={cn('card-elevated p-4 transition-all', isDone && 'opacity-60')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('font-semibold', isDone && 'line-through')}>{task.title}</span>
                          <Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[task.priority])}>
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                          {indicator && (
                            <span className={cn('flex items-center gap-1 text-xs font-medium', indicator.color)}>
                              <indicator.icon className="h-3 w-3" />
                              {indicator.label}
                            </span>
                          )}
                        </div>
                        {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                        {location && <p className="text-xs text-muted-foreground">📍 {location}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Select value={task.status} onValueChange={(v) => handleStatusChange(task, v)}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="en_progreso">En progreso</SelectItem>
                            <SelectItem value="completada">Completada</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setToDelete(task)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {urgentTasks.length > 0 && (
            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Tareas próximas o vencidas
              </h3>
              {urgentTasks.map((task) => {
                const location = getLocationLabel(task);
                return (
                  <div key={task.id} className="card-elevated p-3 border-destructive/30 border-l-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">{task.title}</span>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(task.due_date), 'dd/MM/yyyy')}
                          {location && ` • ${location}`}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[task.priority])}>
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Tarea</DialogTitle>
            <DialogDescription>Creá una tarea asociada a una sala o locación.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input placeholder="Ej: Riego y fertilización" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea placeholder="Detalles opcionales..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(d) => { if (d) { setDueDate(d); setDueDateOpen(false); } }}
                    locale={es}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={v => setPriority(v as 'baja' | 'media' | 'alta')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sala</Label>
                <Select value={warehouseId} onValueChange={v => { setWarehouseId(v); setInstallationId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">Sin sala</SelectItem>
                    {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Locación</Label>
                <Select value={installationId} onValueChange={setInstallationId}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">Sin locación</SelectItem>
                    {filteredInstallations.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={addTask.isPending}>
              {addTask.isPending ? 'Creando...' : 'Crear Tarea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={open => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{toDelete?.title}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

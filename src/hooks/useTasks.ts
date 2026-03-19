import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Task = Tables<'tasks'>;
export type TaskInsert = TablesInsert<'tasks'>;
export type TaskUpdate = TablesUpdate<'tasks'>;

export function useTasks() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
  });

  const addTask = useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase.from('tasks').insert({ ...task, organization_id: orgId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // Tasks due today or tomorrow (within 1 day)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const urgentTasks = tasks.filter(t => {
    if (t.status === 'completada' || t.status === 'cancelada') return false;
    return t.due_date <= tomorrowStr;
  });

  const overdueTasks = tasks.filter(t => {
    if (t.status === 'completada' || t.status === 'cancelada') return false;
    return t.due_date < todayStr;
  });

  return {
    tasks,
    isLoading,
    addTask,
    updateTask,
    deleteTask,
    urgentTasks,
    overdueTasks,
  };
}

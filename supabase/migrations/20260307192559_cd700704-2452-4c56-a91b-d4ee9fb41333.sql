
-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('pendiente', 'en_progreso', 'completada', 'cancelada');

-- Create task priority enum
CREATE TYPE public.task_priority AS ENUM ('baja', 'media', 'alta');

-- Tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status public.task_status NOT NULL DEFAULT 'pendiente',
  priority public.task_priority NOT NULL DEFAULT 'media',
  warehouse_id TEXT,
  installation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for querying by date range
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_status ON public.tasks(status);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies (permissive for now, no auth)
CREATE POLICY "Anon can view tasks" ON public.tasks FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert tasks" ON public.tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update tasks" ON public.tasks FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete tasks" ON public.tasks FOR DELETE TO anon USING (true);
CREATE POLICY "Authenticated users can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (true);

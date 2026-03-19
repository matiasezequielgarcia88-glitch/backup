-- Create enum for cultivation types
CREATE TYPE public.cultivation_type AS ENUM ('indoor', 'outdoor', 'invernadero');

-- Enum for plant states, if it doesn't exist yet (from types/cultivation.ts)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plant_state') THEN
        CREATE TYPE public.plant_state AS ENUM ('madre', 'esqueje', 'vegetativo', 'floracion');
    END IF;
END$$;

-- Create warehouses table (Salas)
CREATE TABLE public.warehouses (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type public.cultivation_type NOT NULL DEFAULT 'indoor',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage warehouses
CREATE POLICY "Authenticated users can view warehouses" ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert warehouses" ON public.warehouses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update warehouses" ON public.warehouses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete warehouses" ON public.warehouses FOR DELETE TO authenticated USING (true);

-- Also allow anon for now (no auth setup yet)
CREATE POLICY "Anon can view warehouses" ON public.warehouses FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert warehouses" ON public.warehouses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update warehouses" ON public.warehouses FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete warehouses" ON public.warehouses FOR DELETE TO anon USING (true);


-- Create installations table (Locaciones)
CREATE TABLE public.installations (
  id TEXT NOT NULL PRIMARY KEY,
  warehouse_id TEXT NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  state public.plant_state,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for querying by warehouse
CREATE INDEX idx_installations_warehouse_id ON public.installations(warehouse_id);

-- Enable RLS
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage installations
CREATE POLICY "Authenticated users can view installations" ON public.installations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert installations" ON public.installations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update installations" ON public.installations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete installations" ON public.installations FOR DELETE TO authenticated USING (true);

-- Also allow anon
CREATE POLICY "Anon can view installations" ON public.installations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert installations" ON public.installations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update installations" ON public.installations FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete installations" ON public.installations FOR DELETE TO anon USING (true);


-- Create enum for delivery types
CREATE TYPE public.tipo_entrega AS ENUM ('materia_vegetal', 'plantas');

-- Create pacientes table
CREATE TABLE public.pacientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dni TEXT NOT NULL UNIQUE,
  nombre_apellido TEXT NOT NULL,
  localidad TEXT,
  telefono TEXT,
  email TEXT,
  numero_tramite_reprocann TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast DNI lookups
CREATE INDEX idx_pacientes_dni ON public.pacientes (dni);

-- Enable RLS
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage pacientes (internal app)
CREATE POLICY "Authenticated users can view pacientes" ON public.pacientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pacientes" ON public.pacientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pacientes" ON public.pacientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete pacientes" ON public.pacientes FOR DELETE TO authenticated USING (true);

-- Also allow anon for now (no auth setup yet)
CREATE POLICY "Anon can view pacientes" ON public.pacientes FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert pacientes" ON public.pacientes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update pacientes" ON public.pacientes FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete pacientes" ON public.pacientes FOR DELETE TO anon USING (true);

-- Create entregas table
CREATE TABLE public.entregas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  tipo_entrega public.tipo_entrega NOT NULL,
  cantidad NUMERIC NOT NULL CHECK (cantidad > 0),
  unidad TEXT NOT NULL DEFAULT 'gramos',
  fecha_entrega DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for reporting queries
CREATE INDEX idx_entregas_paciente_id ON public.entregas (paciente_id);
CREATE INDEX idx_entregas_fecha ON public.entregas (fecha_entrega);
CREATE INDEX idx_entregas_tipo ON public.entregas (tipo_entrega);

-- Enable RLS
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage entregas
CREATE POLICY "Authenticated users can view entregas" ON public.entregas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert entregas" ON public.entregas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update entregas" ON public.entregas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete entregas" ON public.entregas FOR DELETE TO authenticated USING (true);

-- Also allow anon
CREATE POLICY "Anon can view entregas" ON public.entregas FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert entregas" ON public.entregas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update entregas" ON public.entregas FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete entregas" ON public.entregas FOR DELETE TO anon USING (true);

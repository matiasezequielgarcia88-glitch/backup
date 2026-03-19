-- SQL SIMPLIFICADO Y DIRECTO
-- Este script asegura que la tabla y TODAS sus columnas existan antes de aplicar restricciones.

-- 1. Asegurar que la tabla exista
CREATE TABLE IF NOT EXISTS public.plants (id TEXT PRIMARY KEY);

-- 2. Asegurar que CADA columna exista (sin importar si ya existía la tabla)
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS lot_number TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS genetic_id TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS chemotype_code TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS planting_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS predecessor_id TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS installation_id TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS warehouse_id TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 3. Limpiar y Recrear Restricciones (CASCADE)
-- Eliminamos posibles nombres viejos y nuevos de restricciones para evitar conflictos
ALTER TABLE public.plants DROP CONSTRAINT IF EXISTS plants_installationId_fkey;
ALTER TABLE public.plants DROP CONSTRAINT IF EXISTS plants_warehouseId_fkey;
ALTER TABLE public.plants DROP CONSTRAINT IF EXISTS plants_installation_id_fkey;
ALTER TABLE public.plants DROP CONSTRAINT IF EXISTS plants_warehouse_id_fkey;

-- Aplicar Claves Foráneas con Borrado en Cascada
ALTER TABLE public.plants
ADD CONSTRAINT plants_installation_id_fkey 
FOREIGN KEY (installation_id) REFERENCES public.installations(id) ON DELETE CASCADE;

ALTER TABLE public.plants
ADD CONSTRAINT plants_warehouse_id_fkey 
FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;

-- 4. Habilitar Permisos (RLS)
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.plants;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.plants;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.plants;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.plants;

CREATE POLICY "Enable read access for all users" ON public.plants FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.plants FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.plants FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.plants FOR DELETE USING (true);

-- 5. Recargar Esquema
NOTIFY pgrst, 'reload schema';

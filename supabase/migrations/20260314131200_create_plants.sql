-- Create plants table
CREATE TABLE IF NOT EXISTS public.plants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "serialNumber" TEXT UNIQUE NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "geneticId" TEXT,
    "chemotypeCode" TEXT NOT NULL,
    state TEXT NOT NULL,
    "plantingDate" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "predecessorId" TEXT,
    "installationId" TEXT REFERENCES public.installations(id) ON DELETE RESTRICT,
    "warehouseId" TEXT REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for now (update later according to auth requirements)
CREATE POLICY "Enable read access for all users" ON public.plants FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.plants FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.plants FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.plants FOR DELETE USING (true);

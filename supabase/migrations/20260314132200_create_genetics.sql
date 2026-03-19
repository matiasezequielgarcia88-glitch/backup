-- Create genetics table
CREATE TABLE IF NOT EXISTS public.genetics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "chemotypeCode" TEXT NOT NULL,
    "thcRange" TEXT,
    "cbdRange" TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: In a real-world scenario we'd do an ALTER TABLE public.plants DROP CONSTRAINT plants_geneticId_fkey 
-- and then re-add it with ON DELETE SET NULL. Since this is an initial migration sequence in a mock environment,
-- any constraints would be adjusted here or in a subsequent script. For the purpose of this script we create the 
-- genetics table and basic policies.

-- Enable RLS
ALTER TABLE public.genetics ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for now (update later according to auth requirements)
CREATE POLICY "Enable read access for all users" ON public.genetics FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.genetics FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.genetics FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.genetics FOR DELETE USING (true);

-- Add foreign key constraint to plants table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'plants'
    ) THEN
        -- Add the foreign key constraint modifying the behavior ON DELETE SET NULL
        -- This requires that the column geneticId in plants is properly defined or we simply execute the constraint addition
        -- assuming it exists but without constraint.
        ALTER TABLE public.plants 
        DROP CONSTRAINT IF EXISTS plants_geneticId_fkey;
        
        ALTER TABLE public.plants 
        ADD CONSTRAINT plants_geneticId_fkey 
        FOREIGN KEY ("geneticId") 
        REFERENCES public.genetics(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

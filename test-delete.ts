import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yjfyqwejiqtkxobejmbc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZnlxd2VqaXF0a3hvYmVqbWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTMyMDcsImV4cCI6MjA4ODI2OTIwN30.VgPBN6wq-OHLKiPDZuf3PLplSvvCB3hz5SZOjPiSr6U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
  console.log('Fetching a plant...');
  const { data: plants, error: fetchError } = await supabase.from('plants').select('*').limit(1);
  
  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }
  
  if (!plants || plants.length === 0) {
    console.log('No plants found in DB.');
    return;
  }
  
  const plant = plants[0];
  console.log('Attempting to delete plant:', plant.id, 'serial:', plant.serial_number);
  
  const { data, error } = await supabase.from('plants').delete().eq('id', plant.id).select();
  
  if (error) {
    console.error('Delete failed with error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Delete succeeded:', data);
  }
}

testDelete();

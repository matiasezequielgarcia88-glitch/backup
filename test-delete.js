const url = 'https://yjfyqwejiqtkxobejmbc.supabase.co/rest/v1/plants?select=id&limit=1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZnlxd2VqaXF0a3hvYmVqbWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTMyMDcsImV4cCI6MjA4ODI2OTIwN30.VgPBN6wq-OHLKiPDZuf3PLplSvvCB3hz5SZOjPiSr6U';

async function test() {
  try {
    const res = await fetch(url, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const plants = await res.json();
    if (!plants || plants.length === 0) {
      console.log("No plants to delete.");
      return;
    }
    const id = plants[0].id;
    console.log("Attempting to delete plant:", id);

    const delRes = await fetch(`https://yjfyqwejiqtkxobejmbc.supabase.co/rest/v1/plants?id=eq.${id}`, {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });

    if (!delRes.ok) {
      const error = await delRes.text();
      console.error("Delete failed with error:", error);
    } else {
      console.log("Delete succeeded for plant:", id);
    }
  } catch (err) {
    console.error("Script error:", err);
  }
}

test();

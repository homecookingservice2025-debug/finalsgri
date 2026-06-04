import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://yawpvchmwmngjxnulzgn.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "sb_publishable_8X9umrX5qfZ6ENFxNUIrpA_I64RsW8O";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing insert with key:', supabaseKey.substring(0, 10) + '...');
  
  const testRecord = {
    id: 9999, // Large ID unlikely to conflict
    name: 'Test Patient',
    phone: '1234567890',
    type: 'Patient'
  };

  const { data, error } = await supabase
    .from('hospital_entries')
    .insert([testRecord])
    .select();

  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert success:', data);
    // Cleanup
    await supabase.from('hospital_entries').delete().eq('id', 9999);
  }
}

run();

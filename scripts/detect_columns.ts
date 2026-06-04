import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://yawpvchmwmngjxnulzgn.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_8X9umrX5qfZ6ENFxNUIrpA_I64RsW8O";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'hospital_entries' });
  // If rpc fails, try another way
  if (error) {
    const { data: cols, error: err2 } = await supabase
      .from('hospital_entries')
      .select('*')
      .limit(0);
    
    // We can't see columns from data if it's empty, but maybe we can trigger a column hint error
    const { error: err3 } = await supabase
      .from('hospital_entries')
      .insert([{ nonexistent_column_trigger: 'test' }]);
    
    console.log('Error hint:', err3?.message);
  } else {
    console.log('Table Info:', data);
  }
}

run();

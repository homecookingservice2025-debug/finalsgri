import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("Supabase not configured in env");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: logs, error: logsErr } = await supabase.from('message_logs').select('*').limit(5);
  console.log("LOGS:");
  console.log(JSON.stringify(logs, null, 2));

  const { data: hospital, error: hospErr } = await supabase.from('hospital_entries').select('*').limit(5);
  console.log("HOSPITAL ENTRIES:");
  console.log(JSON.stringify(hospital, null, 2));

  const { data: dairy, error: dairyErr } = await supabase.from('dairy_entries').select('*').limit(5);
  console.log("DAIRY ENTRIES:");
  console.log(JSON.stringify(dairy, null, 2));

  const { data: settings, error: settingsErr } = await supabase.from('settings').select('*');
  console.log("SETTINGS:");
  console.log(JSON.stringify(settings, null, 2), settingsErr);
}

run();

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://yawpvchmwmngjxnulzgn.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'block_master', 'dairy_entries', 'district_master', 'hospital_entries', 
  'media', 'message_logs', 'post_master', 'settings', 
  'staff_accounts', 'state_master', 'templates', 'village_master',
  'whatsapp_accounts', 'whatsapp_campaigns', 'whatsapp_messages', 'whatsapp_docs_invoices'
];

async function run() {
  console.log("Checking all 16 tables...");
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      if (error) {
        console.log(`❌ Table "${table}": Error code: ${error.code} | Message: ${error.message}`);
      } else {
        console.log(`✅ Table "${table}": Successful fetch, count: ${data?.length}`);
      }
    } catch (err: any) {
      console.log(`💥 Table "${table}": Exception: ${err.message}`);
    }
  }
}

run();

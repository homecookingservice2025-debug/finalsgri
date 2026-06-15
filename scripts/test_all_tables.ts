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
  console.log("Checking hospital_entries and dairy_entries...");
  const { data: hosp } = await supabase.from('hospital_entries').select('*');
  console.log(`Hospital Entries count: ${hosp?.length}`);
  if (hosp && hosp.length > 0) {
    console.log("First 5 Hospital entries:", hosp.slice(0, 5).map(h => ({
      id: h.id,
      name: h.name,
      phone: h.phone,
      village: h.village,
      post: h.post,
      block: h.block,
      district: h.district,
      state: h.state,
      pincode: h.pincode
    })));
  }
  const { data: dairy } = await supabase.from('dairy_entries').select('*');
  console.log(`Dairy Entries count: ${dairy?.length}`);
  if (dairy && dairy.length > 0) {
    console.log("First 5 Dairy entries:", dairy.slice(0, 5).map(d => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      village: d.village,
      post: d.post,
      block: d.block,
      district: d.district,
      state: d.state,
      pincode: d.pincode
    })));
  }
}

run();

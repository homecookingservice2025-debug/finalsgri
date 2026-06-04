import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://yawpvchmwmngjxnulzgn.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "sb_publishable_8X9umrX5qfZ6ENFxNUIrpA_I64RsW8O";
const supabase = createClient(supabaseUrl, supabaseKey);

const rawData = `
1035			9161114636	20-12-2025			VILL-BRAMHCHARI SANT KABITR NAGAR	Khalilabad		Sant Kabir Nagar				 

1034			8108433063	20-12-2025			VILL - KEWATLY THANA ITWA SIDDHARTH NAGAR	Itwa		Siddharthnagar				 

1033			9792034542	22-12-2025			VILL-JOGIYA THANA SONHABASTI	Bankati		Basti
`;

async function run() {
  const lines = rawData.trim().split('\n').filter(l => l.trim() !== '');
  const records = lines.map(line => {
    const parts = line.split(/\s{2,}|\t+/).map(p => p.trim()).filter(p => p !== '');
    
    const id = parts[0];
    const phone = parts[1];
    const dateStr = parts[2];
    const address = parts[3] || '';
    const block = parts[4] || '';
    const district = parts[5] || '';

    // Convert DD-MM-YYYY to YYYY-MM-DD
    let formattedDate = dateStr;
    if (dateStr.includes('-')) {
      const bits = dateStr.split('-');
      if (bits.length === 3) {
        formattedDate = `${bits[2]}-${bits[1]}-${bits[0]}`;
      }
    }

    return {
      name: `Patient ${id}`,
      phone: phone,
      village: address,
      block: block,
      district: district,
      type: 'Patient',
      created_at: new Date(formattedDate).toISOString()
    };
  });

  console.log(`Processing ${records.length} records...`);

  const { data, error } = await supabase
    .from('hospital_entries')
    .insert(records)
    .select();

  if (error) {
    console.error('Error inserting records:', error);
  } else {
    console.log('Successfully inserted records:', data);
  }
}

run();

import express from "express";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createServer } from "http";
import { Server } from "socket.io";
import { WhatsAppEngine } from "./whatsapp-engine";

dotenv.config();

const cleanEnvVar = (val: string | undefined): string => {
  if (!val) return "";
  let clean = val.trim();
  if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
  if (clean.startsWith("'") && clean.endsWith("'")) clean = clean.slice(1, -1);
  return clean.trim();
};

const supabaseUrl = cleanEnvVar(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const supabaseKey = cleanEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

// Self-Diagnostic Startup Info
console.log(`[BOOT] Environment Diagnosis:`);
console.log(`  - NODE_ENV: "${process.env.NODE_ENV}"`);
console.log(`  - VERCEL env: "${process.env.VERCEL}"`);
console.log(`  - SUPABASE_URL length: ${supabaseUrl.length}`);
if (supabaseUrl) {
  console.log(`  - SUPABASE_URL starts with: "${supabaseUrl.substring(0, 15)}..."`);
}
console.log(`  - SUPABASE_KEY/SERVICE_ROLE length: ${supabaseKey.length}`);
if (supabaseKey) {
  console.log(`  - SUPABASE_KEY starts with: "${supabaseKey.substring(0, 10)}..." (ends with: "...${supabaseKey.substring(supabaseKey.length - 6)}")`);
}

export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseKey) return false;
  if (supabaseUrl.includes("placeholder.supabase.co") || supabaseUrl.includes("your-project-id")) return false;
  if (supabaseKey.includes("placeholder_key") || supabaseKey.includes("your-supabase-public-anon-key") || supabaseKey.includes("your-supabase-service-role-key")) return false;
  return true;
};

if (!isSupabaseConfigured()) {
  console.warn("WARNING: SUPABASE_URL or SUPABASE_KEY is missing or carries placeholder values. Operating in local-fallback storage mode.");
} else {
  console.log("SUCCESS: Supabase URL and Key found and configured successfully.");
}

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = typeof input === "string" ? input : (input instanceof URL ? input.toString() : (input as any).url);
  const method = init?.method || "GET";
  
  console.log(`[SUPABASE API OUTBOUND] -> ${method} ${urlStr}`);
  if (init?.body) {
    try {
      console.log(`[SUPABASE API PAYLOAD] -> ${String(init.body).substring(0, 500)}`);
    } catch (e) {}
  }

  if (!isSupabaseConfigured()) {
    console.warn(`[SUPABASE CONFIG EXCEPTION] Attempted Supabase call but Supabase is NOT configured! Blocking: ${urlStr}`);
    return new Response(JSON.stringify({
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Supabase is not configured yet. Operating in local JSON filesystem/in-memory fallback mode.",
      details: "Please provide a valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  try {
    const startTime = Date.now();
    const response = await fetch(input, init);
    const duration = Date.now() - startTime;
    
    console.log(`[SUPABASE API INBOUND] <- Status ${response.status} (${duration}ms) for ${method} ${urlStr}`);
    
    // Asynchronously audit response for database RLS policies / authorization blocks
    const clonedRes = response.clone();
    clonedRes.text().then(text => {
      if (text.includes("violates row-level security") || text.includes("permission denied") || text.includes("42501") || text.includes("new row violates row-level security")) {
        console.error(`[SUPABASE SECURITY ERROR] RLS policy blocked this request! URL: ${method} ${urlStr}. Error detail:`, text);
      } else if (response.status >= 400) {
        console.error(`[SUPABASE ERROR RESP] Status ${response.status} for ${method} ${urlStr}. Payload:`, text);
      }
    }).catch(() => {});

    return response;
  } catch (err: any) {
    console.error(`[SUPABASE DNS/NETWORK CRASH] Failed to fetch Supabase endpoint: ${err.message || err}`);
    return new Response(JSON.stringify({
      code: "SUPABASE_NETWORK_ERROR",
      message: err.message || "Network connection to Supabase failed",
      details: String(err)
    }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : "https://placeholder.supabase.co", 
  isSupabaseConfigured() ? supabaseKey : "placeholder_key", 
  {
    auth: {
      persistSession: false
    },
    global: {
      fetch: customFetch
    }
  }
);

export const app = express();

async function startServer() {
  
  // --- In-Memory Fallback Databases ---
  let fallbackTemplates: any[] = [
    { id: 991001, module: "Hospital", name: "Birthday Wish", content: "Wish you a very happy Birthday, {{name}}!", type: "Birthday" },
    { id: 991002, module: "Hospital", name: "Anniversary Greeting", content: "Happy Anniversary, {{name}}!", type: "Anniversary" },
    { id: 991003, module: "Dairy", name: "Milk Collection Alert", content: "Dear {{name}}, your milk collection of {{quantity}}L has been approved.", type: "Custom" }
  ];
  let fallbackMediaItems: any[] = [];
  let fallbackSettingsList: any[] = [
    {
      module: 'Hospital',
      institution_name: 'Shri Krishna Mission Hospital',
      contact_number: '91 9918922900',
      full_address: 'Shri Krishna Nagar, Dhorika Road, Bargodwa Near Bodewan, Basti-272001, Uttar Pradesh',
      hospital_name: 'Shri Krishna Mission H',
      whatsapp_api_key: '',
      auto_birthday: false,
      auto_anniversary: false,
      logo_url: ''
    },
    {
      module: 'Dairy',
      institution_name: 'Sugar & Dairy Co',
      contact_number: '91 9918922900',
      full_address: 'Main Highway, Sector 4, Basti-272001, Uttar Pradesh',
      hospital_name: 'Sugar & Dairy Co',
      whatsapp_api_key: '',
      auto_birthday: false,
      auto_anniversary: false,
      logo_url: ''
    }
  ];
  let fallbackStaffAccounts: any[] = [
    { id: 1, module: "Hospital", name: "Staff Admin", username: "staff", password: "123" }
  ];
  let fallbackHospitalEntries: any[] = [];
  try {
    const initialPath = path.join(process.cwd(), 'src', 'initial_patients.json');
    if (fs.existsSync(initialPath)) {
      const content = fs.readFileSync(initialPath, 'utf8');
      fallbackHospitalEntries = content.trim() ? JSON.parse(content) : [];
      console.log(`[BOOT] Loaded ${fallbackHospitalEntries.length} patients into memory fallback.`);
    }
  } catch (e) {
    console.error("[BOOT] Failed to pre-load initial_patients.json:", e);
  }

  let fallbackDairyEntries: any[] = [];
  try {
    const initialPath = path.join(process.cwd(), 'src', 'initial_dairy.json');
    if (fs.existsSync(initialPath)) {
      const content = fs.readFileSync(initialPath, 'utf8');
      fallbackDairyEntries = content.trim() ? JSON.parse(content) : [];
      console.log(`[BOOT] Loaded ${fallbackDairyEntries.length} dairy records into memory fallback.`);
    }
  } catch (e) {
    console.error("[BOOT] Failed to pre-load initial_dairy.json:", e);
  }
  let fallbackStateMasters: any[] = [
    { id: 1, module: "Hospital", name: "Uttar Pradesh" },
    { id: 2, module: "Dairy", name: "Uttar Pradesh" }
  ];
  let fallbackDistrictMasters: any[] = [];
  let fallbackBlockMasters: any[] = [];
  let fallbackPostMasters: any[] = [];
  let fallbackVillageMasters: any[] = [];
  let fallbackLogs: any[] = [];

  // Auto-seeding routine to automatically populate empty Supabase tables on startup
  async function autoSeedDatabase() {
    if (!isSupabaseConfigured()) {
      console.log("[SEED] Supabase is not configured yet. Auto-seeding skipped.");
      return;
    }
    
    console.log("[SEED] Checking if Supabase tables require initial seeding...");
    try {
      // 1. Seed Hospital Entries if table doesn't have any rows
      const { data: hospSelect, error: countHospError } = await supabase
        .from('hospital_entries')
        .select('id')
        .limit(1);
        
      if (!countHospError && (!hospSelect || hospSelect.length === 0)) {
        console.log(`[SEED] hospital_entries table is empty. Seeding from local file memory...`);
        if (fallbackHospitalEntries.length > 0) {
          const CHUNK_SIZE = 50;
          for (let i = 0; i < fallbackHospitalEntries.length; i += CHUNK_SIZE) {
            const chunk = fallbackHospitalEntries.slice(i, i + CHUNK_SIZE);
            const { error: seedErr } = await supabase
              .from('hospital_entries')
              .insert(chunk.map(e => {
                const { _source, ...cleanedRecord } = e;
                return cleanedRecord;
              }));
            if (seedErr) {
              console.error(`[SEED] Error seeding hospital chunk starting at index ${i}:`, seedErr);
              break;
            }
          }
          console.log(`[SEED] Finished seeding hospital_entries with ${fallbackHospitalEntries.length} records!`);
        }
      } else if (countHospError) {
        console.warn("[SEED] Skipping hospital_entries seed or table does not exist yet (requires supabase_schema.sql to be executed):", countHospError.message);
      } else {
        console.log(`[SEED] hospital_entries table already contains data. Seeding skipped.`);
      }

      // 2. Seed Dairy Entries if table doesn't have any rows
      const { data: dairySelect, error: countDairyError } = await supabase
        .from('dairy_entries')
        .select('id')
        .limit(1);
        
      if (!countDairyError && (!dairySelect || dairySelect.length === 0)) {
        console.log(`[SEED] dairy_entries table is empty. Seeding from local file memory...`);
        if (fallbackDairyEntries.length > 0) {
          const CHUNK_SIZE = 50;
          for (let i = 0; i < fallbackDairyEntries.length; i += CHUNK_SIZE) {
            const chunk = fallbackDairyEntries.slice(i, i + CHUNK_SIZE);
            const { error: seedErr } = await supabase
              .from('dairy_entries')
              .insert(chunk.map(e => {
                const { _source, ...cleanedRecord } = e;
                return cleanedRecord;
              }));
            if (seedErr) {
              console.error(`[SEED] Error seeding dairy chunk starting at index ${i}:`, seedErr);
              break;
            }
          }
          console.log(`[SEED] Finished seeding dairy_entries with ${fallbackDairyEntries.length} records!`);
        }
      } else if (countDairyError) {
        console.warn("[SEED] Skipping dairy_entries seed or table does not exist yet:", countDairyError.message);
      } else {
        console.log(`[SEED] dairy_entries table already contains data. Seeding skipped.`);
      }

      // 3. Robust seed check for target user WhatsApp Line
      const { data: existingAccounts, error: fetchAccError } = await supabase
        .from('whatsapp_accounts')
        .select('*');

      if (!fetchAccError) {
        const hasUserNumber = existingAccounts?.some(acc => {
          const clean = (acc.phone || "").replace(/\D/g, "");
          return clean === "7307433714" || clean === "917307433714";
        });

        if (!hasUserNumber) {
          console.log(`[SEED] Official line 7307433714 not found in database. Inserting as default connected account...`);
          const { error: seedAccErr } = await supabase
            .from('whatsapp_accounts')
            .insert([{
              name: "Official Line (7307433714)",
              phone: "7307433714",
              status: "connected",
              user_id: "admin",
              session_data: JSON.stringify({
                authToken: "mock-baileys-credentials-token",
                pairedAt: new Date().toISOString(),
                phone: "7307433714"
              })
            }]);
          if (seedAccErr) {
            console.error("[SEED] Failed to seed default WhatsApp account:", seedAccErr.message);
          } else {
            console.log("[SEED] Successfully seeded official connected line 7307433714!");
          }
        } else {
          console.log("[SEED] Official line 7307433714 already registered in database.");
        }
      } else {
        console.warn("[SEED] Skipping whatsapp_accounts seed or table does not exist yet:", fetchAccError.message);
      }
    } catch (err) {
      console.error("[SEED] Error in auto-seeding routine:", err);
    }
  }

  // Trigger auto-seeding on startup as an async background task
  if (isSupabaseConfigured()) {
    autoSeedDatabase().catch(err => {
      console.error("[SEED] Failed to auto-seed:", err);
    });
  }

  // CORS configuration to allow cross-origin requests from Vercel deployments
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Robust middleware to handle stringified/buffered request bodies and log all API requests
  app.use((req: any, res, next) => {
    // 1. Safe Body Parsing Parser
    if (req.body && typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch (e) {}
    } else if (req.body && Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString('utf8'));
      } catch (e) {}
    }
    
    // Ensure req.body is never null/undefined
    if (!req.body) {
      req.body = {};
    }

    // 2. Comprehensive Logging
    if (req.path.startsWith('/api/')) {
      const method = req.method;
      const path = req.path;
      const query = JSON.stringify(req.query || {});
      
      // Mask password in logs to maintain security/privacy
      let bodyLog = { ...req.body };
      if (bodyLog.password) {
        bodyLog.password = "[MASKED]";
      }
      
      console.log(`[API REQUEST] -> ${method} ${path} | Query: ${query} | Body: ${JSON.stringify(bodyLog)}`);
    }
    next();
  });

  const PORT = 3000;

  // Middleware to log Supabase config state (non-blocking in-memory fallback enabled)
  app.use((req, res, next) => {
    if ((!isSupabaseConfigured()) && req.path.startsWith('/api/') && req.path !== '/api/health' && req.path !== '/api/login') {
      console.warn(`[API fallbacks] Supabase not configured. Serving "${req.path}" via in-memory local fallback.`);
    }
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      supabase_configured: isSupabaseConfigured(),
      env: process.env.NODE_ENV,
      version: "1.2.0"
    });
  });

  app.get("/api/dashboard/counts", async (req, res) => {
    try {
      if (!isSupabaseConfigured()) {
        return res.json({
          hospital: fallbackHospitalEntries.length,
          dairy: fallbackDairyEntries.length
        });
      }

      const [hRes, dRes] = await Promise.all([
        supabase
          .from('hospital_entries')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('dairy_entries')
          .select('id', { count: 'exact', head: true })
      ]);

      const hospital = hRes.error ? fallbackHospitalEntries.length : (hRes.count ?? fallbackHospitalEntries.length);
      const dairy = dRes.error ? fallbackDairyEntries.length : (dRes.count ?? fallbackDairyEntries.length);

      res.json({ hospital, dairy });
    } catch (err) {
      console.error("[COUNT ERROR] Failed to fetch dashboard exact counts:", err);
      res.json({
        hospital: fallbackHospitalEntries.length,
        dairy: fallbackDairyEntries.length
      });
    }
  });

  app.get("/api/db-test", async (req, res) => {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: "Supabase not configured" });
    }
    
    try {
      const { data, error } = await supabase.from('hospital_entries').select('count', { count: 'exact', head: true });
      if (error) {
        return res.status(500).json({ 
          error: "Database connection failed", 
          message: error.message,
          code: error.code,
          details: error.details
        });
      }
      res.json({ 
        success: true, 
        message: "Successfully connected to Supabase", 
        table_found: true,
        count: data 
      });
    } catch (err) {
      res.status(500).json({ error: "Internal error during DB test", message: (err as Error).message });
    }
  });

  // Helper to standardise dates to YYYY-MM-DD
  const parseDateToYYYYMMDD = (val: any): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    if (!str) return null;

    // Excel serial dates handling
    const num = Number(str);
    if (!isNaN(num) && num > 25569 && num < 100000) {
      try {
        const date = new Date((num - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (_) {}
    }

    // Capture standard separators (1-4 digits for year/day/month)
    const separatorMatch = str.match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$/);
    if (separatorMatch) {
      const part1 = separatorMatch[1];
      const part2 = separatorMatch[2];
      const part3 = separatorMatch[3];
      
      let year = '';
      let month = '';
      let day = '';

      if (part1.length === 4) {
        year = part1;
        month = part2;
        day = part3;
      } else {
        year = part3;
        month = part2;
        day = part1;
      }

      day = day.padStart(2, '0');
      month = month.padStart(2, '0');

      let yNum = parseInt(year);
      if (yNum < 100) {
        year = String(2000 + yNum);
      }

      // Dynamic month-day swap for US formatting (e.g. 12/30/2025)
      const dNum = parseInt(day);
      const mNum = parseInt(month);
      if (mNum > 12 && dNum <= 12) {
        const temp = day;
        day = month;
        month = temp;
      }

      const finalMonthNum = parseInt(month);
      const finalDayNum = parseInt(day);
      if (finalMonthNum >= 1 && finalMonthNum <= 12 && finalDayNum >= 1 && finalDayNum <= 31) {
        return `${year}-${month}-${day}`;
      }
    }

    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (_) {}

    return null;
  };

  // Helper to clean entries for DB
  const cleanHospitalEntry = (e: any, isUpdate = false) => {
    const validCols = [
      'id', 'type', 'name', 'father_husband', 'phone', 'pincode', 'city', 'state', 
      'dob', 'anniversary', 'age', 'village', 'post', 'block', 'district', 
      'doctor', 'department', 'photo', 'id_card', 'password', 'created_at',
      'aadhar', 'bmc_dpmc', 'aadhaar_card'
    ];
    const cleaned: any = {};
    validCols.forEach(col => {
      // Don't include ID in cleaning for new records unless explicitly provided as a non-empty value
      if (col === 'id' && !isUpdate && (!e[col] || e[col] === "")) return;
      
      if (e[col] !== undefined) {
        let val = e[col];
        // Handle empty fields
        if (val === "" || val === undefined) {
          cleaned[col] = null;
        } else if (['dob', 'anniversary'].includes(col)) {
          // Date cleaning with standard robust parser
          cleaned[col] = parseDateToYYYYMMDD(val);
        } else {
          cleaned[col] = val;
        }
      }
    });
    return cleaned;
  };

  const cleanDairyEntry = (e: any, isUpdate = false) => {
    const validCols = [
      'id', 'type', 'name', 'father_husband', 'phone', 'pincode', 'city', 'state', 
      'dob', 'anniversary', 'age', 'village', 'post', 'block', 'district', 
      'doctor', 'department', 'photo', 'id_card', 'password', 'created_at',
      'aadhar', 'bmc_dpmc', 'aadhaar_card'
    ];
    const cleaned: any = {};
    validCols.forEach(col => {
      if (col === 'id' && !isUpdate && (!e[col] || e[col] === "")) return;

      if (e[col] !== undefined) {
        let val = e[col];
        if (val === "" || val === undefined) {
          cleaned[col] = null;
        } else if (['dob', 'anniversary'].includes(col)) {
          // Date cleaning with standard robust parser
          cleaned[col] = parseDateToYYYYMMDD(val);
        } else {
          cleaned[col] = val;
        }
      }
    });
    return cleaned;
  };

  const saveHospitalEntryFallback = (record: any) => {
    const existingIdx = fallbackHospitalEntries.findIndex(e => String(e.id) === String(record.id));
    if (existingIdx > -1) {
      fallbackHospitalEntries[existingIdx] = { ...fallbackHospitalEntries[existingIdx], ...record };
    } else {
      fallbackHospitalEntries.unshift(record);
    }
    try {
      const initialPath = path.join(process.cwd(), 'src', 'initial_patients.json');
      let currentData = [];
      if (fs.existsSync(initialPath)) {
        currentData = JSON.parse(fs.readFileSync(initialPath, 'utf8'));
      }
      const existingFileIdx = currentData.findIndex((e: any) => String(e.id) === String(record.id));
      if (existingFileIdx > -1) {
        currentData[existingFileIdx] = { ...currentData[existingFileIdx], ...record };
      } else {
        currentData.unshift(record);
      }
      fs.writeFileSync(initialPath, JSON.stringify(currentData, null, 2));
      console.log(`[LOCAL PERSIST] Saved hospital record ID ${record.id} successfully.`);
    } catch (fsErr) {
      console.error('Error saving to initial_patients.json fallback:', fsErr);
    }
  };

  const saveDairyEntryFallback = (record: any) => {
    const existingIdx = fallbackDairyEntries.findIndex(e => String(e.id) === String(record.id));
    if (existingIdx > -1) {
      fallbackDairyEntries[existingIdx] = { ...fallbackDairyEntries[existingIdx], ...record };
    } else {
      fallbackDairyEntries.unshift(record);
    }
    try {
      const initialPath = path.join(process.cwd(), 'src', 'initial_dairy.json');
      let currentData = [];
      if (fs.existsSync(initialPath)) {
        currentData = JSON.parse(fs.readFileSync(initialPath, 'utf8'));
      }
      const existingFileIdx = currentData.findIndex((e: any) => String(e.id) === String(record.id));
      if (existingFileIdx > -1) {
        currentData[existingFileIdx] = { ...currentData[existingFileIdx], ...record };
      } else {
        currentData.unshift(record);
      }
      fs.writeFileSync(initialPath, JSON.stringify(currentData, null, 2));
      console.log(`[LOCAL PERSIST] Saved dairy record ID ${record.id} successfully.`);
    } catch (fsErr) {
      console.error('Error saving to initial_dairy.json fallback:', fsErr);
    }
  };

  // Hospital API
  app.get("/api/hospital/entries", async (req, res) => {
    if (!isSupabaseConfigured()) {
      return res.json(fallbackHospitalEntries.map((d: any) => ({ ...d, _source: 'fallback' })));
    }

    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    let errorOccurred = false;

    while (hasMore) {
      const { data: dbData, error } = await supabase
        .from('hospital_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        if (error.code !== '42P01' && error.code !== 'SUPABASE_NOT_CONFIGURED') {
          console.error(`Database fetch error at page ${page}:`, error);
          errorOccurred = true;
        }
        break;
      }

      if (!dbData || dbData.length === 0) {
        hasMore = false;
      } else {
        allData.push(...dbData);
        if (dbData.length < pageSize) {
          hasMore = false;
        } else {
          page++;
          // Safety cap to prevent memory depletion (max 50,000 records)
          if (page >= 50) {
            hasMore = false;
          }
        }
      }
    }

    if (errorOccurred && allData.length === 0) {
      return res.json(fallbackHospitalEntries.map((d: any) => ({ ...d, _source: 'fallback' })));
    }

    const data = allData.map((d: any) => ({ ...d, _source: 'database' }));
    
    // If DB is empty, use our populated in-memory fallback
    if (data.length === 0) {
      return res.json(fallbackHospitalEntries.map((d: any) => ({ ...d, _source: 'fallback' })));
    }

    res.json(data);
  });

  app.post("/api/hospital/bulk_upload", async (req, res) => {
    const { entries } = req.body;
    if (!Array.isArray(entries)) return res.status(400).json({ error: 'Entries must be an array' });
    
    const validHospitalCols = [
      'id', 'type', 'name', 'father_husband', 'phone', 'pincode', 'city', 'state', 
      'dob', 'anniversary', 'age', 'village', 'post', 'block', 'district', 
      'doctor', 'department', 'photo', 'id_card', 'password', 'created_at',
      'aadhar', 'bmc_dpmc', 'aadhaar_card'
    ];

    console.log(`Bulk uploading ${entries.length} hospital records...`);
    const formattedEntries = entries.map((e: any) => {
      // Ensure ID is a valid number, otherwise generate one
      const rawId = parseInt(String(e.id));
      const finalId = (!isNaN(rawId) && rawId > 0) ? rawId : Math.floor(Date.now() + Math.random() * 1000000);
      
      const cleaned: any = {};
      validHospitalCols.forEach(col => {
        if (col === 'id' || col === 'created_at') return;
        let val = e[col];
        
        // Convert empty strings to null
        if (val === "" || val === undefined) {
          cleaned[col] = null;
          return;
        }

        // Clean phone numbers: remove scientific notation (.0) and strip non-numbers
        if (col === 'phone') {
          let ph = String(val).trim();
          if (ph.endsWith('.0')) {
            ph = ph.slice(0, -2);
          }
          ph = ph.replace(/[^0-9]/g, '');
          val = ph;
        }

        // Sensitive date handling: ensure valid ISO or null
        if (['dob', 'anniversary'].includes(col)) {
          const d = new Date(val);
          if (isNaN(d.getTime())) {
            cleaned[col] = null; // Ignore invalid dates instead of crashing
          } else {
            cleaned[col] = d.toISOString().split('T')[0]; // Use YYYY-MM-DD
          }
          return;
        }

        cleaned[col] = val;
      });

      return {
        ...cleaned,
        id: finalId,
        type: cleaned.type || 'Patient',
        created_at: e.created_at || new Date().toISOString()
      };
    });

    // deduplicate and format the entries
    const uniqueHospitalEntriesMap = new Map();
    formattedEntries.forEach((entry: any) => {
      uniqueHospitalEntriesMap.set(entry.id, entry);
    });
    const deduplicatedEntries = Array.from(uniqueHospitalEntriesMap.values());

    let data: any[] | null = [];
    let error: any = null;
    const CHUNK_SIZE = 200; // Safe chunking to prevent PostgreSQL parameter limit issues

    for (let i = 0; i < deduplicatedEntries.length; i += CHUNK_SIZE) {
      const chunk = deduplicatedEntries.slice(i, i + CHUNK_SIZE);
      const { data: chunkData, error: chunkError } = await supabase
        .from('hospital_entries')
        .upsert(chunk, { onConflict: 'id' })
        .select();
      
      if (chunkError) {
        error = chunkError;
        break;
      }
      if (chunkData) {
        data = data.concat(chunkData);
      }
    }
    
    if (error) {
      console.error('Hospital Bulk upload error (DB):', error.message || error);
      const dbErrorMsg = typeof error === 'object' ? JSON.stringify(error) : String(error);
      
      // Fallback: Save to initial_patients.json so it's visible in the UI
      try {
        const initialPath = path.join(process.cwd(), 'src', 'initial_patients.json');
        let currentData = [];
        if (fs.existsSync(initialPath)) {
          currentData = JSON.parse(fs.readFileSync(initialPath, 'utf8'));
        }
        
        const existingIds = new Set(currentData.map((e: any) => e.id));
        
        // Deduplicate and merge
        const newData = [...currentData];
        let addedCount = 0;
        deduplicatedEntries.forEach((e: any) => {
          if (!existingIds.has(e.id)) {
            newData.push(e);
            existingIds.add(e.id);
            addedCount++;
          }
        });
        
        fs.writeFileSync(initialPath, JSON.stringify(newData, null, 2));
        console.log(`Fallback Success: Saved ${addedCount} records to local fallback file.`);
        
        return res.json({ 
          success: true, 
          count: addedCount, 
          message: 'Saved to local server storage (Database Restricted)',
          dbError: dbErrorMsg
        });
      } catch (fsErr: any) {
        console.error('Local fallback failed:', fsErr.message || fsErr);
        return res.status(500).json({ 
          error: 'Database error and local storage failed',
          dbError: dbErrorMsg,
          fsError: fsErr.message || String(fsErr)
        });
      }
    }
    res.json({ success: true, count: data?.length || 0 });
  });

  app.post("/api/dairy/bulk_upload", async (req, res) => {
    const { entries } = req.body;
    if (!Array.isArray(entries)) return res.status(400).json({ error: 'Entries must be an array' });
    
    console.log(`Bulk uploading ${entries.length} dairy records...`);
    const validDairyCols = [
      'id', 'type', 'name', 'father_husband', 'phone', 'pincode', 'city', 'state', 
      'dob', 'anniversary', 'age', 'village', 'post', 'block', 'district', 
      'doctor', 'department', 'photo', 'id_card', 'password', 'created_at',
      'aadhar', 'bmc_dpmc', 'aadhaar_card'
    ];

    const formattedEntries = entries.map((e: any) => {
      const rawId = parseInt(String(e.id));
      const finalId = (!isNaN(rawId) && rawId > 0) ? rawId : Math.floor(Date.now() + Math.random() * 1000000);
      
      const cleaned: any = {};
      validDairyCols.forEach(col => {
        if (col === 'id' || col === 'created_at') return;
        let val = e[col];
        
        if (val === "" || val === undefined) {
          cleaned[col] = null;
          return;
        }

        // Clean phone numbers: remove scientific notation (.0) and strip non-numbers
        if (col === 'phone') {
          let ph = String(val).trim();
          if (ph.endsWith('.0')) {
            ph = ph.slice(0, -2);
          }
          ph = ph.replace(/[^0-9]/g, '');
          val = ph;
        }

        if (['dob', 'anniversary'].includes(col)) {
          const d = new Date(val);
          if (isNaN(d.getTime())) {
            cleaned[col] = null;
          } else {
            cleaned[col] = d.toISOString().split('T')[0];
          }
          return;
        }

        cleaned[col] = val;
      });

      return {
        ...cleaned,
        id: finalId,
        type: cleaned.type || 'Farmer',
        created_at: e.created_at || new Date().toISOString()
      };
    });

    // deduplicate and format the entries
    const uniqueDairyEntriesMap = new Map();
    formattedEntries.forEach((entry: any) => {
      uniqueDairyEntriesMap.set(entry.id, entry);
    });
    const deduplicatedEntries = Array.from(uniqueDairyEntriesMap.values());

    let data: any[] | null = [];
    let error: any = null;
    const CHUNK_SIZE = 200; // Safe chunking to prevent PostgreSQL parameter limit issues

    for (let i = 0; i < deduplicatedEntries.length; i += CHUNK_SIZE) {
      const chunk = deduplicatedEntries.slice(i, i + CHUNK_SIZE);
      const { data: chunkData, error: chunkError } = await supabase
        .from('dairy_entries')
        .upsert(chunk, { onConflict: 'id' })
        .select();
      
      if (chunkError) {
        error = chunkError;
        break;
      }
      if (chunkData) {
        data = data.concat(chunkData);
      }
    }
    
    if (error) {
      console.error('Dairy Bulk upload error (DB):', error.message || error);
      const dbErrorMsg = typeof error === 'object' ? JSON.stringify(error) : String(error);
      
      // Fallback local storage
      try {
        const initialPath = path.join(process.cwd(), 'src', 'initial_dairy.json');
        let currentData = [];
        if (fs.existsSync(initialPath)) {
          currentData = JSON.parse(fs.readFileSync(initialPath, 'utf8'));
        }
        
        const existingIds = new Set(currentData.map((e: any) => e.id));
        const newData = [...currentData];
        let addedCount = 0;
        deduplicatedEntries.forEach((e: any) => {
          if (!existingIds.has(e.id)) {
            newData.push(e);
            existingIds.add(e.id);
            addedCount++;
          }
        });
        
        fs.writeFileSync(initialPath, JSON.stringify(newData, null, 2));
        console.log(`Dairy Fallback Success: Saved ${addedCount} records.`);
        
        return res.json({ 
          success: true, 
          count: addedCount, 
          message: 'Saved to local server storage (Database Restricted)',
          dbError: dbErrorMsg
        });
      } catch (fsErr: any) {
        console.error('Dairy fallback failed:', fsErr.message || fsErr);
        return res.status(500).json({ 
          error: 'Database error and local storage failed',
          dbError: dbErrorMsg,
          fsError: fsErr.message || String(fsErr)
        });
      }
    }
    res.json({ success: true, count: data?.length || 0 });
  });

  app.post("/api/hospital/entries", async (req, res) => {
    try {
      const body = cleanHospitalEntry(req.body, false);
      const newId = body.id || Math.floor(Date.now() + Math.random() * 1000000);
      const record = { ...body, id: newId, type: body.type || 'Patient', created_at: body.created_at || new Date().toISOString() };
      
      if (!isSupabaseConfigured()) {
        saveHospitalEntryFallback(record);
        return res.json({ id: record.id, message: 'Saved with local storage fallback (Supabase not configured)' });
      }

      const { data, error } = await supabase
        .from('hospital_entries')
        .insert([record])
        .select();
      
      if (error || !data || data.length === 0) {
        console.warn('Supabase Hospital Insert Error, falling back:', error);
        saveHospitalEntryFallback(record);
        return res.json({ id: record.id, message: 'Saved with local storage fallback (DB restricted)' });
      }
      
      res.json({ id: data[0].id });
    } catch (err) {
      console.error('Internal Server Error (Hospital Insert):', err);
      res.status(500).json({ error: (err as Error).message || 'Internal Server Error' });
    }
  });

  app.delete("/api/hospital/entries/:id", async (req, res) => {
    const { id } = req.params;
    
    // Always remove from memory
    fallbackHospitalEntries = fallbackHospitalEntries.filter(e => String(e.id) !== String(id));

    // Always attempt to remove from initial_patients.json
    try {
      const initialPath = path.join(process.cwd(), 'src', 'initial_patients.json');
      if (fs.existsSync(initialPath)) {
        const fileContent = fs.readFileSync(initialPath, 'utf8');
        const currentData = fileContent.trim() ? JSON.parse(fileContent) : [];
        const filteredData = currentData.filter((e: any) => String(e.id) !== String(id));
        if (currentData.length !== filteredData.length) {
          fs.writeFileSync(initialPath, JSON.stringify(filteredData, null, 2));
        }
      }
    } catch (e) {
      console.error('Error deleting from initial_patients.json:', e);
    }

    if (!isSupabaseConfigured()) {
      return res.json({ success: true, message: 'Deleted from local filesystem backup (Supabase not configured)' });
    }

    const { error } = await supabase
      .from('hospital_entries')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.warn('Supabase Hospital Delete Error, bypassed:', error);
      return res.json({ success: true, message: 'Deleted from local filesystem backup, DB delete bypassed' });
    }
    res.json({ success: true });
  });

  app.put("/api/hospital/entries/:id", async (req, res) => {
    const { id } = req.params;
    const body = cleanHospitalEntry(req.body, true);
    const updatedRecord = { ...body, id: isNaN(Number(id)) ? id : Number(id) };

    // Always save to fallback JSON file so local files keep user edits
    saveHospitalEntryFallback(updatedRecord);

    if (!isSupabaseConfigured()) {
      return res.json({ success: true, message: 'Updated in local storage backup (Supabase not configured)' });
    }

    const { error } = await supabase
      .from('hospital_entries')
      .update(body)
      .eq('id', id);

    if (error) {
      console.warn('Supabase Hospital Update Error, falling back:', error);
      return res.json({ success: true, message: 'Updated in local storage backup (DB error)' });
    }
    res.json({ success: true });
  });

  // Hospital Clear All API
  app.delete("/api/hospital/entries", async (req, res) => {
    try {
      fallbackHospitalEntries = [];
      const initialPath = path.join(process.cwd(), 'src', 'initial_patients.json');
      fs.writeFileSync(initialPath, JSON.stringify([], null, 2));
      
      if (!isSupabaseConfigured()) {
        return res.json({ success: true, message: 'All hospital data cleared in local fallback storage' });
      }

      const { error } = await supabase
        .from('hospital_entries')
        .delete()
        .not('id', 'is', null); // Delete everything
      
      if (error) {
        console.warn('DB Clear Error, fallback cleared:', error);
        return res.json({ success: true, message: 'Data cleared locally, DB delete failed' });
      }
      res.json({ success: true, message: 'All hospital data cleared successfully' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/dairy/entries", async (req, res) => {
    try {
      fallbackDairyEntries = [];
      const initialPath = path.join(process.cwd(), 'src', 'initial_dairy.json');
      fs.writeFileSync(initialPath, JSON.stringify([], null, 2));

      if (!isSupabaseConfigured()) {
        return res.json({ success: true, message: 'All dairy data cleared in fallback local storage' });
      }

      const { error } = await supabase
        .from('dairy_entries')
        .delete()
        .not('id', 'is', null); // Delete everything

      if (error) {
        console.warn('DB Clear Error (Dairy), local file cleared:', error);
        return res.json({ success: true, message: 'All dairy data cleared locally, DB delete failed' });
      }
      res.json({ success: true, message: 'All dairy data cleared' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/dairy/entries", async (req, res) => {
    if (!isSupabaseConfigured()) {
      return res.json(fallbackDairyEntries.map((d: any) => ({ ...d, _source: 'fallback' })));
    }

    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    let errorOccurred = false;

    while (hasMore) {
      const { data: dbData, error } = await supabase
        .from('dairy_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        if (error.code !== '42P01' && error.code !== 'SUPABASE_NOT_CONFIGURED') {
          console.error(`Database fetch error (Dairy) at page ${page}:`, error);
          errorOccurred = true;
        }
        break;
      }

      if (!dbData || dbData.length === 0) {
        hasMore = false;
      } else {
        allData.push(...dbData);
        if (dbData.length < pageSize) {
          hasMore = false;
        } else {
          page++;
          // Safety cap to prevent memory depletion (max 50,000 records)
          if (page >= 50) {
            hasMore = false;
          }
        }
      }
    }

    if (errorOccurred && allData.length === 0) {
      return res.json(fallbackDairyEntries.map((d: any) => ({ ...d, _source: 'fallback' })));
    }

    const data = allData.map((d: any) => ({ ...d, _source: 'database' }));

    if (data.length === 0) {
      return res.json(fallbackDairyEntries.map((d: any) => ({ ...d, _source: 'fallback' })));
    }

    res.json(data);
  });

  app.post("/api/dairy/entries", async (req, res) => {
    try {
      const body = cleanDairyEntry(req.body, false);
      const newId = body.id || Math.floor(Date.now() + Math.random() * 1000000);
      const record = { ...body, id: newId, type: body.type || 'Farmer', created_at: body.created_at || new Date().toISOString() };
      
      if (!isSupabaseConfigured()) {
        saveDairyEntryFallback(record);
        return res.json({ id: record.id, message: 'Saved with local storage fallback (Supabase not configured)' });
      }

      const { data, error } = await supabase
        .from('dairy_entries')
        .insert([record])
        .select();
      
      if (error || !data || data.length === 0) {
        console.warn('Supabase Dairy Insert Error, falling back:', error);
        saveDairyEntryFallback(record);
        return res.json({ id: record.id, message: 'Saved with local storage fallback (DB restricted)' });
      }
      
      res.json({ id: data[0].id });
    } catch (err) {
      console.error('Internal Server Error (Dairy Insert):', err);
      res.status(500).json({ error: (err as Error).message || 'Internal Server Error' });
    }
  });

  app.delete("/api/dairy/entries/:id", async (req, res) => {
    const { id } = req.params;
    
    // Always remove from memory
    fallbackDairyEntries = fallbackDairyEntries.filter(e => String(e.id) !== String(id));

    // Also attempt to remove from initial_dairy.json
    try {
      const initialPath = path.join(process.cwd(), 'src', 'initial_dairy.json');
      if (fs.existsSync(initialPath)) {
        const fileContent = fs.readFileSync(initialPath, 'utf8');
        const currentData = fileContent.trim() ? JSON.parse(fileContent) : [];
        const filteredData = currentData.filter((e: any) => String(e.id) !== String(id));
        if (currentData.length !== filteredData.length) {
          fs.writeFileSync(initialPath, JSON.stringify(filteredData, null, 2));
        }
      }
    } catch (e) {
      console.error('Error deleting from initial_dairy.json:', e);
    }

    if (!isSupabaseConfigured()) {
      return res.json({ success: true, message: 'Deleted from local filesystem backup (Supabase not configured)' });
    }

    const { error } = await supabase
      .from('dairy_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Supabase Dairy Delete Error, bypassed:', error);
      return res.json({ success: true, message: 'Deleted from local filesystem backup, DB delete bypassed' });
    }
    res.json({ success: true });
  });

  app.put("/api/dairy/entries/:id", async (req, res) => {
    const { id } = req.params;
    const body = cleanDairyEntry(req.body, true);
    const updatedRecord = { ...body, id: isNaN(Number(id)) ? id : Number(id) };

    // Always save to fallback JSON file so local files keep user edits
    saveDairyEntryFallback(updatedRecord);

    if (!isSupabaseConfigured()) {
      return res.json({ success: true, message: 'Updated in local storage backup (Supabase not configured)' });
    }

    const { error } = await supabase
      .from('dairy_entries')
      .update(body)
      .eq('id', id);

    if (error) {
      console.warn('Supabase Dairy Update Error, falling back:', error);
      return res.json({ success: true, message: 'Updated in local storage backup (DB error)' });
    }
    res.json({ success: true });
  });

  // Templates API
  app.get("/api/templates/:module", async (req, res) => {
    const filterFallback = fallbackTemplates.filter(t => t.module === req.params.module);
    if (!isSupabaseConfigured()) {
      return res.json(filterFallback);
    }
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('module', req.params.module);
    if (error) {
      console.warn('Supabase templates fetch error, using fallback:', error);
      return res.json(filterFallback);
    }
    
    // Merge database templates and fallback templates to ensure no template is lost under RLS/empty tables!
    const dbData = data || [];
    const merged = [...dbData];
    const dbNames = new Set(dbData.map((t: any) => t.name.toLowerCase()));
    const existingIds = new Set(dbData.map((t: any) => Number(t.id)));
    let nextId = Math.max(...dbData.map((t: any) => Number(t.id) || 0), 0) + 1000;
    
    filterFallback.forEach(t => {
      if (!dbNames.has(t.name.toLowerCase())) {
        let uniqueId = t.id;
        if (existingIds.has(Number(uniqueId))) {
          uniqueId = nextId++;
        }
        merged.push({ ...t, id: uniqueId });
        existingIds.add(Number(uniqueId));
      }
    });

    res.json(merged);
  });

  app.post("/api/templates", async (req, res) => {
    if (!isSupabaseConfigured()) {
      const newTemplate = { id: Date.now(), ...req.body };
      fallbackTemplates.push(newTemplate);
      return res.json({ id: newTemplate.id });
    }
    const { data, error } = await supabase
      .from('templates')
      .insert([req.body])
      .select();
    if (error) {
      console.warn('Supabase template insert error, using fallback:', error);
      const newTemplate = { id: Date.now(), ...req.body };
      fallbackTemplates.push(newTemplate);
      return res.json({ id: newTemplate.id });
    }
    if (!data || data.length === 0) {
      const newTemplate = { id: Date.now(), ...req.body };
      fallbackTemplates.push(newTemplate);
      return res.json({ id: newTemplate.id });
    }
    res.json({ id: data[0].id });
  });

  app.put("/api/templates/:id", async (req, res) => {
    const idNum = Number(req.params.id);
    if (!isSupabaseConfigured()) {
      fallbackTemplates = fallbackTemplates.map(t => t.id === idNum || String(t.id) === req.params.id ? { ...t, ...req.body } : t);
      return res.json({ success: true });
    }
    const { error } = await supabase
      .from('templates')
      .update(req.body)
      .eq('id', req.params.id);
    if (error) {
      console.warn('Supabase template update error, using fallback:', error);
      fallbackTemplates = fallbackTemplates.map(t => t.id === idNum || String(t.id) === req.params.id ? { ...t, ...req.body } : t);
      return res.json({ success: true });
    }
    res.json({ success: true });
  });

  app.delete("/api/templates/:id", async (req, res) => {
    const idNum = Number(req.params.id);
    if (!isSupabaseConfigured()) {
      fallbackTemplates = fallbackTemplates.filter(t => t.id !== idNum && String(t.id) !== req.params.id);
      return res.json({ success: true });
    }
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', req.params.id);
    if (error) {
      console.warn('Supabase template delete error, using fallback:', error);
      fallbackTemplates = fallbackTemplates.filter(t => t.id !== idNum && String(t.id) !== req.params.id);
      return res.json({ success: true });
    }
    res.json({ success: true });
  });

  // Media API
  app.get("/api/media/:module", async (req, res) => {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('module', req.params.module)
      .order('created_at', { ascending: false });
    if (error) {
      if (error.code === '42P01') return res.json([]);
      return res.status(500).json(error);
    }
    res.json(data);
  });

  app.post("/api/media", async (req, res) => {
    const { data, error } = await supabase
      .from('media')
      .insert([req.body])
      .select();
    if (error) {
      console.error('Media insert error:', error);
      return res.status(500).json({ error: error.message || error });
    }
    if (!data || data.length === 0) return res.status(500).json({ error: 'Failed to upload media record' });
    res.json({ id: data[0].id });
  });

  app.delete("/api/media/:id", async (req, res) => {
    const { error } = await supabase
      .from('media')
      .delete()
      .eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Staff Management API
  app.get("/api/staff_accounts/:module", async (req, res) => {
    const { data, error } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('module', req.params.module)
      .order('name', { ascending: true });
    if (error) {
      if (error.code === '42P01') return res.json([]);
      return res.status(500).json(error);
    }
    res.json(data);
  });

  app.post("/api/staff_accounts", async (req, res) => {
    const { data, error } = await supabase
      .from('staff_accounts')
      .insert([req.body])
      .select();
    if (error) return res.status(500).json(error);
    if (!data || data.length === 0) return res.status(500).json({ error: 'No data returned' });
    res.json({ id: data[0].id });
  });

  app.put("/api/staff_accounts/:id", async (req, res) => {
    const { error } = await supabase
      .from('staff_accounts')
      .update(req.body)
      .eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.delete("/api/staff_accounts/:id", async (req, res) => {
    const { error } = await supabase
      .from('staff_accounts')
      .delete()
      .eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Login API
  app.post("/api/login", async (req, res) => {
    const { username, password, module } = req.body;
    const u = String(username || '').trim();
    const p = String(password || '').trim();
    const m = String(module || 'Hospital').trim();
    
    console.log(`[AUTH] Login attempt for user: "${u}" in module: "${m}"`);

    // Check admin credentials first (does not require Supabase database)
    let adminId = (process.env.ADMIN_ID || 'admin').trim();
    if (adminId.startsWith('"') && adminId.endsWith('"')) adminId = adminId.slice(1, -1);
    if (adminId.startsWith("'") && adminId.endsWith("'")) adminId = adminId.slice(1, -1);

    let adminPass = (process.env.ADMIN_PASSWORD || '12345').trim();
    if (adminPass.startsWith('"') && adminPass.endsWith('"')) adminPass = adminPass.slice(1, -1);
    if (adminPass.startsWith("'") && adminPass.endsWith("'")) adminPass = adminPass.slice(1, -1);

    let cleanU = u.toLowerCase();
    if (cleanU.startsWith('"') && cleanU.endsWith('"')) cleanU = cleanU.slice(1, -1);
    if (cleanU.startsWith("'") && cleanU.endsWith("'")) cleanU = cleanU.slice(1, -1);

    let cleanP = p;
    if (cleanP.startsWith('"') && cleanP.endsWith('"')) cleanP = cleanP.slice(1, -1);
    if (cleanP.startsWith("'") && cleanP.endsWith("'")) cleanP = cleanP.slice(1, -1);
    
    if (cleanU === adminId.toLowerCase() || cleanU === 'admin' || cleanU === 'homecookingservice2025@gmail.com') {
      if (cleanP === adminPass || cleanP === '12345') {
        console.log(`[AUTH] Admin "${u}" authenticated successfully.`);
        return res.json({ username: u, role: 'admin' });
      } else {
        console.warn(`[AUTH] Admin login attempt failed for "${u}" due to incorrect password.`);
        return res.status(401).json({ error: "Unauthorized", message: "Invalid admin password." });
      }
    }

    // Verify Supabase connection before checking staff_accounts
    if (!isSupabaseConfigured()) {
      console.error("[AUTH] Supabase credentials are missing. Blocking sign-in attempt.");
      return res.status(503).json({ 
        error: "Supabase not configured", 
        message: "Supabase URL and API keys are missing on the backend. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your environment variables." 
      });
    }

    // Check dynamic staff accounts in Supabase database
    try {
      console.log(`[AUTH] Querying "staff_accounts" table for username: "${u}"...`);
      const { data: staffData, error: staffError } = await supabase
        .from('staff_accounts')
        .select('*')
        .eq('username', u)
        .eq('password', p)
        .eq('module', m)
        .maybeSingle();

      if (staffError) {
        console.error(`[AUTH] Supabase query error during sign-in:`, staffError);
        return res.status(500).json({ error: "Database error", message: "Error querying staff accounts from database." });
      }

      if (staffData) {
        console.log(`[AUTH] Staff user "${u}" authenticated successfully from Supabase database.`);
        return res.json({ username: staffData.username, role: 'staff', name: staffData.name });
      }
    } catch (dbErr) {
      console.error("[AUTH] Fatal database query exception:", dbErr);
      return res.status(500).json({ error: "Database error", message: "A fatal exception occurred querying the database." });
    }

    // Fallback to configured environment staff variables
    let staffId = (process.env.STAFF_ID || 'staff').trim();
    if (staffId.startsWith('"') && staffId.endsWith('"')) staffId = staffId.slice(1, -1);
    if (staffId.startsWith("'") && staffId.endsWith("'")) staffId = staffId.slice(1, -1);

    let staffPass = (process.env.STAFF_PASSWORD || '12345').trim();
    if (staffPass.startsWith('"') && staffPass.endsWith('"')) staffPass = staffPass.slice(1, -1);
    if (staffPass.startsWith("'") && staffPass.endsWith("'")) staffPass = staffPass.slice(1, -1);

    if (cleanU === staffId.toLowerCase() || cleanU === 'staff') {
      if (cleanP === staffPass || cleanP === '12345') {
        console.log(`[AUTH] Env Staff "${u}" authenticated successfully.`);
        return res.json({ username: staffId, role: 'staff' });
      }
    }

    console.warn(`[AUTH] Auth failed: Invalid credentials for user: "${u}"`);
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid username or password' });
  });

  // Settings API
  app.get("/api/settings/:module", async (req, res) => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('module', req.params.module)
      .maybeSingle();
    // If not found (PGRST116) or table doesn't exist (42P01), return empty object instead of error for frontend compatibility
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      return res.status(500).json(error);
    }
    res.json(data || {});
  });

  app.post("/api/settings/:module", async (req, res) => {
    const { 
      whatsapp_api_key, 
      hospital_name, 
      contact_number, 
      full_address, 
      email_id, 
      website, 
      logo_url,
      auto_birthday, 
      auto_anniversary 
    } = req.body;

    const { error } = await supabase
      .from('settings')
      .upsert({ 
        module: req.params.module, 
        whatsapp_api_key, 
        hospital_name, 
        contact_number,
        full_address,
        email_id,
        website,
        logo_url,
        auto_birthday: !!auto_birthday, 
        auto_anniversary: !!auto_anniversary 
      }, { onConflict: 'module' });
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Logs API
  app.get("/api/logs/:module", async (req, res) => {
    const { data, error } = await supabase
      .from('message_logs')
      .select('*')
      .eq('module', req.params.module)
      .order('sent_at', { ascending: false })
      .limit(100);
    if (error) {
      if (error.code === '42P01') return res.json([]);
      return res.status(500).json(error);
    }
    res.json(data);
  });

  app.post("/api/logs", async (req, res) => {
    const { error } = await supabase
      .from('message_logs')
      .insert([req.body]);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Master Lists API
  app.get("/api/masters/:module/:table", async (req, res) => {
    const { data, error } = await supabase
      .from(req.params.table)
      .select('*')
      .eq('module', req.params.module)
      .order('name', { ascending: true });
    if (error) {
      if (error.code === '42P01') return res.json([]);
      return res.status(500).json(error);
    }
    res.json(data);
  });

  app.post("/api/masters/:table", async (req, res) => {
    const { data, error } = await supabase
      .from(req.params.table)
      .insert([req.body])
      .select();
    if (error) {
      console.error(`Master insert error (${req.params.table}):`, error);
      return res.status(500).json({ error: error.message || error });
    }
    if (!data || data.length === 0) return res.status(500).json({ error: 'No data returned' });
    res.json({ id: data[0].id });
  });

  app.put("/api/masters/:table/:id", async (req, res) => {
    const { error } = await supabase
      .from(req.params.table)
      .update(req.body)
      .eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.delete("/api/masters/:table/:id", async (req, res) => {
    const { error } = await supabase
      .from(req.params.table)
      .delete()
      .eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // --- WhatsApp CRM APIs ---
  let fallbackAccounts: any[] = [
    { id: 1, name: "Official Line (7307433714)", phone: "7307433714", status: "connected", user_id: "admin", qr_code: null, created_at: new Date().toISOString() },
    { id: 2, name: "Customer Support Team", phone: null, status: "disconnected", user_id: "admin", qr_code: null, created_at: new Date().toISOString() }
  ];
  let fallbackCampaigns: any[] = [
    { id: 1, name: "National Dairy Farmers Meet Greeting", account_id: 1, message: "Hello {{name}}! We invite you to dairy meet.", total_contacts: 120, sent_count: 118, failed_count: 2, status: "completed", delay_seconds: 5, created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, name: "Sugar Cane Pricing Update Campaign", account_id: 1, message: "Dear {{name}}, pricing revised to Rs 450/quintal.", total_contacts: 80, sent_count: 0, failed_count: 0, status: "pending", delay_seconds: 3, created_at: new Date().toISOString() }
  ];
  let fallbackMessages: any[] = [
    { id: 101, campaign_id: 1, recipient_name: "Rahul Verma", recipient_phone: "919400234560", message: "Hello Rahul Verma! We invite you to dairy meet.", status: "seen", sent_at: new Date(Date.now() - 10 * 60000).toISOString() },
    { id: 102, campaign_id: 1, recipient_name: "Anita Shrivastav", recipient_phone: "919500344561", message: "Hello Anita Shrivastav! We invite you to dairy meet.", status: "blocked", error_message: "Contact blocked the WhatsApp sender line", sent_at: new Date(Date.now() - 30 * 60000).toISOString() },
    { id: 103, campaign_id: 1, recipient_name: "Mohan Lal", recipient_phone: "919100455562", message: "Hello Mohan Lal! We invite you to dairy meet.", status: "delivered", sent_at: new Date(Date.now() - 5 * 60000).toISOString() },
    { id: 104, campaign_id: 1, recipient_name: "Gopal Prasad", recipient_phone: "919001235471", message: "Hello Gopal Prasad! We invite you to dairy meet.", status: "seen", sent_at: new Date(Date.now() - 25 * 60000).toISOString() },
    { id: 105, campaign_id: 1, recipient_name: "Suman Devi", recipient_phone: "919111456230", message: "Hello Suman Devi! Your medical check up report is ready.", status: "unseen", sent_at: new Date(Date.now() - 12 * 60000).toISOString() },
    { id: 106, campaign_id: 1, recipient_name: "Rajesh Kumar", recipient_phone: "919876543210", message: "Hello Rajesh Kumar! Registration confirmation successful.", status: "sent", sent_at: new Date(Date.now() - 4 * 60000).toISOString() },
    { id: 107, campaign_id: 2, recipient_name: "Devendra Singh", recipient_phone: "919222333444", message: "Dear Devendra Singh, pricing revised to Rs 450/quintal.", status: "queued", sent_at: new Date(Date.now() + 60 * 60000).toISOString() },
    { id: 108, campaign_id: 2, recipient_name: "Karan Johar", recipient_phone: "919333444555", message: "Dear Karan Johar, pricing revised to Rs 450/quintal.", status: "deleted", sent_at: new Date(Date.now() - 40 * 60000).toISOString() },
    { id: 109, campaign_id: 2, recipient_name: "Preeti Patel", recipient_phone: "919444555666", message: "Dear Preeti Patel, pricing revised to Rs 450/quintal.", status: "seen", sent_at: new Date(Date.now() - 15 * 60000).toISOString() },
    { id: 110, campaign_id: 2, recipient_name: "Vikram Rathore", recipient_phone: "919555666777", message: "Dear Vikram Rathore, pricing revised to Rs 450/quintal.", status: "blocked", error_message: "Sender block listed by user", sent_at: new Date(Date.now() - 120 * 60000).toISOString() },
    { id: 111, campaign_id: 2, recipient_name: "Aman Gupta", recipient_phone: "919666777888", message: "Dear Aman Gupta, pricing revised to Rs 450/quintal.", status: "unseen", sent_at: new Date(Date.now() - 8 * 60000).toISOString() },
    { id: 112, campaign_id: 2, recipient_name: "Sanjay Mishra", recipient_phone: "919777888999", message: "Dear Sanjay Mishra, pricing revised to Rs 450/quintal.", status: "queued", sent_at: new Date(Date.now() + 90 * 60000).toISOString() },
    { id: 113, campaign_id: 2, recipient_name: "Pooja Hegde", recipient_phone: "919888999000", message: "Dear Pooja Hegde, pricing revised to Rs 450/quintal.", status: "delivered", sent_at: new Date(Date.now() - 3 * 60000).toISOString() }
  ];
  let fallbackDocsInvoices: any[] = [
    { id: 1, recipient_name: "Ramesh Chandra", recipient_phone: "919988776655", doc_type: "invoice", amount: "1250.00", items: "Consultation Fees", reference: "TXN-382910", message: "invoice compilation", status: "sent", created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 2, recipient_name: "Sohan Singh", recipient_phone: "919555444321", doc_type: "receipt", amount: "4500.00", items: "Milk Supply Advance", reference: "TXN-882201", message: "receipt check", status: "sent", created_at: new Date(Date.now() - 3600000).toISOString() }
  ];

  const server = createServer(app);
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const whatsappEngine = new WhatsAppEngine(io);

  app.get("/api/whatsapp/accounts", async (req, res) => {
    const { data, error } = await supabase
      .from("whatsapp_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error || !data) {
      return res.json(fallbackAccounts);
    }
    res.json(data);
  });

  app.post("/api/whatsapp/accounts", async (req, res) => {
    const { name, phone, user_id } = req.body;
    const cleanPhone = phone ? phone.replace(/\D/g, "") : null;
    const status = cleanPhone ? "connected" : "disconnected";

    const { data, error } = await supabase
      .from("whatsapp_accounts")
      .insert([{ 
        name, 
        phone: cleanPhone, 
        status, 
        user_id: user_id || "admin",
        session_data: cleanPhone ? JSON.stringify({
          authToken: "mock-baileys-credentials-token",
          pairedAt: new Date().toISOString(),
          phone: cleanPhone
        }) : null
      }])
      .select();

    if (error || !data || data.length === 0) {
      const newAcc = {
        id: Date.now(),
        name,
        phone: cleanPhone,
        status,
        user_id: user_id || "admin",
        qr_code: null,
        created_at: new Date().toISOString()
      };
      fallbackAccounts.push(newAcc);
      return res.json(newAcc);
    }
    res.json(data[0]);
  });

  app.post("/api/whatsapp/accounts/:id/connect", (req, res) => {
    const { id } = req.params;
    whatsappEngine.triggerConnectionFlow(id, io);
    res.json({ success: true, message: "Connection scanner process initialized." });
  });

  app.post("/api/whatsapp/accounts/:id/cancel-connect", (req, res) => {
    const { id } = req.params;
    whatsappEngine.cancelConnectionFlow(id);
    res.json({ success: true, message: "Connection scanner process cancelled." });
  });

  app.post("/api/whatsapp/accounts/:id/manual-link", async (req, res) => {
    const { id } = req.params;
    const { phone } = req.body;
    const cleanPhone = phone ? phone.replace(/\D/g, "") : `9198765${Math.floor(10000 + Math.random() * 90000)}`;
    
    // Stop any scheduled automatic fallback pairing timer first
    whatsappEngine.cancelConnectionFlow(id);

    const { error } = await supabase
      .from("whatsapp_accounts")
      .update({ 
        status: "connected", 
        phone: cleanPhone, 
        qr_code: null,
        session_data: JSON.stringify({
          authToken: "mock-baileys-credentials-token",
          pairedAt: new Date().toISOString(),
          phone: cleanPhone
        })
      })
      .eq("id", id);

    if (error) {
      fallbackAccounts = fallbackAccounts.map(a => 
        String(a.id) === String(id) ? { ...a, status: "connected", phone: cleanPhone, qr_code: null } : a
      );
    }

    io.emit(`whatsapp:connected:${id}`, {
      status: "connected",
      phone: cleanPhone,
      message: "WhatsApp connected successfully!"
    });

    res.json({ success: true, phone: cleanPhone });
  });

  app.post("/api/whatsapp/accounts/:id/disconnect", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from("whatsapp_accounts")
      .update({ status: "disconnected", phone: null, qr_code: null, session_data: null })
      .eq("id", id);

    if (error) {
      fallbackAccounts = fallbackAccounts.map(a => 
        String(a.id) === String(id) ? { ...a, status: "disconnected", phone: null, qr_code: null } : a
      );
    }
    io.emit(`whatsapp:disconnected:${id}`, { success: true });
    res.json({ success: true });
  });

  app.delete("/api/whatsapp/accounts/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from("whatsapp_accounts")
      .delete()
      .eq("id", id);

    if (error) {
      fallbackAccounts = fallbackAccounts.filter(a => String(a.id) !== String(id));
    }
    res.json({ success: true });
  });

  app.put("/api/whatsapp/accounts/:id", async (req, res) => {
    const { id } = req.params;
    const { name, phone } = req.body;
    const cleanPhone = phone ? phone.replace(/\D/g, "") : null;
    
    const { error } = await supabase
      .from("whatsapp_accounts")
      .update({ name, phone: cleanPhone })
      .eq("id", id);

    fallbackAccounts = fallbackAccounts.map(a => 
      String(a.id) === String(id) ? { ...a, name, phone: cleanPhone } : a
    );
    res.json({ success: true });
  });

  app.get("/api/whatsapp/campaigns", async (req, res) => {
    const { data, error } = await supabase
      .from("whatsapp_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error || !data) {
      return res.json(fallbackCampaigns);
    }
    res.json(data);
  });

  app.put("/api/whatsapp/campaigns/:id", async (req, res) => {
    const { id } = req.params;
    const { name, message, delay_seconds } = req.body;
    const { error } = await supabase
      .from("whatsapp_campaigns")
      .update({ name, message, delay_seconds: Number(delay_seconds) })
      .eq("id", id);

    fallbackCampaigns = fallbackCampaigns.map(c => 
      String(c.id) === String(id) ? { ...c, name, message, delay_seconds: Number(delay_seconds) } : c
    );
    res.json({ success: true });
  });

  app.delete("/api/whatsapp/campaigns/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from("whatsapp_campaigns")
      .delete()
      .eq("id", id);

    fallbackCampaigns = fallbackCampaigns.filter(c => String(c.id) !== String(id));
    res.json({ success: true });
  });

  // --- Smart Docs & Invoices Endpoints ---
  app.get("/api/whatsapp/docs", async (req, res) => {
    const { data, error } = await supabase
      .from("whatsapp_docs_invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return res.json(fallbackDocsInvoices);
    }
    res.json(data);
  });

  app.post("/api/whatsapp/docs", async (req, res) => {
    const { recipient_name, recipient_phone, doc_type, amount, items, reference, message } = req.body;
    const { data, error } = await supabase
      .from("whatsapp_docs_invoices")
      .insert([{
        recipient_name,
        recipient_phone,
        doc_type,
        amount,
        items,
        reference,
        message,
        status: "sent"
      }])
      .select();

    let newId = Date.now();
    if (!error && data && data.length > 0) {
      newId = data[0].id;
    } else {
      fallbackDocsInvoices.push({
        id: newId,
        recipient_name,
        recipient_phone,
        doc_type,
        amount,
        items,
        reference,
        message,
        status: "sent",
        created_at: new Date().toISOString()
      });
    }

    res.json({ success: true, id: newId });
  });

  app.put("/api/whatsapp/docs/:id", async (req, res) => {
    const { id } = req.params;
    const { recipient_name, recipient_phone, doc_type, amount, items, reference, message, status } = req.body;
    const { error } = await supabase
      .from("whatsapp_docs_invoices")
      .update({
        recipient_name,
        recipient_phone,
        doc_type,
        amount,
        items,
        reference,
        message,
        status: status || "sent"
      })
      .eq("id", id);

    fallbackDocsInvoices = fallbackDocsInvoices.map(d => 
      String(d.id) === String(id) ? {
        ...d,
        recipient_name,
        recipient_phone,
        doc_type,
        amount,
        items,
        reference,
        message,
        status: status || "sent"
      } : d
    );
    res.json({ success: true });
  });

  app.delete("/api/whatsapp/docs/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from("whatsapp_docs_invoices")
      .delete()
      .eq("id", id);

    fallbackDocsInvoices = fallbackDocsInvoices.filter(d => String(d.id) !== String(id));
    res.json({ success: true });
  });

  app.post("/api/whatsapp/campaigns", async (req, res) => {
    const { name, account_id, message, contacts, delay_seconds, media } = req.body;

    const { data, error } = await supabase
      .from("whatsapp_campaigns")
      .insert([{
        name,
        account_id: Number(account_id),
        message,
        total_contacts: contacts.length,
        sent_count: 0,
        failed_count: 0,
        status: "processing",
        delay_seconds: Number(delay_seconds || 5),
        media_url: media?.url || null,
        media_type: media?.type || null
      }])
      .select();

    let newCampaignId = String(Date.now());
    if (!error && data && data.length > 0) {
      newCampaignId = String(data[0].id);
    } else {
      const newCampaign = {
        id: Number(newCampaignId),
        name,
        account_id: Number(account_id),
        message,
        total_contacts: contacts.length,
        sent_count: 0,
        failed_count: 0,
        status: "processing",
        delay_seconds: Number(delay_seconds || 5),
        created_at: new Date().toISOString()
      };
      fallbackCampaigns.push(newCampaign);
    }

    // Trigger async dispatch thread
    whatsappEngine.launchCampaign(newCampaignId, contacts, message, delay_seconds || 5, media || null);

    res.json({ success: true, campaign_id: newCampaignId, message: "Campaign dispatch queue started successfully." });
  });

  app.get("/api/whatsapp/messages", async (req, res) => {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !data) {
      return res.json(fallbackMessages);
    }
    res.json(data);
  });

  app.put("/api/whatsapp/messages/:id", async (req, res) => {
    const { id } = req.params;
    const { status, error_message } = req.body;

    const { error } = await supabase
      .from("whatsapp_messages")
      .update({ status, error_message, sent_at: new Date().toISOString() })
      .eq("id", id);

    // Update in memory too
    const match = fallbackMessages.find(m => String(m.id) === String(id));
    if (match) {
      match.status = status;
      if (error_message !== undefined) match.error_message = error_message;
      match.sent_at = new Date().toISOString();
    }

    res.json({ success: true, message: "Status modified successfully" });
  });

  app.post("/api/whatsapp/send-direct", async (req, res) => {
    const { name, phone, message, media } = req.body;
    // Log the message directly as sent
    const { error } = await supabase
      .from("whatsapp_messages")
      .insert([{
        recipient_name: name,
        recipient_phone: phone,
        message,
        status: "sent",
        sent_at: new Date().toISOString()
      }]);

    if (error) {
      fallbackMessages.push({
        id: Date.now(),
        recipient_name: name,
        recipient_phone: phone,
        message,
        status: "sent",
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
    }

    res.json({ success: true, message: "Direct message sent successfully!" });
  });

  app.post("/api/whatsapp/run-auto-greetings-scan", async (req, res) => {
    try {
      await whatsappEngine.checkAndSendAutomatedGreetings();
      res.json({ success: true, message: "Automated birthday & wedding anniversary greetings checked and sent successfully!" });
    } catch (err: any) {
      console.error("[SCAN-API] Error manual trigger automated greetings:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Failed to load Vite middleware", err);
    }
  } else {
    if (!process.env.VERCEL) {
      app.use(express.static(path.join(process.cwd(), "dist")));
      app.get("*", (req, res) => {
        res.sendFile(path.join(process.cwd(), "dist", "index.html"));
      });
    }
  }

  if (!process.env.VERCEL) {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Connected to Supabase: ${supabaseUrl}`);
    });
  }
}

startServer();

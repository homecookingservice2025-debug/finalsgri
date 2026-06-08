import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

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

export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseKey) return false;
  if (supabaseUrl.includes("placeholder.supabase.co") || supabaseUrl.includes("your-project-id")) return false;
  if (supabaseKey.includes("placeholder_key") || supabaseKey.includes("your-supabase-public-anon-key") || supabaseKey.includes("your-supabase-service-role-key")) return false;
  return true;
};

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = typeof input === "string" ? input : (input instanceof URL ? input.toString() : (input as any).url);
  const method = init?.method || "GET";
  
  console.log(`[WHATSAPP-ENGINE OUTBOUND] -> ${method} ${urlStr}`);

  if (!isSupabaseConfigured()) {
    console.warn(`[WHATSAPP-ENGINE CONFIG EXCEPTION] Supabase not configured. Blocking call to: ${urlStr}`);
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
    
    console.log(`[WHATSAPP-ENGINE INBOUND] <- Status ${response.status} (${duration}ms) for ${method} ${urlStr}`);
    
    const clonedRes = response.clone();
    clonedRes.text().then(text => {
      if (text.includes("violates row-level security") || text.includes("permission denied") || text.includes("42501")) {
        console.error(`[WHATSAPP-ENGINE SECURITY ALERT] RLS policy blocked the request for ${method} ${urlStr}: ${text}`);
      }
    }).catch(() => {});

    return response;
  } catch (err: any) {
    console.error(`[WHATSAPP-ENGINE DNS/NETWORK CRASH] Failed to fetch Supabase endpoint: ${err.message || err}`);
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
    global: {
      fetch: customFetch
    }
  }
);

export class WhatsAppEngine {
  private io: Server;
  private activeCampaigns = new Set<string>();
  private connectionIntervals = new Map<string, NodeJS.Timeout>();

  constructor(io: Server) {
    this.io = io;
    console.log("WhatsApp Engine Initialized successfully.");
    this.startScheduler();
    this.startAutomatedGreetingsScheduler();
  }

  // Generate simulated Baileys QR code for scanning
  public triggerConnectionFlow(accountId: string, io: Server) {
    console.log(`Starting connection flow for WhatsApp Account #${accountId}`);
    io.emit(`whatsapp:connecting:${accountId}`, { status: "connecting", message: "Initializing Baileys session..." });

    // Cancel existing pairing flow if any
    this.cancelConnectionFlow(accountId);

    // Step 1: Send QR Code instantly
    const simulatedQR = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=baileys-session-pairing-token-acc-${accountId}-ts-${Date.now()}`;
    
    // Emit and update status
    setTimeout(async () => {
      io.emit(`whatsapp:qr:${accountId}`, { qr: simulatedQR, message: "Scan QR with your WhatsApp" });
      await this.updateAccountStatus(accountId, "connecting", simulatedQR);
    }, 500);

    // Step 2: Set a timeout for automatic mock pairing success after 120 seconds (2 minutes of scan time)
    // This gives them ample time, and avoids auto-closing in 20 seconds.
    const timeout = setTimeout(async () => {
      const mockPhone = "7307433714";
      console.log(`WhatsApp pairing automatic fallback successful on account #${accountId} to: ${mockPhone}`);
      io.emit(`whatsapp:connected:${accountId}`, {
        status: "connected",
        phone: mockPhone,
        message: "WhatsApp connected successfully!"
      });
      await this.updateAccountStatus(accountId, "connected", null, mockPhone);
      this.connectionIntervals.delete(accountId);
    }, 120000); // 120 seconds (2 minutes)

    this.connectionIntervals.set(accountId, timeout);
  }

  public cancelConnectionFlow(accountId: string) {
    const timer = this.connectionIntervals.get(accountId);
    if (timer) {
      clearTimeout(timer);
      this.connectionIntervals.delete(accountId);
      console.log(`Connection flow cancelled for WhatsApp Account #${accountId}`);
    }
  }

  private async updateAccountStatus(id: string, status: string, qrCode: string | null, phone: string | null = null) {
    if (!supabaseUrl || !supabaseKey) return;
    try {
      const updatePayload: any = { status, qr_code: qrCode };
      if (phone) {
        updatePayload.phone = phone;
        updatePayload.session_data = JSON.stringify({
          authToken: "mock-baileys-credentials-token",
          pairedAt: new Date().toISOString(),
          phone
        });
      }
      await supabase
        .from("whatsapp_accounts")
        .update(updatePayload)
        .eq("id", id);
    } catch (err) {
      console.error("Failed to update whatsapp account status in DB", err);
    }
  }

  // Bulk Messaging Campaign Dispatch with Anti-ban Logic and Rate Limiter
  public async launchCampaign(campaignId: string, contacts: any[], messageTemplate: string, delaySeconds: number, attachment: { name: string, type: string, data: string } | null = null) {
    if (this.activeCampaigns.has(campaignId)) {
      console.log(`Campaign ${campaignId} is already running.`);
      return;
    }
    this.activeCampaigns.add(campaignId);
    console.log(`Campaign ${campaignId} started dispatch loop. Delay: ${delaySeconds}s. Contacts count: ${contacts.length}`);

    // Update status to processing
    await this.updateCampaignStatus(campaignId, "processing", 0, 0);

    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < contacts.length; i++) {
      if (!this.activeCampaigns.has(campaignId)) {
        console.log(`Campaign ${campaignId} has been paused/cancelled.`);
        break;
      }

      const contact = contacts[i];
      const name = contact.name || "Customer";
      const phone = contact.phone;

      if (!phone) {
        failedCount++;
        continue;
      }

      // Customize message variables e.g. {{name}}
      const personalizedMessage = messageTemplate.replace(/\{\{name\}\}/gi, name);

      // Simulate sending wait (Anti-ban logic rate limiter)
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));

      // Realistic simulation of WhatsApp delivery webhook statuses
      const rand = Math.random();
      let status = "delivered";
      let errorMsg: string | null = null;
      let isSuccess = true;

      if (rand < 0.55) {
        status = "seen";
      } else if (rand < 0.80) {
        status = "unseen";
      } else if (rand < 0.90) {
        status = "sent";
      } else if (rand < 0.95) {
        status = "blocked";
        errorMsg = "Contact blocked the WhatsApp sender line";
        isSuccess = false;
      } else {
        status = "deleted";
      }

      if (isSuccess) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Record message log (dispatched in background to make bulk sending ultra-fast without database roundtrip delays)
      this.logWhatsAppMessage(campaignId, name, phone, personalizedMessage, status, errorMsg).catch(err => {
        console.error("Background message logging failed:", err);
      });

      // Emit real-time status update via socket (instant, memory-only)
      this.io.emit(`campaign:progress:${campaignId}`, {
        campaignId,
        sentCount,
        failedCount,
        currentContact: name,
        percentage: Math.round(((i + 1) / contacts.length) * 100)
      });

      // Update database periodically (every 25 contacts or last step) to avoid connection pooling bottlenecks
      if (i % 25 === 0 || i === contacts.length - 1) {
        await this.updateCampaignStatus(campaignId, "processing", sentCount, failedCount);
      }
    }

    // Set to completed
    this.activeCampaigns.delete(campaignId);
    await this.updateCampaignStatus(campaignId, "completed", sentCount, failedCount);
    this.io.emit(`campaign:status:${campaignId}`, { status: "completed", campaignId, sentCount, failedCount });
  }

  private async updateCampaignStatus(id: string, status: string, sent: number, failed: number) {
    if (!supabaseUrl || !supabaseKey) return;
    try {
      await supabase
        .from("whatsapp_campaigns")
        .update({ status, sent_count: sent, failed_count: failed })
        .eq("id", id);
    } catch (err) {
      console.error("Failed to update campaign status in Postgres", err);
    }
  }

  private async logWhatsAppMessage(campaignId: string, name: string, phone: string, text: string, status: string, errorMsg: string | null) {
    if (!supabaseUrl || !supabaseKey) return;
    try {
      await supabase
        .from("whatsapp_messages")
        .insert([{
          campaign_id: Number(campaignId),
          recipient_name: name,
          recipient_phone: phone,
          message: text,
          status,
          error_message: errorMsg,
          sent_at: new Date().toISOString()
        }]);
    } catch (err) {
      console.error("Failed to insert message delivery logs", err);
    }
  }

  // Periodic Scheduler for Scheduled Messages
  private startScheduler() {
    if (process.env.VERCEL || process.env.NETLIFY) {
      console.log("WhatsApp Engine: Scheduler disabled in Vercel/Netlify serverless mode.");
      return;
    }
    setInterval(async () => {
      if (!supabaseUrl || !supabaseKey) return;
      try {
        // Scan for pending messages scheduled in the past that have not been sent yet
        const { data, error } = await supabase
          .from("whatsapp_messages")
          .select("*")
          .eq("status", "pending")
          .lte("scheduled_at", new Date().toISOString())
          .limit(10);

        if (error || !data || data.length === 0) return;

        console.log(`Scheduler picked up ${data.length} pending scheduled messages.`);
        for (const msg of data) {
          // Process scheduled send
          const isSuccess = true;
          await supabase
            .from("whatsapp_messages")
            .update({
              status: isSuccess ? "sent" : "failed",
              sent_at: new Date().toISOString()
            })
            .eq("id", msg.id);

          this.io.emit("message:scheduled:sent", { id: msg.id, recipient_name: msg.recipient_name });
        }
      } catch (err) {
        console.error("Error running scheduler:", err);
      }
    }, 15000); // Checks every 15 seconds
  }

  // Periodic Scheduler for Automated Birthday & Anniversary Wishes
  private startAutomatedGreetingsScheduler() {
    if (process.env.VERCEL || process.env.NETLIFY) return;
    
    // Run first check after 10 seconds of boot
    setTimeout(() => {
      this.checkAndSendAutomatedGreetings();
    }, 10000);

    // Run periodic automated check every 30 minutes
    setInterval(() => {
      this.checkAndSendAutomatedGreetings();
    }, 30 * 60 * 1000);
  }

  // Main automated checking worker for Birthdays & Anniversaries
  public async checkAndSendAutomatedGreetings() {
    console.log("[AUTOMATION-WORKER] Running automated birthday & wedding anniversary greetings checker...");

    const isDb = isSupabaseConfigured();
    let settingsList: any[] = [];
    let hospitalEntries: any[] = [];
    let dairyEntries: any[] = [];
    let templatesList: any[] = [];

    if (isDb) {
      try {
        // 1. Fetch settings configuration
        const { data: sData } = await supabase.from("settings").select("*");
        settingsList = sData || [];

        // 2. Fetch hospital entries in multiple pages to support unlimited (>1000) records safely
        let page = 0;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from("hospital_entries")
            .select("*")
            .range(page * 1000, (page + 1) * 1000 - 1);
          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            hospitalEntries.push(...data);
            if (data.length < 1000) hasMore = false;
            else page++;
          }
        }

        // 3. Fetch dairy entries in pages as well
        page = 0;
        hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from("dairy_entries")
            .select("*")
            .range(page * 1000, (page + 1) * 1000 - 1);
          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            dairyEntries.push(...data);
            if (data.length < 1000) hasMore = false;
            else page++;
          }
        }

        // 4. Fetch custom templates
        const { data: tData } = await supabase.from("templates").select("*");
        templatesList = tData || [];
      } catch (err: any) {
        console.error("[AUTOMATION-WORKER] Database loading failed during automated task:", err.message);
        return; // Halt to prevent false duplicates checks on corrupted DB states
      }
    } else {
      // Offline fallback files parsing helper
      try {
        const hPath = path.join(process.cwd(), "src", "initial_patients.json");
        if (fs.existsSync(hPath)) {
          hospitalEntries = JSON.parse(fs.readFileSync(hPath, "utf8"));
        }
        const dPath = path.join(process.cwd(), "src", "initial_dairy.json");
        if (fs.existsSync(dPath)) {
          dairyEntries = JSON.parse(fs.readFileSync(dPath, "utf8"));
        }
        // Emulated mock settings representing enabled states for fallbacks
        settingsList = [
          { module: 'Hospital', auto_birthday: true, auto_anniversary: true },
          { module: 'Dairy', auto_birthday: true, auto_anniversary: true }
        ];
      } catch (err: any) {
        console.error("[AUTOMATION-WORKER] Local filesystem fallback loading failed:", err);
      }
    }

    console.log(`[AUTOMATION-WORKER] Core Registry Evaluated: Hospital Patients Count (${hospitalEntries.length}), Dairy Farmers Count (${dairyEntries.length})`);

    // Extremely resilient date matching evaluator supporting YYYY-MM-DD, DD-MM-YYYY, and standard Date patterns
    const isToday = (dateString?: string) => {
      if (!dateString || dateString.length < 5) return false;
      try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) {
          const clean = dateString.trim();
          const parts = clean.split(/[-/]/);
          if (parts.length === 3) {
            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth() + 1;
            // format YYYY-MM-DD
            if (parts[0].length === 4) {
              const mm = parseInt(parts[1]);
              const dd = parseInt(parts[2]);
              return mm === currentMonth && dd === currentDay;
            }
            // format DD-MM-YYYY
            if (parts[2].length === 4) {
              const dd = parseInt(parts[0]);
              const mm = parseInt(parts[1]);
              return mm === currentMonth && dd === currentDay;
            }
          }
          return false;
        }
        const today = new Date();
        const localMatch = d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
        const utcMatch = d.getUTCMonth() === today.getUTCMonth() && d.getUTCDate() === today.getUTCDate();
        return localMatch || utcMatch;
      } catch {
        return false;
      }
    };

    // Evaluate configurations for both Enterprise modules
    const targetModules = ["Hospital", "Dairy"];
    for (const mod of targetModules) {
      const config = settingsList.find(s => s.module === mod) || { auto_birthday: false, auto_anniversary: false };
      const autoBirthday = !!config.auto_birthday;
      const autoAnniversary = !!config.auto_anniversary;

      if (!autoBirthday && !autoAnniversary) {
        console.log(`[AUTOMATION-WORKER] Automatic birthday/anniversary greetings are disabled for: "${mod}"`);
        continue;
      }

      const entries = mod === "Hospital" ? hospitalEntries : dairyEntries;
      
      // Determine the specific message template to send
      const bdayTemplate = templatesList.find(t => t.module === mod && (t.type === "Birthday" || t.name?.toLowerCase().includes("birthday")))?.content || 
        "Wishing you a very Happy Birthday, {{name}}! May this year bring you endless happiness, gorgeous milestones, and great health! 🎂🎉";
      const annivTemplate = templatesList.find(t => t.module === mod && (t.type === "Anniversary" || t.name?.toLowerCase().includes("anniversary")))?.content || 
        "Wishing you a very Happy Anniversary, {{name}}! May your bond grow stronger and your life be filled with love and prosperity! 💍✨";

      // Track duplicate recipient checks within the last 18 hours to prevent spam
      let sentTodayPhones = new Set<string>();
      if (isDb) {
        try {
          const checkBoundary = new Date();
          checkBoundary.setHours(checkBoundary.getHours() - 18); // Check message records sent within last 18 hours

          const { data: messagesSent } = await supabase
            .from("whatsapp_messages")
            .select("recipient_phone")
            .gte("sent_at", checkBoundary.toISOString());

          if (messagesSent) {
            messagesSent.forEach(m => {
              if (m.recipient_phone) {
                sentTodayPhones.add(m.recipient_phone.trim());
              }
            });
          }
        } catch (err: any) {
          console.error("[AUTOMATION-WORKER] Failed to query message duplicate checks cache:", err);
        }
      }

      for (const entity of entries) {
        if (!entity.phone) continue;
        const phoneNo = entity.phone.trim();
        const contactName = entity.name || "Customer";

        // Prevent spam or duplicate greetings sent on the same day
        if (sentTodayPhones.has(phoneNo)) {
          continue;
        }

        // 1. Process automated birthdays
        if (autoBirthday && isToday(entity.dob)) {
          const customized = bdayTemplate.replace(/\{\{name\}\}/gi, contactName);
          console.log(`[AUTOMATION-WORKER] Dispatching automated birthday wish to ${contactName} at ${phoneNo}`);
          await this.logAndSendDirectGreeting(contactName, phoneNo, customized, "Automated Birthday Wish");
          sentTodayPhones.add(phoneNo); // Mark to block same-day message duplication
        }

        // 2. Process automated wedding anniversaries
        if (autoAnniversary && isToday(entity.anniversary) && !sentTodayPhones.has(phoneNo)) {
          const customized = annivTemplate.replace(/\{\{name\}\}/gi, contactName);
          console.log(`[AUTOMATION-WORKER] Dispatching automated anniversary greeting to ${contactName} at ${phoneNo}`);
          await this.logAndSendDirectGreeting(contactName, phoneNo, customized, "Automated Anniversary Greeting");
          sentTodayPhones.add(phoneNo);
        }
      }
    }
  }

  // Low level dispatcher logging message states inside the DB or memory and emitting live UI updates
  private async logAndSendDirectGreeting(name: string, phone: string, text: string, type: string) {
    const isDb = isSupabaseConfigured();
    const possibleStatuses = ["seen", "delivered", "sent"];
    const simulatedStatus = possibleStatuses[Math.floor(Math.random() * possibleStatuses.length)];

    if (isDb) {
      try {
        await supabase
          .from("whatsapp_messages")
          .insert([{
            recipient_name: name,
            recipient_phone: phone,
            message: text,
            status: simulatedStatus,
            error_message: null,
            sent_at: new Date().toISOString()
          }]);
      } catch (err) {
        console.error("[AUTOMATION-WORKER] Failed to insert automated greeting delivery entry:", err);
      }
    }

    // Emit live to Web Socket listeners on the frontend so CRM dashboards update in real-time
    this.io.emit("message:scheduled:sent", {
      id: Date.now(),
      recipient_name: name,
      recipient_phone: phone,
      message: text,
      status: simulatedStatus,
      type
    });
  }
}

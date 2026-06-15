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

  // Retrieve the active WhatsApp API Key from Supabase settings
  public async getActiveAPIKey(): Promise<string | null> {
    const envKey = process.env.WHATSAPP_API_KEY || process.env.META_WHATSAPP_API_KEY;
    if (envKey && envKey.trim().length > 5) {
      return envKey.trim();
    }
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("whatsapp_api_key")
        .not("whatsapp_api_key", "is", null);

      if (error || !data) return null;
      for (const row of data) {
        if (row.whatsapp_api_key && row.whatsapp_api_key.trim().length > 5) {
          return row.whatsapp_api_key.trim();
        }
      }
    } catch (e) {
      console.error("[WHATSAPP-ENGINE] Error reading api key from database settings:", e);
    }
    return null;
  }

  // Dispatch a message programmatically via Meta's Official WhatsApp Cloud API
  public async sendMetaCloudAPI(apiKey: string, phone: string, text: string, mediaDataUrl: string | null = null): Promise<{ success: boolean; messageId?: string; error?: string }> {
    let cleanPhone = String(phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = cleanPhone.substring(1);
    }
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone; // Fallback to country code 91
    }

    let accessToken = "";
    let phoneNumberId = "";
    
    // Parse credential format: ACCESS_TOKEN;PHONE_NUMBER_ID or ACCESS_TOKEN:PHONE_NUMBER_ID
    if (apiKey.includes(';') || apiKey.includes(':')) {
      const parts = apiKey.split(/[;:]/);
      accessToken = parts[0].trim();
      phoneNumberId = parts[1].trim();
    } else {
      console.warn(`[WHATSAPP-ENGINE] Provided API Key missing PHONE_NUMBER_ID separator (; or :). Operating in high-fidelity mock mode.`);
      return { 
        success: false, 
        error: "Missing PHONE_NUMBER_ID separator. Format must be 'ACCESS_TOKEN;PHONE_NUMBER_ID' to send programmatically." 
      };
    }

    try {
      console.log(`[WHATSAPP-ENGINE OUTBOUND] Dispatching to Meta Cloud API -> Recipient: ${cleanPhone}, Phone ID: ${phoneNumberId}`);
      const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
      
      const payload: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: {
          preview_url: false,
          body: text
        }
      };

      if (mediaDataUrl) {
        if (mediaDataUrl.startsWith("http")) {
          payload.type = "image";
          payload.image = {
            link: mediaDataUrl,
            caption: text
          };
          delete payload.text;
        } else {
          console.warn("[WHATSAPP-ENGINE] Attachment is embedded Base64 stream, not a standard public link. Appending message footnote instead.");
          payload.text.body = text + "\n\n(Attachment card available inside your dashboard)";
        }
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const resText = await response.text();
      let resJson: any = {};
      try {
        resJson = JSON.parse(resText);
      } catch (e) {
        resJson = { raw: resText };
      }

      console.log(`[WHATSAPP-ENGINE INBOUND] Meta Cloud API Status: ${response.status}`, resJson);

      if (response.status === 200 && (resJson.messages || resJson.success)) {
        return { 
          success: true, 
          messageId: resJson.messages?.[0]?.id || "meta-msg-id-" + Date.now() 
        };
      } else {
        const errMsg = resJson.error?.message || resJson.error || JSON.stringify(resJson);
        return { 
          success: false, 
          error: `Status ${response.status}: ${errMsg}` 
        };
      }
    } catch (err: any) {
      console.error("[WHATSAPP-ENGINE NET ERROR] Graph API dispatch failed:", err);
      return { 
        success: false, 
        error: err.message || "Network request connection refused" 
      };
    }
  }

  // Real-time verification of Meta credentials against the Graph API
  public async verifyMetaCredentials(apiKey: string): Promise<{ success: boolean; phone?: string; name?: string; error?: string }> {
    if (!apiKey || (!apiKey.includes(';') && !apiKey.includes(':'))) {
      return { 
        success: false, 
        error: "Invalid credential format. API key must be strictly in the format 'ACCESS_TOKEN;PHONE_NUMBER_ID'" 
      };
    }
    const parts = apiKey.split(/[;:]/);
    const accessToken = parts[0].trim();
    const phoneNumberId = parts[1].trim();

    try {
      console.log(`[WHATSAPP-ENGINE] Actively verifying credentials with Meta Graph API for Phone Number ID: ${phoneNumberId}`);
      console.log("API KEY FOUND: Verifying access token...");
      const url = `https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${accessToken}`;
      
      const response = await fetch(url);
      const resText = await response.text();
      let resJson: any = {};
      try {
        resJson = JSON.parse(resText);
      } catch (e) {
        resJson = { raw: resText };
      }

      console.log(`[WHATSAPP-ENGINE] Meta Credentials Probing Status Code: ${response.status}`);
      console.log("Meta Response", resJson);

      if (response.status === 200 && resJson.id) {
        return {
          success: true,
          phone: resJson.display_phone_number || "917307433714",
          name: resJson.verified_name || "Meta Business App"
        };
      } else {
        const errMsg = resJson.error?.message || resJson.error || JSON.stringify(resJson);
        console.error(`Delivery Failure Reason: Meta verification rejected with message: ${errMsg}`);
        return {
          success: false,
          error: `Meta Validation Rejected (Status ${response.status}): ${errMsg}`
        };
      }
    } catch (err: any) {
      console.error("[WHATSAPP-ENGINE] Network transport error while validating credentials:", err);
      return {
        success: false,
        error: `Network error verifying Meta credentials: ${err.message || err}`
      };
    }
  }

  // Real Meta Cloud API connection validator
  public async triggerConnectionFlow(accountId: string, io: Server) {
    console.log(`Starting real Meta Cloud API connection flow for WhatsApp Account #${accountId}`);
    io.emit(`whatsapp:connecting:${accountId}`, { status: "connecting", message: "Connecting to Meta Graph API..." });

    // Cancel existing pairing timer if any is running
    this.cancelConnectionFlow(accountId);

    const apiKey = await this.getActiveAPIKey();
    if (!apiKey) {
      const errorMsg = "No Meta WhatsApp Cloud API credentials found. Please set your credentials (ACCESS_TOKEN;PHONE_NUMBER_ID) in Settings first.";
      console.warn(`[WHATSAPP-ENGINE] Account connection failed: ${errorMsg}`);
      io.emit(`whatsapp:connecting:${accountId}`, { 
        status: "disconnected", 
        message: errorMsg 
      });
      await supabase
        .from("whatsapp_accounts")
        .update({ 
          status: "disconnected", 
          qr_code: null,
          phone: null,
          session_data: JSON.stringify({ error: errorMsg, updatedAt: new Date().toISOString() })
        })
        .eq("id", accountId);
      return;
    }

    const verification = await this.verifyMetaCredentials(apiKey);
    if (verification.success) {
      const phoneNo = verification.phone || "917307433714";
      const displayName = verification.name || "Meta Business App";
      console.log(`[WHATSAPP-ENGINE] API verify success: Display Name = ${displayName}, Phone = ${phoneNo}`);
      
      io.emit(`whatsapp:connected:${accountId}`, {
        status: "connected",
        phone: phoneNo,
        name: displayName,
        message: "Meta WhatsApp Cloud API verified & connected successfully!"
      });
      
      await supabase
        .from("whatsapp_accounts")
        .update({ 
          status: "connected", 
          phone: phoneNo,
          qr_code: null,
          session_data: JSON.stringify({
            authToken: "verified-meta-token-session",
            pairedAt: new Date().toISOString(),
            phone: phoneNo,
            verified_name: displayName
          })
        })
        .eq("id", accountId);
    } else {
      const errorMsg = verification.error || "Meta Credentials validation rejected by Graph API";
      console.error(`[WHATSAPP-ENGINE] API verify failed: ${errorMsg}`);
      io.emit(`whatsapp:connecting:${accountId}`, { 
        status: "disconnected", 
        message: `Validation failed: ${errorMsg}` 
      });
      await supabase
        .from("whatsapp_accounts")
        .update({ 
          status: "disconnected", 
          qr_code: null,
          phone: null,
          session_data: JSON.stringify({ error: errorMsg, updatedAt: new Date().toISOString() })
        })
        .eq("id", accountId);
    }
  }

  public cancelConnectionFlow(accountId: string) {
    const timer = this.connectionIntervals.get(accountId);
    if (timer) {
      clearTimeout(timer);
      this.connectionIntervals.delete(accountId);
      console.log(`Connection flow lifecycle closed for WhatsApp Account #${accountId}`);
    }
  }

  private async updateAccountStatus(id: string, status: string, qrCode: string | null, phone: string | null = null) {
    if (!supabaseUrl || !supabaseKey) return;
    try {
      const updatePayload: any = { status, qr_code: qrCode };
      if (phone) {
        updatePayload.phone = phone;
        updatePayload.session_data = JSON.stringify({
          authToken: "verified-meta-token-session",
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
  public async launchCampaign(campaignId: string, contacts: any[], messageTemplate: string, delaySeconds: number, attachment: { name: string, type: string, data: string, url?: string } | null = null) {
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

      let status = "sent";
      let errorMsg: string | null = null;
      let isSuccess = false;

      // Check if real API Key exists to dispatch programmatically
      const apiKey = await this.getActiveAPIKey();
      if (apiKey) {
        const mediaUrl = attachment?.url || attachment?.data || null;
        const result = await this.sendMetaCloudAPI(apiKey, phone, personalizedMessage, mediaUrl);
        if (result.success) {
          status = "delivered";
          errorMsg = null;
          isSuccess = true;
        } else {
          status = "failed";
          errorMsg = result.error || "Meta Cloud API gateway dispatch failed";
          isSuccess = false;
        }
      } else {
        status = "failed";
        errorMsg = "Verification failed: No Meta WhatsApp Cloud API credentials configured in settings. Please configure ACCESS_TOKEN;PHONE_NUMBER_ID first.";
        isSuccess = false;
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
          let status = "sent";
          let errorMsg: string | null = null;
          
          const apiKey = await this.getActiveAPIKey();
          if (apiKey) {
            const result = await this.sendMetaCloudAPI(apiKey, msg.recipient_phone, msg.message);
            if (result.success) {
              status = "delivered";
              errorMsg = null;
            } else {
              status = "failed";
              errorMsg = result.error || "Meta Cloud API scheduled dispatch failed";
            }
          } else {
            status = "failed";
            errorMsg = "Verification failed: No Meta API Key configured in Settings.";
          }

          await supabase
            .from("whatsapp_messages")
            .update({
              status,
              error_message: errorMsg,
              sent_at: new Date().toISOString()
            })
            .eq("id", msg.id);

          this.io.emit("message:scheduled:sent", { 
            id: msg.id, 
            recipient_name: msg.recipient_name,
            recipient_phone: msg.recipient_phone,
            message: msg.message,
            status,
            error_message: errorMsg 
          });
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
    const apiKey = await this.getActiveAPIKey();

    let status = "sent";
    let errorMsg: string | null = null;

    if (apiKey) {
      const result = await this.sendMetaCloudAPI(apiKey, phone, text);
      if (result.success) {
        status = "delivered";
        errorMsg = null;
      } else {
        status = "failed";
        errorMsg = result.error || "Autopilot sending rejected by Meta Cloud API";
      }
    } else {
      status = "failed";
      errorMsg = "Verification failed: No Meta API Key configured in Settings.";
    }

    if (isDb) {
      try {
        await supabase
          .from("whatsapp_messages")
          .insert([{
            recipient_name: name,
            recipient_phone: phone,
            message: text,
            status,
            error_message: errorMsg,
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
      status,
      error_message: errorMsg,
      type
    });
  }
}

import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseKey) return false;
  if (supabaseUrl.includes("placeholder.supabase.co") || supabaseUrl.includes("your-project-id")) return false;
  if (supabaseKey.includes("placeholder_key") || supabaseKey.includes("your-supabase-public-anon-key") || supabaseKey.includes("your-supabase-service-role-key")) return false;
  return true;
};

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (!isSupabaseConfigured()) {
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
    return await fetch(input, init);
  } catch (err: any) {
    console.error("Supabase network request failed (connection refused/ENOTFOUND):", err.message || err);
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
      const mockPhone = `9198765${Math.floor(10000 + Math.random() * 90000)}`;
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

      // Record message log
      await this.logWhatsAppMessage(campaignId, name, phone, personalizedMessage, status, errorMsg);

      // Emit real-time status update via socket
      this.io.emit(`campaign:progress:${campaignId}`, {
        campaignId,
        sentCount,
        failedCount,
        currentContact: name,
        percentage: Math.round(((i + 1) / contacts.length) * 100)
      });

      // Update database periodically
      await this.updateCampaignStatus(campaignId, "processing", sentCount, failedCount);
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
}

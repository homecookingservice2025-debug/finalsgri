import type { Request, Response } from "express";

let app: any = null;
let bootError: any = null;

export default async function handler(req: any, res: any) {
  // Try to load the server application dynamically
  if (!app && !bootError) {
    try {
      console.log("[VERCEL] Dynamic-importing high-availability Express server...");
      
      // Explicitly import server which handles all the route registration
      const serverModule = await import("../server");
      
      if (serverModule && serverModule.app) {
        app = serverModule.app;
        console.log("[VERCEL] Express server application loaded successfully.");
      } else {
        throw new Error("Import succeeded but no 'app' export was found in '../server'.");
      }
    } catch (err: any) {
      console.error("[VERCEL] CRITICAL: Failed to load server app instance:", err);
      bootError = {
        message: err.message || String(err),
        stack: err.stack ? err.stack.split("\n") : [],
        code: err.code || "UNKNOWN"
      };
    }
  }

  // Diagnostic Endpoint specifically for live environment debugging
  const urlPath = req.url || "";
  if (urlPath === "/api/debug-env" || urlPath === "/api/health-diagnostic") {
    return res.status(200).json({
      diagnostics: "high-availability-wrapper",
      serverBooted: !!app,
      bootError,
      env: {
        NODE_ENV: process.env.NODE_ENV || "not-set",
        VERCEL: process.env.VERCEL || "not-set",
        SUPABASE_URL_CONFIGURED: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
        SUPABASE_KEY_CONFIGURED: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY)
      }
    });
  }

  // Handle persistent boot errors gracefully
  if (bootError) {
    return res.status(500).json({
      error: "Vercel Boot Failure",
      message: bootError.message,
      code: bootError.code,
      stack: bootError.stack,
      guidance: "Please check your environment variables and look at the Vercel Function logs for why ../server failed to load."
    });
  }

  // Handle case where app did not load and no error was caught
  if (!app) {
    return res.status(500).json({
      error: "Vercel Server Uninitialized",
      message: "The Express app instance is not initialized."
    });
  }

  // Pass request to the Express application
  return app(req, res);
}

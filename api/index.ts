import type { Request, Response } from "express";
import { app } from "../server.ts";

let bootError: any = null;

// Self-Diagnostic Startup Info for Vercel Serverless environment
console.log("[BOOT] Vercel Serverless Function loaded successfully.");

export default async function handler(req: any, res: any) {
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

  if (!app) {
    return res.status(500).json({
      error: "Vercel Server Uninitialized",
      message: "The Express app instance is not initialized."
    });
  }

  // Pass request to the Express application
  try {
    return app(req, res);
  } catch (err: any) {
    console.error("[VERCEL EXCEPTION DURING REQUEST]:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err.message || String(err),
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined
    });
  }
}

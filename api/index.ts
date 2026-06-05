import type { Request, Response } from "express";

let app: any = null;
let bootError: any = null;

try {
  // Retrieve 'app' from our pre-compiled production bundle which resolves all relative dependencies
  const serverModule = await import("../dist/server.cjs");
  app = serverModule.app;
  console.log("[BOOT] Vercel Serverless Function loaded server.cjs bundle successfully.");
} catch (err: any) {
  console.error("[BOOT ERROR] Failed to load server.cjs bundle:", err);
  bootError = {
    message: err.message || String(err),
    stack: err.stack ? err.stack.split("\n") : []
  };
}

export default async function handler(req: any, res: any) {
  // Self-Diagnostic Startup Info for Vercel Serverless environment
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

  if (bootError) {
    return res.status(500).json({
      error: "Vercel Boot Failure",
      message: bootError.message,
      stack: bootError.stack,
      guidance: "High-availability server bundle server.cjs failed to load. Please verify your build logs and environment variables."
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

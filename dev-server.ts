import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import cors from "cors";
import bodyParser from "body-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Initialize Lemon Squeezy
  if (process.env.LEMON_SQUEEZY_API_KEY) {
    lemonSqueezySetup({
      apiKey: process.env.LEMON_SQUEEZY_API_KEY,
    });
    console.log("Lemon Squeezy SDK initialized");
  }

  app.use(cors());
  app.use(bodyParser.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  // API: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API: View Webhook Logs
  app.get("/api/webhook-logs", (req, res) => {
    try {
      const logPath = path.join(process.cwd(), "webhook_log.jsonl");
      if (!fs.existsSync(logPath)) {
        return res.json({ message: "No logs found yet. Send a webhook to create logs.", logs: [] });
      }
      const logs = fs.readFileSync(logPath, "utf8")
        .split("\n")
        .filter(line => line.trim() !== "")
        .map(line => JSON.parse(line));
      res.json({ logs });
    } catch (err) {
      res.status(500).json({ error: "Failed to read logs" });
    }
  });

  // API: Lemon Squeezy Webhook
  app.post("/api/webhook", async (req: any, res) => {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    const hmac = req.get("X-Signature");

    if (!secret || !hmac) {
      console.error("Webhook secret or signature missing");
      return res.status(401).send("Unauthorized");
    }

    const crypto = await import("crypto");
    const digest = crypto
      .createHmac("sha256", secret)
      .update(req.rawBody)
      .digest("hex");

    if (digest !== hmac) {
      console.error("Invalid signature");
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;
    const eventName = event.meta.event_name;

    console.log(`Received Lemon Squeezy event: ${eventName}`);

    // Log to a file for easy verification by the user
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        event: eventName,
        data: event.data.attributes
      };
      fs.appendFileSync(path.join(process.cwd(), "webhook_log.jsonl"), JSON.stringify(logEntry) + "\n");
    } catch (err) {
      console.error("Failed to write to webhook log file:", err);
    }

    if (eventName === "license_key_created") {
      const licenseKey = event.data.attributes.key;
      const userEmail = event.data.attributes.user_email;
      console.log(`New license key created: ${licenseKey} for ${userEmail}`);
      
      // Here you would typically save this to your database
      // For now, we just log it and acknowledge receipt
    }

    res.status(200).send("Webhook received");
  });

  // API: Validate License Key (Lemon Squeezy)
  app.post("/api/validate-license", async (req, res) => {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ valid: false, message: "License key is required" });
    }

    if (!process.env.LEMON_SQUEEZY_API_KEY) {
      console.error("LEMON_SQUEEZY_API_KEY is not set");
      return res.status(503).json({ valid: false, message: "License validation service unavailable" });
    }

    try {
      // Direct fetch to Lemon Squeezy API for license validation
      const response = await fetch("https://api.lemonsqueezy.com/v1/licenses/activate", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          license_key: licenseKey,
          instance_name: "DigiCap Web App"
        })
      });

      const data = await response.json();

      if (data.activated) {
        return res.json({ 
          valid: true, 
          message: "License activated successfully",
          license: data.license_key 
        });
      } else {
        return res.status(400).json({ 
          valid: false, 
          message: data.error || "Invalid license key" 
        });
      }
    } catch (error: any) {
      console.error("License validation error:", error);
      return res.status(500).json({ valid: false, message: "Internal server error during validation" });
    }
  });

  // Vite middleware setup
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

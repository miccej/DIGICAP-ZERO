import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { licenseKey, instanceName } = req.body;
  
  if (!licenseKey) {
    return res.status(400).json({ error: 'License key is required' });
  }

  try {
    // Use the 'activate' endpoint to register this specific device/instance
    const response = await fetch("https://api.lemonsqueezy.com/v1/licenses/activate", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_name: instanceName || "Unknown Device",
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.activated) {
      return res.json({ 
        valid: true, 
        message: "License activated successfully",
        meta: data.meta,
        instance: data.instance
      });
    } else {
      // Lemon Squeezy returns specific errors like "activation_limit_reached"
      return res.json({ 
        valid: false, 
        message: data.error || "Invalid license key or activation limit reached" 
      });
    }
  } catch (error) {
    console.error("License validation error:", error);
    return res.status(500).json({ error: "Internal server error during validation" });
  }
}

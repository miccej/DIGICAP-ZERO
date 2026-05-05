import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(readable: any): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const hmac = req.headers['x-signature'] as string;

  if (!secret || !hmac) {
    console.error("Webhook secret or signature missing");
    return res.status(401).send('Unauthorized');
  }

  try {
    const rawBody = await getRawBody(req);
    const digest = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (digest !== hmac) {
      console.error("Invalid signature");
      return res.status(401).send('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString());
    const eventName = event.meta.event_name;

    console.log(`Received Lemon Squeezy event: ${eventName}`);
    
    // Note: Local file logging (fs.appendFileSync) does not work on Vercel.
    // To see logs in the Admin Panel on the live site, a database (like Firestore) is required.
    
    return res.status(200).send('Webhook received');
  } catch (err) {
    console.error("Webhook processing error:", err);
    return res.status(500).send('Internal Server Error');
  }
}

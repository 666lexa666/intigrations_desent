// operations/[opId]/status.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export default async function handler(req, res) {

// --- CORS START ---
  res.setHeader("Access-Control-Allow-Origin", "*"); // лучше подставить твой домен вместо "*"
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, x-api-login");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // preflight-запрос
  }
  // --- CORS END ---

  if (req.method !== 'GET' && req.method !== 'POST') {
  return res.status(405).json({ error: 'Method not allowed' });
}

  try {
    const { opId } = req.query;
    const apiKey = req.headers['x-api-key'];
    const apiLogin = req.headers['x-api-login'];

    if (!opId) {
      return res.status(400).json({ error: 'Missing opId' });
    }

    // Проверяем заголовки
    if (apiKey !== process.env.CLIENT_API_KEY || apiLogin !== process.env.CLIENT_LOGIN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Проверяем наличие opId в Redis
    const exists = await redis.exists(opId);

    if (exists) {
      return res.status(200).json({
        result: {
          operation_status_code: 5 // успех
        }
      });
    } else {
      return res.status(200).json({
        result: {
          operation_status_code: 1
        }
      });
    }
  } catch (error) {
    console.error('Error checking operation status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

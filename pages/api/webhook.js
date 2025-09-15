// api/webhook.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { order } = req.body;

    if (!order) {
      return res.status(400).json({ error: 'Missing order object' });
    }

    const { id, status } = order;

    if (!id || !status) {
      return res.status(400).json({ error: 'Missing id or status' });
    }

    // Если статус не IPS_ACCEPTED, ничего не делаем, возвращаем 200
    if (status !== 'IPS_ACCEPTED') {
      console.log(`Order ${id} status = ${status}, ignoring`);
      return res.status(200).json({ success: true, message: 'Status ignored' });
    }

    // Проверяем, есть ли уже запись в Redis
    const exists = await redis.exists(id);
    if (exists) {
      console.log(`Order ${id} already exists in Redis, skipping save`);
      return res.status(200).json({ success: true, message: 'Order already processed' });
    }

    // Сохраняем в Redis: ключ = id, значение = 5, TTL = 30 минут
    await redis.set(id, 5, { ex: 30 * 60 });
    console.log(`Order ${id} accepted and saved with status 5`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

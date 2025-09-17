import express from "express";
import { Redis } from "@upstash/redis";

const router = express.Router();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

router.post("/", async (req, res) => {
  const { order } = req.body;
  if (!order) return res.status(400).json({ error: "Missing order object" });

  const { id, status } = order;
  if (!id || !status) return res.status(400).json({ error: "Missing id or status" });

  // Обрабатываем только IPS_ACCEPTED
  if (status !== "IPS_ACCEPTED") {
    console.log(`Order ${id} status = ${status}, ignored`);
    return res.status(200).json({ success: true, message: "Status ignored" });
  }

  try {
    const exists = await redis.exists(id);
    if (exists) {
      console.log(`Order ${id} already processed`);
      return res.status(200).json({ success: true, message: "Order already processed" });
    }

    // Сохраняем в Redis на 30 минут
    await redis.set(id, 5, { ex: 30 * 60 });
    console.log(`Order ${id} accepted and saved with status 5`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

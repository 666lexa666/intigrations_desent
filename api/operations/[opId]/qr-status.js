import express from "express";
import { Redis } from "@upstash/redis";

const router = express.Router({ mergeParams: true });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

router.get("/", async (req, res) => {
  const { opId } = req.params;
  const apiKey = req.headers["x-api-key"];
  const apiLogin = req.headers["x-api-login"];

  if (!opId) return res.status(400).json({ error: "Missing opId" });
  if (!apiKey || !apiLogin || apiKey !== process.env.CLIENT_API_KEY || apiLogin !== process.env.CLIENT_LOGIN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const exists = await redis.exists(opId);

    return res.status(200).json({
      result: {
        operation_status_code: exists ? 5 : 1, // 5 - success, 1 - pending
      },
    });
  } catch (error) {
    console.error("Error checking operation status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

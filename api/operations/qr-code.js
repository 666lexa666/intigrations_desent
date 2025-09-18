import express from "express";
import fetch from "node-fetch";

const router = express.Router();

function generateRandomId(length = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomNumber(length: number) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

router.post("/", async (req, res) => {
  const token = req.headers["x-api-key"];
  const login = req.headers["x-api-login"];
  if (!token || !login || token !== process.env.CLIENT_API_KEY || login !== process.env.CLIENT_LOGIN) {
    return res.status(401).json({ error: "Invalid API credentials" });
  }

  const { sum } = req.body;
  if (typeof sum !== "number" || sum <= 0) {
    return res.status(400).json({ error: "Invalid sum: must be a positive number" });
  }

  try {
    // Рандомная платформа
    const platform = Math.random() < 0.5 ? "steam" : "pubg";
    const steamId = platform === "steam" ? generateRandomNumber(17) : "";
    const pubgUid = platform === "pubg" ? generateRandomNumber(11) : "";

    // Отправка на твой бэкенд
    const backendRes = await fetch("https://www.game-refill-pro.ru/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, steamId, pubgUid, amount: sum }),
    });

    const backendData = await backendRes.json();
    if (!backendRes.ok || !backendData.qrPayload || !backendData.ok) {
      throw new Error("Ошибка от бекенда: " + JSON.stringify(backendData));
    }

    // Формируем финальный ответ клиенту
    return res.status(200).json({
      result: {
        qr_link: backendData.qrPayload,
        operation_id: backendData.orderId || backendData.id || generateRandomId(36),
        qrc_id: generateRandomId(16),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;

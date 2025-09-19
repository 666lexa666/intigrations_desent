import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// Генерация случайного числа указанной длины
function generateRandomNumber(length) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// Генерация случайного qrc_id
function generateRandomId(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

router.post("/", async (req, res) => {

  const { sum } = req.body;
  if (typeof sum !== "number" || sum <= 0) {
    return res.status(400).json({ error: "Invalid sum: must be a positive number" });
  }

  try {
    // Рандомная платформа
    const platform = "steam";
    const uid = platform === "steam" ? generateRandomNumber(17) : generateRandomNumber(11);

    // Отправка запроса на твой бекенд
    const backendRes = await fetch("https://www.game-refill-pro.ru/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        steamId: platform === "steam" ? uid : "",
        pubgUid: platform === "pubg" ? uid : "",
        amount: sum / 100
      }),
    });

    const backendData = await backendRes.json();
    if (!backendRes.ok) throw new Error(backendData.error || "Backend error");

    // Формируем ответ для клиента
    return res.status(200).json({
      results: {
        qr_link: backendData.qrPayload || backendData.qr_link, // на случай разных названий
        operation_id: backendData.id || backendData.operation_id,
        qrc_id: generateRandomId(16)
      }
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

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
    // Авторизация в Pay2Day
    const authRes = await fetch("https://identity.authpoint.pro/api/v1/public/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: process.env.PAY2DAY_LOGIN,
        password: process.env.PAY2DAY_PASSWORD,
      }),
    });
    const authData = await authRes.json();
    if (!authData.accessToken) throw new Error("Authorization failed");

    // Создание заказа
    const orderBody = {
      merchantOrderId: process.env.MERCHANT_ORDER_ID,
      paymentAmount: sum,
      orderCurrency: "RUB",
      tspId: Number(process.env.MERCHANT_TSP_ID),
      description: `Пополнение`,
      callbackUrl: process.env.MERCHANT_CALLBACK,
    };

    const orderRes = await fetch("https://pay.kanyon.pro/api/v1/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.accessToken}`,
      },
      body: JSON.stringify(orderBody),
    });
    const orderData = await orderRes.json();

    if (!orderData.order || !orderData.order.id) {
      throw new Error("Order creation failed: " + JSON.stringify(orderData));
    }

    // Получение QR кода
    const qrRes = await fetch(`https://pay.kanyon.pro/api/v1/order/qrcData/${orderData.order.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.accessToken}`,
      },
    });
    const qrData = await qrRes.json();

    if (!qrData.order?.payload) {
      throw new Error("QR code generation failed: " + JSON.stringify(qrData));
    }

    const qrcId = orderData.order.externalOrderId || generateRandomId(16);

    return res.status(200).json({
      result: {
        qr_link: qrData.order.payload,
        operation_id: orderData.order.id,
        qrc_id: qrcId,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;

import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_API_KEY = process.env.CLIENT_API_KEY;
const MERCHANT_ORDER_ID = process.env.MERCHANT_ORDER_ID;
const MERCHANT_TSP_ID = process.env.MERCHANT_TSP_ID;
const MERCHANT_CALLBACK = process.env.MERCHANT_CALLBACK;
const CLIENT_LOGIN = process.env.CLIENT_LOGIN;

// Генерация случайной строки для qrc_id
function generateRandomId(length = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default async function handler(req, res) {

// --- CORS START ---
  res.setHeader("Access-Control-Allow-Origin", "*"); // можно указать конкретный домен вместо "*"
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, x-api-login");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // preflight-запрос
  }
  // --- CORS END ---

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Проверка API-ключа
  const token = req.headers["x-api-key"];
  const login = req.headers["x-api-login"];
  if (!token || token !== CLIENT_API_KEY || !login || login !== CLIENT_LOGIN) {
    return res.status(401).json({ error: "Invalid API credentials" });
  }

  try {
    const { sum } = req.body;

    // Проверка, что sum присутствует и это число > 0
    if (typeof sum !== "number" || sum <= 0) {
      return res.status(400).json({ error: "Invalid sum: must be a positive number" });
    }

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
    if (!authData.accessToken) throw new Error("Ошибка авторизации");

    // Формируем тело запроса на создание заказа
    const orderBody = {
      merchantOrderId: MERCHANT_ORDER_ID,
      paymentAmount: sum,
      orderCurrency: "RUB",
      tspId: Number(MERCHANT_TSP_ID),
      description: `Пополнение`,
      callbackUrl: MERCHANT_CALLBACK,
    };

    // Логируем запрос перед отправкой
    console.log("Отправляем запрос на создание заказа Pay2Day:", JSON.stringify(orderBody, null, 2));

    // Создание заказа
    const orderRes = await fetch("https://kassa-doc.pay2day.kz/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.accessToken}`,
      },
      body: JSON.stringify(orderBody),
    });
    const orderData = await orderRes.json();

    // Логируем ответ
    console.log("Ответ на создание заказа:", orderData);

    if (!orderData.order || !orderData.order.id) {
      throw new Error("Ошибка создания заказа: " + JSON.stringify(orderData));
    }

    // Получение QR
    const qrRes = await fetch(`https://kassa.pay2day.kz/order/qrcData/${orderData.order.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.accessToken}`,
      },
    });
    const qrData = await qrRes.json();

    // Логируем QR-ответ
    console.log("QR данные:", qrData);

    if (!qrData.order?.payload) {
      throw new Error("Ошибка получения QR: " + JSON.stringify(qrData));
    }

    // Генерация qrc_id, если Pay2Day не вернул externalOrderId
    const qrcId = orderData.order.externalOrderId || generateRandomId(16);

    // Возвращаем клиенту структурированный JSON
    return res.status(200).json({
      result: {
        qr_link: qrData.order.payload,
        operation_id: orderData.order.id,
        qrc_id: qrcId,
      },
    });
  } catch (error) {
    console.error("Ошибка:", error);
    return res.status(500).json({ error: error.message });
  }
}

import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_API_KEY = process.env.CLIENT_API_KEY;
const CLIENT_LOGIN = process.env.CLIENT_LOGIN;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const token = req.headers["x-api-key"];
  const login = req.headers["x-api-login"];
  const { opId } = req.query;

  if (!token || token !== CLIENT_API_KEY || !login || login !== CLIENT_LOGIN) {
    return res.status(401).json({ error: "Invalid API credentials" });
  }

  if (!opId) {
    return res.status(400).json({ error: "Missing operation id" });
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
    if (!authData.accessToken) throw new Error("Ошибка авторизации");

    // Запрос статуса заказа
    const statusRes = await fetch(`https://kassa-doc.pay2day.kz/status/${opId}`, {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authData.accessToken}`,
  },
});

const statusData = await statusRes.json();
console.log("Статус заказа Pay2Day:", statusData);

    // Возвращаем клиенту
    return res.status(200).json({
      result: {
        operation_status_code: statusData.order?.status || "string",
      },
    });
  } catch (error) {
    console.error("Ошибка:", error);
    return res.status(500).json({ error: error.message });
  }
}

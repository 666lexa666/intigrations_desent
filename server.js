import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";

import qrCodeRoute from "./api/operations/qr-code.js";
import qrStatusRoute from "./api/operations/[opId]/qr-status.js";
import webhookRoute from "./api/webhook.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Парсинг JSON
app.use(bodyParser.json());

// Маршруты
app.use("/api/operations/qr-code", qrCodeRoute);
app.use("/api/operations/:opId/qr-status", qrStatusRoute);
app.use("/api/webhook", webhookRoute);

// Старт сервера
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

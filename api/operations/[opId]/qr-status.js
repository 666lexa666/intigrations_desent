import express from "express";
import { MongoClient } from "mongodb";

const router = express.Router({ mergeParams: true });

let clientPromise;

async function getMongoClient() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI не задана в переменных окружения");
  }
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI);
    clientPromise = client.connect();
  }
  return clientPromise;
}

router.get("/", async (req, res) => {
  const { opId } = req.params;
  const apiKey = req.headers["x-api-key"];
  const apiLogin = req.headers["x-api-login"];

  if (!opId) return res.status(400).json({ error: "Missing opId" });
  if (
    !apiKey ||
    !apiLogin ||
    apiKey !== process.env.CLIENT_API_KEY ||
    apiLogin !== process.env.CLIENT_LOGIN
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DB);
    const orders = db.collection("orders");

    const order = await orders.findOne({ id: opId });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(200).json({
      result: {
        operation_status_code: order.status === "Оплачено" ? 5 : 1,
      },
    });
  } catch (error) {
    console.error("Error checking operation status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

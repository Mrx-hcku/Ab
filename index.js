const express = require("express");
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
const app = express();
app.use(express.json());

app.post("/registerToken", async (req, res) => {
  const { botToken, chatId, fcmToken } = req.body || {};
  if (!botToken || !chatId || !fcmToken) return res.status(400).send("Missing fields");
  await db.collection("devices").doc(botToken).set({ chatId: String(chatId), fcmToken, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  res.status(200).send("OK");
});

app.post("/telegramWebhook/:botToken", async (req, res) => {
  try {
    const botToken = req.params.botToken;
    const message = req.body && req.body.message;
    if (!message || !message.text) return res.status(200).send("ignored");
    const chatId = String(message.chat.id);
    const text = message.text.trim().toLowerCase();
    const doc = await db.collection("devices").doc(botToken).get();
    if (!doc.exists) return res.status(200).send("unknown device");
    const device = doc.data();
    if (device.chatId !== chatId) return res.status(200).send("chat mismatch");
    if (text === "/locate") {
      await admin.messaging().send({ token: device.fcmToken, data: { cmd: "locate" }, android: { priority: "high" } });
    }
    res.status(200).send("OK");
  } catch (e) { console.error(e); res.status(500).send("error"); }
});

app.get("/", (req, res) => res.send("Phone Finder bridge is running."));
app.listen(process.env.PORT || 3000, () => console.log("Bridge running"));

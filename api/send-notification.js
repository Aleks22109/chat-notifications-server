const admin = require('firebase-admin');

// Инициализация Firebase Admin SDK
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
    });
  }
} catch (e) {
  console.error('Firebase Admin Initialization Error', e);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Only POST requests are allowed');
  }

  const { senderName, messageText } = req.body;

  if (!senderName || !messageText) {
    return res.status(400).send('Missing senderName or messageText');
  }

  try {
    const db = admin.firestore();
    const usersSnapshot = await db.collection("users").get();
    const tokens = [];

    usersSnapshot.forEach(doc => {
      if (doc.id !== senderName && doc.data().token) {
        tokens.push(doc.data().token);
      }
    });

    if (tokens.length > 0) {
      const payload = {
        notification: {
          title: `Новое сообщение от ${senderName}`,
          body: messageText,
          sound: "default",
        },
      };

      await admin.messaging().sendToDevice(tokens, payload);
      console.log("Successfully sent message.");
      return res.status(200).json({ success: true, message: `Notification sent to ${tokens.length} users.` });
    } else {
      console.log("No tokens to send notification to.");
      return res.status(200).json({ success: true, message: 'No other users to notify.' });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}

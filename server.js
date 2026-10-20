// server.js - MYK BINGWA HUB STK Push Backend
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- YOUR DARAJA KEYS (from developer.safaricom.co.ke) ---
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const SHORTCODE = process.env.SHORTCODE || '1755404'; // Your Till
const PASSKEY = process.env.PASSKEY; // From Daraja - Lipa Na Mpesa Online Passkey
const CALLBACK_URL = process.env.CALLBACK_URL; // e.g. https://your-backend.onrender.com/callback

// Get Access Token
async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await axios.get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.data.access_token;
}

// STK Push Endpoint - Called from your website
app.post('/stkpush', async (req, res) => {
  const { phone, amount, accountReference } = req.body;

  try {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

    const stkData = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline", // For Till Number - Use CustomerBuyGoodsOnline
      Amount: amount,
      PartyA: phone, // 2547...
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: accountReference || "BINGWA",
      TransactionDesc: "MYK BINGWA HUB - " + accountReference
    };

    const response = await axios.post(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('STK Push Success:', response.data);
    res.json({ success: true, data: response.data, message: "STK Push sent to " + phone });

  } catch (error) {
    console.error('STK Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

// Callback from Safaricom after payment
app.post('/callback', (req, res) => {
  console.log('--- MPESA CALLBACK ---');
  console.log(JSON.stringify(req.body, null, 2));
  
  const result = req.body.Body?.stkCallback;
  if(result?.ResultCode === 0){
    // Payment SUCCESS
    console.log(`✅ Payment SUCCESS: ${result.CallbackMetadata.Item[4].Value} from ${result.CallbackMetadata.Item[3].Value}`);
    // Here you can auto-send bundle via SMS API or WhatsApp
  } else {
    console.log(`❌ Payment FAILED: ${result?.ResultDesc}`);
  }
  
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.get('/', (req, res) => res.send('MYK BINGWA HUB STK API LIVE - Till 1755404'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

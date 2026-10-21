const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const SHORTCODE = process.env.SHORTCODE || '1284882'; // NEW TILL
const PASSKEY = process.env.PASSKEY;
const CALLBACK_URL = process.env.CALLBACK_URL;

async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await axios.get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.data.access_token;
}

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
      TransactionType: "CustomerBuyGoodsOnline", // For Till 1284882
      Amount: amount,
      PartyA: phone,
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

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

app.post('/callback', (req, res) => {
  console.log(JSON.stringify(req.body, null, 2));
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.get('/', (req, res) => res.send('MYK BINGWA HUB STK API LIVE - Till 1284882'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Live on ${PORT} - Till 1284882`));

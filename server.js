const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; 
const BUSINESS_SHORTCODE = '174379'; 
const CALLBACK_URL = 'https://spinwave.onrender.com/api/callback'; 

app.post('/api/stkpush', async (req, res) => {
    const { phone, amount, token } = req.body;

    if (!token) {
        return res.status(400).json({ error: "Missing active validation token parameter." });
    }

    const date = new Date();
    const timestamp = date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

    const password = Buffer.from(`${BUSINESS_SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

    const stkPayload = {
        BusinessShortCode: BUSINESS_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: BUSINESS_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: CALLBACK_URL,
        AccountReference: "SpinWaveTechs",
        TransactionDesc: "Sandbox Checkout Validation"
    };

    try {
        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkPayload,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        res.status(200).json(response.data);
    } catch (error) {
        console.error("STK push error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Safaricom sandbox infrastructure rejected the request format." });
    }
});

app.post('/api/callback', (req, res) => {
    console.log("Incoming Callback Logs:", JSON.stringify(req.body, null, 2));
    res.status(200).json({ ResultCode: 0, ResultDesc: "Callback accepted." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend online running on port ${PORT}`));

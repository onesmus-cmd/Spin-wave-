const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Enable Cross-Origin Resource Sharing so your Spck Editor frontend can speak to Render
app.use(cors());
app.use(express.json());

// OFFICIAL SAFARICOM DARAJA SANDBOX TEST CREDENTIALS
const CONSUMER_KEY = "wG4b7uGxG7A7XG7A7XG7A7XG7A7XG7A7"; // Standard Sandbox App Key
const CONSUMER_SECRET = "xA7XG7A7XG7A7XG7";               // Standard Sandbox App Secret
const PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; 
const BUSINESS_SHORTCODE = '174379'; // Official Lipa Na M-Pesa Sandbox Paybill

// This will automatically track your incoming webhooks once deployed
const CALLBACK_URL = 'https://spinwave-backend.onrender.com/api/callback'; 

/**
 * Authorization middleware to request a dynamic Safaricom Sandbox OAuth Access Token
 */
async function generateToken(req, res, next) {
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    
    try {
        const response = await axios.get(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            }
        );
        req.authToken = response.data.access_token;
        next();
    } catch (error) {
        console.error("Sandbox Token Generation Failure:", error.message);
        res.status(500).json({ error: "Failed to generate Daraja Sandbox token." });
    }
}

/**
 * Core endpoint initializing the test STK Push payment handshake
 */
app.post('/api/stkpush', generateToken, async (req, res) => {
    let { phone, amount } = req.body;

    // Architectural timestamp required by Safaricom formatting: YYYYMMDDHHmmss
    const date = new Date();
    const timestamp = date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

    // Build the security verification signature string
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
        TransactionDesc: "Sandbox Payment Test"
    };

    try {
        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkPayload,
            {
                headers: {
                    Authorization: `Bearer ${req.authToken}`
                }
            }
        );
        res.status(200).json(response.data);
    } catch (error) {
        console.error("STK Push Transmission Failure:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Sandbox transaction dropped by Safaricom Developer Node." });
    }
});

/**
 * Webhook landing endpoint where Safaricom submits sandbox logs
 */
app.post('/api/callback', (req, res) => {
    console.log("Incoming Sandbox Callback Payload:", JSON.stringify(req.body, null, 2));
    res.status(200).json({ ResultCode: 0, ResultDesc: "Sandbox callback accepted successfully." });
});

// Let Render bind to its required cloud port automatically
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sandbox server active on cloud port ${PORT}`);
});

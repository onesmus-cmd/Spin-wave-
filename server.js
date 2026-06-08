const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Enable Cross-Origin Resource Sharing so your hosted frontend can talk to this backend
app.use(cors());
app.use(express.json());

// Pulling secret credentials securely from Render's Environment Variables
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const PASSKEY = process.env.MPESA_PASSKEY;

// Safaricom Sandbox Shortcode details (Change to your live ones if migrating to production)
const BUSINESS_SHORTCODE = '174379'; 
const CALLBACK_URL = 'https://spin-wave-backend.onrender.com/api/callback'; 

/**
 * Middleware generation layer to fetch dynamic Safaricom OAuth Access Token
 */
async function generateToken(req, res, next) {
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    
    try {
        const response = await axios.get(
            'https://sandbox.safaricom.co.kr/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            }
        );
        req.authToken = response.data.access_token;
        next();
    } catch (error) {
        console.error("Token Generation Failure:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to generate Daraja access token." });
    }
}

/**
 * Primary endpoint to initialize the STK Push transaction sequence
 */
app.post('/api/stkpush', generateToken, async (req, res) => {
    const { phone, amount } = req.body;

    // Architectural timestamp logic required by Safaricom: YYYYMMDDHHmmss
    const date = new Date();
    const timestamp = date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

    // Create password payload by combining shortcode, passkey, and timestamp
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
        TransactionDesc: "Secure Portal Payment Validation Routine"
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
        res.status(500).json({ error: "Server Error: Sandbox transaction failed to initiate." });
    }
});

/**
 * Webhook endpoint where Safaricom pushes execution receipts back to your cloud server
 */
app.post('/api/callback', (req, res) => {
    console.log("Incoming Safaricom Transaction Callback Payload:", JSON.stringify(req.body, null, 2));
    res.status(200).json({ ResultCode: 0, ResultDesc: "Callback payload registered successfully by cloud terminal." });
});

// CRITICAL: Let Render assign the execution port dynamically
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server executing securely on port ${PORT}`);
});

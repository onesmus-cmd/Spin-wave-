const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Enable Cross-Origin Resource Sharing for your Spin Wave Techs Portal
app.use(cors());
app.use(express.json());

// YOUR UNIQUE SAFARICOM DARAJA SANDBOX CREDENTIALS
const CONSUMER_KEY = "bKnv1VUuj07WyR6TQV3vwffHTHGoa8w15eWmMGXVgamrhGSa"; 
const CONSUMER_SECRET = "igEAEfdqkxeMcOV2KH3a4tef4adM9H4tFoLPrHt04fFfuofXvvYiU4FoZkGRvCQ0"; 

// Official Lipa Na M-Pesa Sandbox Constants
const PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; 
const BUSINESS_SHORTCODE = '174379'; 
const CALLBACK_URL = 'https://spinwave.onrender.com/api/callback'; 

/**
 * Robust Authorization middleware configured specifically for the Safaricom Sandbox Node
 */
async function generateToken(req, res, next) {
    // Generate clean Base64 auth string
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    
    try {
        const response = await axios({
            method: 'get',
            url: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.data && response.data.access_token) {
            req.authToken = response.data.access_token;
            next();
        } else {
            throw new Error("Invalid response format from Daraja.");
        }
    } catch (error) {
        // Detailed error tracking for your Render log stream
        console.error("Critical Daraja Handshake Failure:", error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: "Failed to generate personal Daraja Sandbox token.",
            details: error.response ? error.response.data : error.message 
        });
    }
}

/**
 * Core endpoint initializing the secure STK Push transaction sequence
 */
app.post('/api/stkpush', generateToken, async (req, res) => {
    const { phone, amount } = req.body;

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
            {
                headers: {
                    Authorization: `Bearer ${req.authToken}`
                }
            }
        );
        res.status(200).json(response.data);
    } catch (error) {
        console.error("STK Push Transmission Failure:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Safaricom Sandbox rejected transaction handshake." });
    }
});

app.post('/api/callback', (req, res) => {
    console.log("Incoming Safaricom Sandbox Callback Payload:", JSON.stringify(req.body, null, 2));
    res.status(200).json({ ResultCode: 0, ResultDesc: "Callback accepted by cloud server." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Spin Wave Techs backend active on cloud port ${PORT}`);
});

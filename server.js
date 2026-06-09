const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Sandbox Credentials extracted from the official API ecosystem parameters
const CONSUMER_KEY = "VpH0nHGpoWhgoAjl9KsLgwRbXiPa3wh43YIx1sMGMNjzNXo7";
const CONSUMER_SECRET = "yAzAOBs49lN5yrzzNyap9h1bKqUDG1FluObamNEMrdXOZdaBZ0UjhuCx51HaGO4X";

// Lipa Na M-Pesa Testbed System Specifications
const PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; 
const BUSINESS_SHORTCODE = '174379'; 
const CALLBACK_URL = 'https://spinwave.onrender.com/api/callback'; 

/**
 * Middleware layer to dynamically request an authorization token from Safaricom's server.
 * This runs automatically on every payment request, preventing expirations.
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
        console.error("Token Generation Failure:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to generate dynamic auth credentials layer." });
    }
}

/**
 * Main transaction vector executing the STK Push payload sequence
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
        res.status(500).json({ error: "Safaricom sandbox rejected the push request structure." });
    }
});

app.post('/api/callback', (req, res) => {
    console.log("Captured Network Callback Metadata Stream:", JSON.stringify(req.body, null, 2));
    res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Spin Wave Techs checkout module active on port: ${PORT}`);
});

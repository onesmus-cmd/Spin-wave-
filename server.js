const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Set up structural gateway permissions for cross-network browser transactions
app.use(cors());
app.use(express.json());

// YOUR HARDCODED SAFARICOM DARAJA DEVELOPER APPLICATION INSTANCE CREDENTIALS
const CONSUMER_KEY = "bKnv1VUuj07WyR6TQV3vwffHTHGoa8w15eWmMGXVgamrhGSa"; 
const CONSUMER_SECRET = "igEAEfdqkxeMcOV2KH3a4tef4adM9H4tFoLPrHt04fFfuofXvvYiU4FoZkGRvCQ0"; 

// Official Lipa Na M-Pesa Testbed System Specifications
const PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; 
const BUSINESS_SHORTCODE = '174379'; 
const CALLBACK_URL = 'https://spinwave.onrender.com/api/callback'; 

/**
 * Middleware handling secure runtime access tokens from Safaricom endpoints via basic auth headers
 */
async function generateToken(req, res, next) {
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    
    try {
        const response = await axios({
            method: 'get',
            url: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        req.authToken = response.data.access_token;
        next();
    } catch (error) {
        console.error("Token Handshake Exception Details:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to generate authentic Daraja Sandbox token connection layer." });
    }
}

/**
 * Transaction processing routing endpoint compiling encryption matrices for Lipa na M-Pesa
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
        console.error("STK Push Vector Drop Details:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "The remote Safaricom sandbox infrastructure node rejected the transaction format." });
    }
});

/**
 * Webhook capture matrix tracking structural payment callback data structures from Safaricom
 */
app.post('/api/callback', (req, res) => {
    console.log("Captured Network Callback Metadata Stream:", JSON.stringify(req.body, null, 2));
    res.status(200).json({ ResultCode: 0, ResultDesc: "Callback frame successfully parsed." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Spin Wave Techs production instance operational on port bindings: ${PORT}`);
});

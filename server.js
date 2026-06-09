const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Enable CORS for your mobile preview frontend
app.use(cors());
app.use(express.json());

// Fetch credentials from Railway's environment panel and strip out accidental whitespace
const CONSUMER_KEY = (process.env.DARAJA_CONSUMER_KEY || "").trim();
const CONSUMER_SECRET = (process.env.DARAJA_CONSUMER_SECRET || "").trim();

/**
 * Route to generate the Daraja Access Token securely
 */
app.get('/api/token', async (req, res) => {
    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
        return res.status(500).json({
            error: "Infrastructure Refusal",
            message: "Server environment keys are empty on the hosting provider platform."
        });
    }

    // Generate accurate Base64 authorization string
    const authString = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    try {
        const response = await axios.get(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Send token to frontend
        return res.status(200).json({
            access_token: response.data.access_token,
            expires_in: response.data.expires_in
        });

    } catch (error) {
        console.error("=== DARAJA AUTH FAILURE ===");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
            return res.status(error.response.status).json({
                error: "Handshake Denied",
                message: error.response.data.errorMessage || "Safaricom rejected the provided app credentials."
            });
        } else {
            console.error("Message:", error.message);
            return res.status(500).json({
                error: "Token Failure",
                message: "Could not connect to Safaricom nodes."
            });
        }
    }
});

// Health check route
app.get('/', (req, res) => {
    res.send('Spin Wave Techs Backend Server is running smoothly on Railway!');
});

// Bind dynamically to Railway's assigned runtime port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server executing seamlessly on port ${PORT}`);
});

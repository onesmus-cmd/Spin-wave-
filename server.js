const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Pull keys safely from Render's environment
const CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET;

app.get('/api/token', async (req, res) => {
    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
        return res.status(500).json({
            error: "Infrastructure Refusal",
            message: "Server environment variables for Daraja keys are missing."
        });
    }

    // Combine Key:Secret and encode to Base64 format
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

        // Pass token to frontend
        res.status(200).json({ access_token: response.data.access_token });

    } catch (error) {
        console.error("Daraja Error Logs:", error.response ? error.response.data : error.message);
        res.status(500).json({
            error: "Handshake Denied",
            message: "Failed to generate authentic Daraja Sandbox token."
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server executing seamlessly on port ${PORT}`));

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Enable CORS so your mobile preview frontend can communicate with Render
app.use(cors());
app.use(express.json());

// Fetch your credentials securely from Render's environment variables
const CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET;

/**
 * Route to generate the Daraja Access Token
 */
app.get('/api/token', async (req, res) => {
    // Check if variables are missing to prevent runtime errors
    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
        return res.status(500).json({
            error: "Infrastructure Refusal",
            message: "Server environment variables for Daraja keys are missing."
        });
    }

    // Generate correct Base64 string (Key:Secret)
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

        // Send token back to your frontend portal cleanly
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
                message: error.response.data.errorMessage || "Failed to generate authentic Daraja token."
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

// Root route to easily check if the server is alive in your browser
app.get('/', (req, res) => {
    res.send('Spin Wave Techs Backend Server is running smoothly!');
});

// Bind to the port provided by Render dynamically
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server executing seamlessly on port ${PORT}`);
});

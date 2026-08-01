const express = require("express");
const cors = require("cors");
const { createGatewayMiddleware } = require("@circle-fin/x402-batching/server");

const app = express();

app.use(cors());
app.use(express.json());

const gateway = createGatewayMiddleware({
  sellerAddress: "0xYOUR_WALLET_ADDRESS", // Place actual payout wallet here
  facilitatorUrl: "https://gateway-api-testnet.circle.com", // Testnet Gateway
});

// Protect the Location API
app.get("/api/location", gateway.require("$0.01"), (req, res) => {
  res.json({
    status: "success",
    data: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: "high",
      message: "Secure proxy location data retrieved successfully."
    }
  });
});

// Protect the Blockchain Relay API
app.post("/api/blockchain/transfer", gateway.require("$0.05"), (req, res) => {
  res.json({
    status: "success",
    txHash: "0xMockTransactionHash123abc",
    message: "Cross-chain transfer successfully initiated and relayed."
  });
});

// Protect the Agent AI Proxy API
app.post("/api/agent", gateway.require("$0.01"), (req, res) => {
  res.json({
    status: "success",
    response: "This is a mock response from the premium Open-Dome agent."
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`x402 Seller API Server running on port ${PORT}`);
});

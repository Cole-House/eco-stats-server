const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Utility: Get sessionId by logging in to PAN
const getPanSessionId = async () => {
  const loginUrl = `${process.env.PAN_API_URL}/api/merchant/login`;

  const response = await fetch(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.PAN_USERNAME,
      password: process.env.PAN_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`PAN login failed with status ${response.status}`);
  }

  const result = await response.json();

  if (!result.sessionId) {
    throw new Error("PAN login succeeded but no sessionId was returned");
  }

  return result.sessionId;
};

// Utility: Get commission stats
const getPanStats = async (sessionId) => {
  const statsUrl = `${process.env.PAN_API_URL}/api/affiliates/Reports/getStats`;

  const response = await fetch(statsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionId,
      dateFrom: "2024-01-01", // You can make this dynamic if needed
      dateTo: "2024-12-31",
    }),
  });

  if (!response.ok) {
    throw new Error(`PAN stats request failed with status ${response.status}`);
  }

  const result = await response.json();

  if (!result.rows || !Array.isArray(result.rows)) {
    throw new Error("PAN stats returned unexpected format");
  }

  return result.rows;
};

// Environmental metrics calculation
const calculateEnvironmentalStats = (rows) => {
  const totalCommission = rows.reduce((sum, row) => {
    const amount = parseFloat(row.commission);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const totalDonations = totalCommission * 0.1;
  const treesPlanted = Math.floor(totalDonations / 0.44);
  const co2Reduced = treesPlanted * 22;

  return {
    totalCommission: totalCommission.toFixed(2),
    totalDonations: totalDonations.toFixed(2),
    treesPlanted,
    annualCO2EmissionReducedLbs: co2Reduced,
  };
};

// API Endpoint
app.get("/api/environmental-stats", async (req, res) => {
  try {
    const sessionId = await getPanSessionId();
    const rows = await getPanStats(sessionId);
    const stats = calculateEnvironmentalStats(rows);

    res.status(200).json(stats); // ✅ Success
  } catch (error) {
    console.error("Error in /api/environmental-stats:", error.message);
    res.status(500).json({ error: error.message }); // 🔥 Internal server error
  }
});

// Root route
app.get("/", (req, res) => {
  res
    .status(200)
    .send("Server is running. Try /api/environmental-stats for data.");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

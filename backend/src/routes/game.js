const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const partyService = require("../services/PartyService");

// Middleware to verify JWT
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

router.get("/status", (req, res) => {
  res.json({ status: "Game server is running" });
});

router.post("/create-party", async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      console.log("No token found");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("User auth type:", decoded.authType);
    
    if (decoded.authType !== 'discord') {
      console.log("User not authorized to create party:", decoded.authType);
      return res.status(403).json({ message: "Only Discord users can create parties" });
    }

    console.log("Creating party for user:", decoded);
    const result = await partyService.createParty(decoded);
    res.json({
      ...result,
      message: "Party created successfully"
    });
  } catch (error) {
    console.error("Failed to create party:", error);
    res.status(500).json({ message: "Failed to create party" });
  }
});

router.get("/check-party/:code", async (req, res) => {
  const partyCode = req.params.code;
  const party = await partyService.checkPartyExists(partyCode);
  
  if (!party) {
    return res.status(404).json({ message: "Party not found" });
  }
  
  res.json({ exists: true, party });
});

module.exports = { router };

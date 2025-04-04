const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const AuthService = require('../services/AuthService');

const router = express.Router();

// Step 1: Redirect to Discord login
router.get("/discord", passport.authenticate("discord"));

// Step 2: Handle callback from Discord
router.get("/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      const user = await prisma.user.upsert({
        where: {
          discordId: req.user.user.id
        },
        update: {
          username: req.user.user.username,
          avatarUrl: req.user.user.avatarUrl
        },
        create: {
          discordId: req.user.user.id,
          username: req.user.user.username,
          avatarUrl: req.user.user.avatarUrl
        }
      });

      const token = jwt.sign(
        { 
          id: user.id.toString(), // Convert to string for consistency
          username: user.username,
          avatarUrl: user.avatarUrl,
          authType: 'discord'
        },
        process.env.JWT_SECRET
      );

      res.cookie("jwt", token, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.redirect(`${process.env.CLIENT_URL}/`);
    } catch (error) {
      console.error("Database error:", error);
      res.redirect("/");
    }
  }
);

// Step 3: Login with username
router.post("/username", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const { user, token } = await AuthService.loginWithUsername(username);
    res.cookie("jwt", token, { 
      httpOnly: true, 
      secure: false
    });
    
    res.json(user);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Step 4: Get current user details
router.get("/me", (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.authType === 'username') {
      const user = AuthService.getUser(decoded.id);
      if (!user) {
        res.clearCookie("jwt");
        return res.status(401).json({ message: "Session expired" });
      }
      return res.json(user);
    }

    res.json(decoded);
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// Step 5: Logout
router.get("/logout", (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.authType === 'username') {
        AuthService.removeUser(decoded.id);
      }
    }
    res.clearCookie("jwt");
    res.json({ message: "Logged out" });
  } catch (err) {
    res.clearCookie("jwt");
    res.json({ message: "Logged out" });
  }
});

module.exports = router;

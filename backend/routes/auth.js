import express from "express";
import passport from "passport";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config({path: "./config.env"});

// Google Auth Route
router.get("/google", passport.authenticate("google", { scope: ["email", "profile"] }));

// Google Callback Route
// Google authentication callback route
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:5173/auth/login", // Redirect if authentication fails
  }),
  (req, res) => {
    const { token, user } = req.user;
    res.redirect(
      `http://localhost:5173/?token=${token}&name=${encodeURIComponent(
        user.name
      )}&email=${user.email}`
    );
  }
);


// Logout Route
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("http://localhost:5173/");
  });
});



  

export default router;



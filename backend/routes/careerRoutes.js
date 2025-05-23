const express = require("express");
const { predictCareer, getPredictionHistory, getPredictionById, saveCareerPrediction } = require("../controllers/careerController");
const { sendCareerReport } = require("../controllers/emailController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Route to hit AI/ML backend for career prediction
router.post("/predict", predictCareer);

// Routes for accessing prediction history (protected routes)
router.get("/history", protect, getPredictionHistory);
router.get("/history/:id", protect, getPredictionById);

// Route for saving career predictions to user profile
router.post("/save", protect, saveCareerPrediction);

// Route for sending career results via email
router.post("/email-results", sendCareerReport);

module.exports = router;

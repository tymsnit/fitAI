const express = require('express');
const {
  getAiRecommendationSummary,
} = require('../controllers/aiRecommendationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', authMiddleware, getAiRecommendationSummary);

module.exports = router;
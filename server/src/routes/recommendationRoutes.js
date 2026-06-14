const express = require('express');
const {
  getRecommendations,
} = require('../controllers/recommendationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getRecommendations);

module.exports = router;
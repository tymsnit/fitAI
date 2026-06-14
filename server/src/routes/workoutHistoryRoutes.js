const express = require('express');
const {
  getWorkoutHistory,
} = require('../controllers/workoutController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getWorkoutHistory);

module.exports = router;
const express = require('express');
const {
  generateWorkoutPlan,
  getCurrentWorkoutPlan,
} = require('../controllers/workoutPlanController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/generate', authMiddleware, generateWorkoutPlan);
router.get('/current', authMiddleware, getCurrentWorkoutPlan);

module.exports = router;
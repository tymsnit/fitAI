const express = require('express');
const {
  completeWorkout,
} = require('../controllers/workoutController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/:id/complete', authMiddleware, completeWorkout);

module.exports = router;
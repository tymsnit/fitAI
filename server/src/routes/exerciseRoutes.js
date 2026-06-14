const express = require('express');
const {
  getExercises,
  getExerciseById,
} = require('../controllers/exerciseController');

const router = express.Router();

router.get('/', getExercises);
router.get('/:id', getExerciseById);

module.exports = router;
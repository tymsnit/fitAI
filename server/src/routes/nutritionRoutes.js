const express = require('express');
const {
  getNutritionTargets,
  updateNutritionTargets,
  createNutritionLog,
  getNutritionLogs,
  getNutritionSummary,
  deleteNutritionLog,
} = require('../controllers/nutritionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/targets', authMiddleware, getNutritionTargets);
router.put('/targets', authMiddleware, updateNutritionTargets);

router.get('/logs', authMiddleware, getNutritionLogs);
router.post('/logs', authMiddleware, createNutritionLog);
router.delete('/logs/:id', authMiddleware, deleteNutritionLog);

router.get('/summary', authMiddleware, getNutritionSummary);

module.exports = router;
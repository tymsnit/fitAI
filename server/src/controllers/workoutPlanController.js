const {
  generateWorkoutPlanForUser,
  getCurrentWorkoutPlanForUser,
} = require('../services/workoutPlanService');

const generateWorkoutPlan = async (req, res) => {
  try {
    const plan = await generateWorkoutPlanForUser(req.user.id);

    res.status(201).json({
      message: 'Workout plan generated successfully',
      plan,
    });
  } catch (error) {
    console.error('Error generating workout plan:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Server error while generating workout plan',
    });
  }
};

const getCurrentWorkoutPlan = async (req, res) => {
  try {
    const plan = await getCurrentWorkoutPlanForUser(req.user.id);

    if (!plan) {
      return res.status(404).json({
        message: 'Active workout plan not found',
      });
    }

    res.json({
      plan,
    });
  } catch (error) {
    console.error('Error getting current workout plan:', error);

    res.status(500).json({
      message: 'Server error while getting current workout plan',
    });
  }
};

module.exports = {
  generateWorkoutPlan,
  getCurrentWorkoutPlan,
};
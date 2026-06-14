const {
  generateRecommendationsForUser,
} = require('../services/recommendationService');

const getRecommendations = async (req, res) => {
  try {
    const result = await generateRecommendationsForUser(req.user.id);

    res.json({
      profile: result.profile,
      plan: result.plan,
      statistics: result.statistics,
      nutrition: result.nutrition,
      recommendations: result.recommendations,
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);

    res.status(500).json({
      message: 'Server error while getting recommendations',
    });
  }
};

module.exports = {
  getRecommendations,
};
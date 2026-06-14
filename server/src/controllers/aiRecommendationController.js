const {
  generateAiRecommendationSummary,
} = require('../services/aiRecommendationService');

const getAiRecommendationSummary = async (req, res) => {
  try {
    const result = await generateAiRecommendationSummary(req.user.id);

    res.json({
      available: result.available,
      source: result.source,
      model: result.model,
      aiSummary: result.aiSummary,

      profile: result.expertResult.profile,
      plan: result.expertResult.plan,
      statistics: result.expertResult.statistics,
      nutrition: result.expertResult.nutrition,
      recommendations: result.expertResult.recommendations,
    });
  } catch (error) {
    console.error('Error getting AI recommendation summary:', error);

    res.status(500).json({
      message: 'Server error while getting AI recommendation summary',
    });
  }
};

module.exports = {
  getAiRecommendationSummary,
};
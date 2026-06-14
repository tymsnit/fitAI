const OpenAI = require('openai');
const {
  generateRecommendationsForUser,
} = require('./recommendationService');

const hasOpenAiConfig = () => {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
};

const buildSafeContext = (expertResult) => {
  const profile = expertResult.profile;

  return {
    profile: profile
      ? {
          age: profile.age,
          gender: profile.gender,
          height: profile.height,
          weight: profile.weight,
          fitnessLevel: profile.fitnessLevel,
          goal: profile.goal,
          trainingsPerWeek: profile.trainingsPerWeek,
        }
      : null,

    training: {
      hasActivePlan: Boolean(expertResult.plan),
      planTitle: expertResult.plan?.title || null,
      totalWorkouts: expertResult.statistics?.totalWorkouts || 0,
      completedWorkouts: expertResult.statistics?.completedWorkouts || 0,
      completionRate: expertResult.statistics?.completionRate || 0,
      feedback: expertResult.statistics?.feedback || null,
    },

    nutrition: {
      hasTargets: Boolean(expertResult.nutrition?.targets),
      targets: expertResult.nutrition?.targets
        ? {
            dailyCalories: expertResult.nutrition.targets.dailyCalories,
            dailyProtein: expertResult.nutrition.targets.dailyProtein,
            dailyFats: expertResult.nutrition.targets.dailyFats,
            dailyCarbs: expertResult.nutrition.targets.dailyCarbs,
            dailyWaterMl: expertResult.nutrition.targets.dailyWaterMl,
          }
        : null,
      summary: expertResult.nutrition?.summary || null,
      progress: expertResult.nutrition?.progress || null,
    },

    ruleBasedRecommendations: (expertResult.recommendations || []).map(
      (item) => ({
        ruleId: item.ruleId,
        type: item.type,
        priority: item.priority,
        title: item.title,
        description: item.description,
        explanation: item.explanation,
      })
    ),
  };
};

const buildPrompt = (safeContext) => {
  return `
Ти є AI-компонентом вебплатформи FitAI.

Завдання:
сформувати коротке персоналізоване узагальнення для користувача на основі даних профілю, тренувань, харчування та рекомендацій, які вже були сформовані rule-based expert system.

Важливі обмеження:
1. Не вигадуй медичні, дієтологічні або лікувальні призначення.
2. Не замінюй лікаря, дієтолога або професійного тренера.
3. Не рекомендуй небезпечні, екстремальні або надмірно обмежувальні дієти.
4. Не формуй жорсткі приписи щодо схуднення.
5. Якщо користувач неповнолітній, не давай порад щодо дефіциту калорій або схуднення; обмежся нейтральними рекомендаціями щодо регулярності, безпечного навантаження, ведення записів і звернення до дорослого або фахівця.
6. Не змінюй зміст rule-based рекомендацій, а лише пояснюй їх людською мовою.
7. Відповідай українською мовою.
8. Тон: спокійний, підтримувальний, без тиску.
9. Обсяг: 4–7 коротких абзаців.

Структура відповіді:
- Загальне узагальнення стану.
- Що важливо щодо тренувань.
- Що важливо щодо харчування.
- 2–4 безпечні наступні кроки.
- Коротке застереження, що рекомендації мають інформаційний характер.

Дані для аналізу:
${JSON.stringify(safeContext, null, 2)}
`;
};

const generateAiRecommendationSummary = async (userId) => {
  const expertResult = await generateRecommendationsForUser(userId);

  if (!hasOpenAiConfig()) {
    return {
      available: false,
      source: 'fallback',
      model: null,
      aiSummary:
        'AI-узагальнення недоступне, оскільки OpenAI API не налаштовано. Базові рекомендації сформовано експертною системою правил.',
      expertResult,
    };
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const safeContext = buildSafeContext(expertResult);
  const prompt = buildPrompt(safeContext);

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL,
      input: [
        {
          role: 'system',
          content:
            'Ти допоміжний AI-модуль FitAI. Формуй лише безпечні інформаційні узагальнення на основі наданих даних і правил.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return {
      available: true,
      source: 'openai_responses_api',
      model: process.env.OPENAI_MODEL,
      aiSummary:
        response.output_text ||
        'AI-узагальнення сформовано, але відповідь моделі порожня.',
      expertResult,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);

    return {
      available: false,
      source: 'fallback',
      model: process.env.OPENAI_MODEL,
      aiSummary:
        'AI-узагальнення тимчасово недоступне. Базові рекомендації сформовано експертною системою правил.',
      expertResult,
    };
  }
};

module.exports = {
  generateAiRecommendationSummary,
};
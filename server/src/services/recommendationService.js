const pool = require('../config/db');

const getUserProfile = async (userId) => {
  const result = await pool.query(
    `
    SELECT
      id,
      user_id AS "userId",
      name,
      age,
      gender,
      height,
      weight,
      fitness_level AS "fitnessLevel",
      goal,
      trainings_per_week AS "trainingsPerWeek",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM user_profiles
    WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

const getActivePlan = async (userId) => {
  const planResult = await pool.query(
    `
    SELECT
      id,
      user_id AS "userId",
      title,
      goal,
      fitness_level AS "fitnessLevel",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM workout_plans
    WHERE user_id = $1
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userId]
  );

  if (planResult.rows.length === 0) {
    return null;
  }

  const plan = planResult.rows[0];

  const workoutsResult = await pool.query(
    `
    SELECT
      id,
      plan_id AS "planId",
      title,
      day_number AS "dayNumber",
      description,
      estimated_duration AS "estimatedDuration",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM workouts
    WHERE plan_id = $1
    ORDER BY day_number ASC
    `,
    [plan.id]
  );

  return {
    ...plan,
    workouts: workoutsResult.rows,
  };
};

const getWorkoutStatistics = async (userId, plan) => {
  if (!plan) {
    return {
      totalWorkouts: 0,
      completedWorkouts: 0,
      completionRate: 0,
      feedback: {
        easy: 0,
        normal: 0,
        hard: 0,
        too_hard: 0,
      },
    };
  }

  const result = await pool.query(
    `
    SELECT
      COUNT(w.id)::INTEGER AS "totalWorkouts",
      COUNT(wl.id)::INTEGER AS "completedWorkouts",
      COALESCE(
        ROUND(
          COUNT(wl.id)::NUMERIC / NULLIF(COUNT(w.id), 0) * 100,
          1
        ),
        0
      )::FLOAT AS "completionRate",

      COUNT(CASE WHEN wl.difficulty_feedback = 'easy' THEN 1 END)::INTEGER AS "easyCount",
      COUNT(CASE WHEN wl.difficulty_feedback = 'normal' THEN 1 END)::INTEGER AS "normalCount",
      COUNT(CASE WHEN wl.difficulty_feedback = 'hard' THEN 1 END)::INTEGER AS "hardCount",
      COUNT(CASE WHEN wl.difficulty_feedback = 'too_hard' THEN 1 END)::INTEGER AS "tooHardCount"
    FROM workouts w
    LEFT JOIN workout_logs wl
      ON wl.workout_id = w.id
      AND wl.user_id = $2
    WHERE w.plan_id = $1
    `,
    [plan.id, userId]
  );

  const row = result.rows[0];

  return {
    totalWorkouts: row.totalWorkouts || 0,
    completedWorkouts: row.completedWorkouts || 0,
    completionRate: Number(row.completionRate || 0),
    feedback: {
      easy: row.easyCount || 0,
      normal: row.normalCount || 0,
      hard: row.hardCount || 0,
      too_hard: row.tooHardCount || 0,
    },
  };
};

const getNutritionTargets = async (userId) => {
  const result = await pool.query(
    `
    SELECT
      id,
      user_id AS "userId",
      daily_calories AS "dailyCalories",
      daily_protein AS "dailyProtein",
      daily_fats AS "dailyFats",
      daily_carbs AS "dailyCarbs",
      daily_water_ml AS "dailyWaterMl",
      source,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM nutrition_targets
    WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

const getNutritionSummary = async (userId) => {
  const today = new Date().toISOString().slice(0, 10);

  const result = await pool.query(
    `
    SELECT
      COALESCE(SUM(calories), 0)::INTEGER AS "totalCalories",
      COALESCE(SUM(protein), 0)::NUMERIC(8,2) AS "totalProtein",
      COALESCE(SUM(fats), 0)::NUMERIC(8,2) AS "totalFats",
      COALESCE(SUM(carbs), 0)::NUMERIC(8,2) AS "totalCarbs",
      COALESCE(SUM(water_ml), 0)::INTEGER AS "totalWaterMl",
      COUNT(id)::INTEGER AS "totalNutritionLogs"
    FROM nutrition_logs
    WHERE user_id = $1
      AND DATE(logged_at) = $2
    `,
    [userId, today]
  );

  return {
    date: today,
    ...result.rows[0],
  };
};

const percent = (actual, target) => {
  const actualNumber = Number(actual || 0);
  const targetNumber = Number(target || 0);

  if (!targetNumber) {
    return 0;
  }

  return Math.round((actualNumber / targetNumber) * 100);
};

const buildExpertContext = async (userId) => {
  const profile = await getUserProfile(userId);
  const plan = await getActivePlan(userId);
  const workoutStatistics = await getWorkoutStatistics(userId, plan);

  let nutritionTargets = null;
  let nutritionSummary = null;

  try {
    nutritionTargets = await getNutritionTargets(userId);
    nutritionSummary = await getNutritionSummary(userId);
  } catch (error) {
    // Якщо таблиці харчування ще не застосовані через migration,
    // рекомендації щодо тренувань все одно мають працювати.
    nutritionTargets = null;
    nutritionSummary = null;
  }

  const nutritionProgress = nutritionTargets && nutritionSummary
    ? {
        caloriesPercent: percent(
          nutritionSummary.totalCalories,
          nutritionTargets.dailyCalories
        ),
        proteinPercent: percent(
          nutritionSummary.totalProtein,
          nutritionTargets.dailyProtein
        ),
        fatsPercent: percent(
          nutritionSummary.totalFats,
          nutritionTargets.dailyFats
        ),
        carbsPercent: percent(
          nutritionSummary.totalCarbs,
          nutritionTargets.dailyCarbs
        ),
        waterPercent: percent(
          nutritionSummary.totalWaterMl,
          nutritionTargets.dailyWaterMl
        ),
      }
    : null;

  return {
    userId,
    profile,
    plan,
    workoutStatistics,
    nutrition: {
      targets: nutritionTargets,
      summary: nutritionSummary,
      progress: nutritionProgress,
    },
  };
};

const expertRules = [
  {
    id: 'PROFILE_01',
    type: 'profile',
    priority: 10,
    condition: (ctx) => !ctx.profile,
    recommendation: () => ({
      title: 'Потрібно створити профіль користувача',
      description:
        'Для персоналізації тренувального плану та рекомендацій системі потрібні базові дані профілю користувача.',
      explanation:
        'Правило спрацювало, тому що для користувача не знайдено запис профілю.',
    }),
  },
  {
    id: 'PROFILE_02',
    type: 'profile',
    priority: 9,
    condition: (ctx) => {
      const profile = ctx.profile;

      if (!profile) {
        return false;
      }

      return !profile.age ||
        !profile.height ||
        !profile.weight ||
        !profile.goal ||
        !profile.fitnessLevel ||
        !profile.trainingsPerWeek;
    },
    recommendation: () => ({
      title: 'Профіль заповнено не повністю',
      description:
        'Для точнішої персоналізації бажано заповнити вік, зріст, вагу, ціль, рівень підготовки та кількість тренувань на тиждень.',
      explanation:
        'Правило спрацювало, тому що частина профільних параметрів користувача відсутня.',
    }),
  },
  {
    id: 'TRAINING_01',
    type: 'workout_plan',
    priority: 8,
    condition: (ctx) => !ctx.plan,
    recommendation: () => ({
      title: 'Потрібно згенерувати тренувальний план',
      description:
        'Після заповнення профілю користувач може згенерувати персональний тренувальний план відповідно до своєї цілі та рівня підготовки.',
      explanation:
        'Правило спрацювало, тому що активний тренувальний план користувача не знайдено.',
    }),
  },
  {
    id: 'TRAINING_02',
    type: 'consistency',
    priority: 7,
    condition: (ctx) => {
      const stats = ctx.workoutStatistics;

      return stats.totalWorkouts > 0 && stats.completedWorkouts === 0;
    },
    recommendation: () => ({
      title: 'Почніть із першого тренування',
      description:
        'План уже сформовано, але виконані тренування ще не зафіксовані. Рекомендовано пройти перше тренування та позначити його як виконане.',
      explanation:
        'Правило спрацювало, тому що у сформованому плані немає жодного виконаного тренування.',
    }),
  },
  {
    id: 'TRAINING_03',
    type: 'training_load',
    priority: 7,
    condition: (ctx) => {
      const stats = ctx.workoutStatistics;

      return stats.totalWorkouts > 0 &&
        stats.completedWorkouts > 0 &&
        stats.completionRate < 50;
    },
    recommendation: (ctx) => ({
      title: 'Рекомендовано зменшити навантаження',
      description:
        'Користувач виконує менше половини запланованих тренувань. Доцільно зменшити кількість тренувань або обрати простіші вправи.',
      explanation:
        `Правило спрацювало, тому що відсоток виконання плану становить ${ctx.workoutStatistics.completionRate}%, що нижче порогового значення 50%.`,
    }),
  },
  {
    id: 'TRAINING_04',
    type: 'training_load',
    priority: 6,
    condition: (ctx) => {
      const stats = ctx.workoutStatistics;

      return stats.completionRate >= 50 && stats.completionRate < 80;
    },
    recommendation: (ctx) => ({
      title: 'Поточне навантаження можна зберегти',
      description:
        'Користувач виконує значну частину плану, але показник ще не є стабільно високим. Рекомендовано зберегти поточний рівень складності.',
      explanation:
        `Правило спрацювало, тому що відсоток виконання плану становить ${ctx.workoutStatistics.completionRate}%, тобто перебуває в діапазоні 50–79%.`,
    }),
  },
  {
    id: 'TRAINING_05',
    type: 'progression',
    priority: 6,
    condition: (ctx) => {
      const stats = ctx.workoutStatistics;

      return stats.completedWorkouts > 0 && stats.completionRate >= 80;
    },
    recommendation: (ctx) => ({
      title: 'Можна поступово підвищувати складність',
      description:
        'Користувач стабільно виконує більшу частину плану. За відсутності надмірної складності можна поступово збільшувати інтенсивність тренувань.',
      explanation:
        `Правило спрацювало, тому що виконано ${ctx.workoutStatistics.completionRate}% активного тренувального плану.`,
    }),
  },
  {
    id: 'TRAINING_06',
    type: 'difficulty',
    priority: 8,
    condition: (ctx) => ctx.workoutStatistics.feedback.too_hard > 0,
    recommendation: (ctx) => ({
      title: 'Тренування можуть бути занадто складними',
      description:
        'Користувач позначив одне або кілька тренувань як занадто складні. Рекомендовано зменшити інтенсивність, кількість підходів або обрати вправи нижчого рівня.',
      explanation:
        `Правило спрацювало, тому що кількість оцінок "занадто складно" становить ${ctx.workoutStatistics.feedback.too_hard}.`,
    }),
  },
  {
    id: 'TRAINING_07',
    type: 'difficulty',
    priority: 5,
    condition: (ctx) => {
      const feedback = ctx.workoutStatistics.feedback;

      return feedback.easy >= 2 && ctx.workoutStatistics.completionRate >= 80;
    },
    recommendation: () => ({
      title: 'Можна додати складніші вправи',
      description:
        'Користувач стабільно виконує план і часто оцінює тренування як легкі. Доцільно поступово додати складніші вправи або збільшити кількість повторень.',
      explanation:
        'Правило спрацювало через поєднання високого відсотка виконання плану та кількох оцінок тренувань як легких.',
    }),
  },
  {
    id: 'GOAL_01',
    type: 'goal',
    priority: 4,
    condition: (ctx) => ctx.profile?.goal === 'weight_loss',
    recommendation: () => ({
      title: 'Фокус на регулярності та кардіонавантаженні',
      description:
        'Для цілі зниження ваги важливо підтримувати регулярність тренувань і поєднувати силові вправи з кардіоактивністю.',
      explanation:
        'Правило спрацювало, тому що в профілі користувача обрано ціль weight_loss.',
    }),
  },
  {
    id: 'GOAL_02',
    type: 'goal',
    priority: 4,
    condition: (ctx) => ctx.profile?.goal === 'muscle_gain',
    recommendation: () => ({
      title: 'Фокус на силових вправах і поступовому прогресі',
      description:
        'Для набору м’язової маси важливо виконувати силові вправи, контролювати відновлення та поступово збільшувати навантаження.',
      explanation:
        'Правило спрацювало, тому що в профілі користувача обрано ціль muscle_gain.',
    }),
  },
  {
    id: 'NUTRITION_01',
    type: 'nutrition',
    priority: 8,
    condition: (ctx) => !ctx.nutrition.targets,
    recommendation: () => ({
      title: 'Потрібно сформувати цілі харчування',
      description:
        'Для персоналізації харчування потрібно сформувати або вручну вказати добові цілі за калоріями, білками, жирами, вуглеводами та водою.',
      explanation:
        'Правило спрацювало, тому що для користувача не знайдено добові цілі харчування.',
    }),
  },
  {
    id: 'NUTRITION_02',
    type: 'nutrition',
    priority: 7,
    condition: (ctx) => {
      const summary = ctx.nutrition.summary;

      return ctx.nutrition.targets &&
        summary &&
        Number(summary.totalNutritionLogs || 0) === 0;
    },
    recommendation: () => ({
      title: 'Додайте перші записи харчування',
      description:
        'Добові цілі харчування вже сформовані, але за поточний день ще немає записів. Додайте прийоми їжі або воду для аналізу прогресу.',
      explanation:
        'Правило спрацювало, тому що за поточну дату не знайдено записів у журналі харчування.',
    }),
  },
  {
    id: 'NUTRITION_03',
    type: 'nutrition_calories',
    priority: 6,
    condition: (ctx) => {
      const progress = ctx.nutrition.progress;

      return progress && progress.caloriesPercent > 110;
    },
    recommendation: (ctx) => ({
      title: 'Перевищено добову ціль за калоріями',
      description:
        'Фактична калорійність за день перевищує заплановану норму. Рекомендовано переглянути калорійність наступних прийомів їжі.',
      explanation:
        `Правило спрацювало, тому що виконання добової цілі за калоріями становить ${ctx.nutrition.progress.caloriesPercent}%.`,
    }),
  },
  {
    id: 'NUTRITION_04',
    type: 'nutrition_calories',
    priority: 5,
    condition: (ctx) => {
      const progress = ctx.nutrition.progress;
      const logsCount = Number(ctx.nutrition.summary?.totalNutritionLogs || 0);

      return progress && logsCount > 0 && progress.caloriesPercent < 60;
    },
    recommendation: (ctx) => ({
      title: 'Калорійність за день суттєво нижча за ціль',
      description:
        'Зафіксована калорійність поки значно нижча за добову ціль. Варто перевірити, чи всі прийоми їжі внесено до журналу.',
      explanation:
        `Правило спрацювало, тому що виконання добової цілі за калоріями становить лише ${ctx.nutrition.progress.caloriesPercent}%.`,
    }),
  },
  {
    id: 'NUTRITION_05',
    type: 'nutrition_protein',
    priority: 5,
    condition: (ctx) => {
      const progress = ctx.nutrition.progress;
      const logsCount = Number(ctx.nutrition.summary?.totalNutritionLogs || 0);

      return progress && logsCount > 0 && progress.proteinPercent < 60;
    },
    recommendation: (ctx) => ({
      title: 'Недостатньо білка відносно добової цілі',
      description:
        'Поточні записи харчування показують недостатнє наближення до добової цілі за білками. Для тренувального прогресу важливо контролювати достатню кількість білка.',
      explanation:
        `Правило спрацювало, тому що виконання добової цілі за білками становить ${ctx.nutrition.progress.proteinPercent}%.`,
    }),
  },
  {
    id: 'NUTRITION_06',
    type: 'nutrition_water',
    priority: 5,
    condition: (ctx) => {
      const progress = ctx.nutrition.progress;
      const logsCount = Number(ctx.nutrition.summary?.totalNutritionLogs || 0);

      return progress && logsCount > 0 && progress.waterPercent < 60;
    },
    recommendation: (ctx) => ({
      title: 'Недостатньо води за поточний день',
      description:
        'Кількість внесеної води суттєво нижча за добову ціль. Рекомендовано рівномірно підтримувати водний баланс протягом дня.',
      explanation:
        `Правило спрацювало, тому що виконання добової цілі за водою становить ${ctx.nutrition.progress.waterPercent}%.`,
    }),
  },
  {
    id: 'NUTRITION_07',
    type: 'nutrition_balance',
    priority: 4,
    condition: (ctx) => {
      const progress = ctx.nutrition.progress;

      return progress &&
        progress.caloriesPercent >= 80 &&
        progress.caloriesPercent <= 110 &&
        progress.proteinPercent >= 70 &&
        progress.waterPercent >= 70;
    },
    recommendation: () => ({
      title: 'Показники харчування близькі до цільових',
      description:
        'Поточні записи харчування загалом відповідають добовим цілям. Рекомендовано підтримувати такий рівень регулярності.',
      explanation:
        'Правило спрацювало, тому що калорії, білки та вода перебувають у прийнятному діапазоні відносно добових цілей.',
    }),
  },
];

const evaluateRules = (ctx) => {
  const recommendations = [];

  for (const rule of expertRules) {
    if (rule.condition(ctx)) {
      const result = rule.recommendation(ctx);

      recommendations.push({
        ruleId: rule.id,
        type: rule.type,
        priority: rule.priority,
        title: result.title,
        description: result.description,
        explanation: result.explanation,
        source: 'rule_based_expert_system',
      });
    }
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
};

const saveRecommendations = async (userId, recommendations) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `
      DELETE FROM recommendations
      WHERE user_id = $1
      `,
      [userId]
    );

    for (const recommendation of recommendations) {
      await client.query(
        `
        INSERT INTO recommendations (
          user_id,
          rule_id,
          type,
          title,
          description,
          explanation,
          priority,
          source
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          userId,
          recommendation.ruleId,
          recommendation.type,
          recommendation.title,
          recommendation.description,
          recommendation.explanation,
          recommendation.priority,
          recommendation.source,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const generateRecommendationsForUser = async (userId) => {
  const ctx = await buildExpertContext(userId);

  const recommendations = evaluateRules(ctx);

  await saveRecommendations(userId, recommendations);

  return {
    profile: ctx.profile,
    plan: ctx.plan,
    statistics: ctx.workoutStatistics,
    nutrition: ctx.nutrition,
    recommendations,
  };
};

module.exports = {
  generateRecommendationsForUser,
};
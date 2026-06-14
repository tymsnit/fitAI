const pool = require('../config/db');

const roundToOneDecimal = (value) => {
  return Math.round(value * 10) / 10;
};

const buildRecommendation = (type, title, description) => {
  return {
    type,
    title,
    description,
    source: 'rule_based',
  };
};

const saveRecommendations = async (userId, recommendations) => {
  await pool.query(
    `
    DELETE FROM recommendations
    WHERE user_id = $1
      AND source = 'rule_based'
    `,
    [userId]
  );

  for (const recommendation of recommendations) {
    await pool.query(
      `
      INSERT INTO recommendations (
        user_id,
        type,
        title,
        description,
        source
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        userId,
        recommendation.type,
        recommendation.title,
        recommendation.description,
        recommendation.source,
      ]
    );
  }
};

const getUserProfile = async (userId) => {
  const result = await pool.query(
    `
    SELECT
      user_id AS "userId",
      name,
      age,
      gender,
      height,
      weight,
      fitness_level AS "fitnessLevel",
      goal,
      trainings_per_week AS "trainingsPerWeek"
    FROM user_profiles
    WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

const getActivePlan = async (userId) => {
  const result = await pool.query(
    `
    SELECT
      id,
      user_id AS "userId",
      title,
      goal,
      fitness_level AS "fitnessLevel",
      status,
      created_at AS "createdAt"
    FROM workout_plans
    WHERE user_id = $1
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

const getPlanStats = async (userId, planId) => {
  const totalWorkoutsResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM workouts
    WHERE plan_id = $1
    `,
    [planId]
  );

  const completedWorkoutsResult = await pool.query(
    `
    SELECT COUNT(DISTINCT wl.workout_id)::int AS completed
    FROM workout_logs wl
    JOIN workouts w ON w.id = wl.workout_id
    WHERE wl.user_id = $1
      AND w.plan_id = $2
    `,
    [userId, planId]
  );

  const feedbackResult = await pool.query(
    `
    SELECT
      difficulty_feedback AS "difficultyFeedback",
      COUNT(*)::int AS count
    FROM workout_logs wl
    JOIN workouts w ON w.id = wl.workout_id
    WHERE wl.user_id = $1
      AND w.plan_id = $2
    GROUP BY difficulty_feedback
    `,
    [userId, planId]
  );

  const totalWorkouts = totalWorkoutsResult.rows[0]?.total || 0;
  const completedWorkouts = completedWorkoutsResult.rows[0]?.completed || 0;

  const completionRate =
    totalWorkouts > 0
      ? roundToOneDecimal((completedWorkouts / totalWorkouts) * 100)
      : 0;

  const feedback = {
    easy: 0,
    normal: 0,
    hard: 0,
    too_hard: 0,
  };

  feedbackResult.rows.forEach((row) => {
    if (row.difficultyFeedback in feedback) {
      feedback[row.difficultyFeedback] = row.count;
    }
  });

  return {
    totalWorkouts,
    completedWorkouts,
    completionRate,
    feedback,
  };
};

const generateRecommendationsForUser = async (userId) => {
  const recommendations = [];

  const profile = await getUserProfile(userId);

  if (!profile) {
    recommendations.push(
      buildRecommendation(
        'profile',
        'Заповніть профіль користувача',
        'Система не може сформувати персональні рекомендації без даних про рівень підготовки, ціль і кількість тренувань на тиждень.'
      )
    );

    await saveRecommendations(userId, recommendations);

    return {
      profile: null,
      plan: null,
      statistics: null,
      recommendations,
    };
  }

  if (!profile.age || !profile.height || !profile.weight) {
    recommendations.push(
      buildRecommendation(
        'profile',
        'Доповніть фізичні параметри профілю',
        'Для точнішої персоналізації бажано вказати вік, зріст і вагу. Зараз система використовує лише базові параметри профілю.'
      )
    );
  }

  if (!profile.fitnessLevel || !profile.goal || !profile.trainingsPerWeek) {
    recommendations.push(
      buildRecommendation(
        'profile',
        'Вкажіть ціль і рівень підготовки',
        'Рекомендації FitAI залежать від цілі користувача, рівня фізичної підготовки та бажаної кількості тренувань на тиждень.'
      )
    );
  }

  const activePlan = await getActivePlan(userId);

  if (!activePlan) {
    recommendations.push(
      buildRecommendation(
        'workout_plan',
        'Згенеруйте персональний тренувальний план',
        'У користувача ще немає активного тренувального плану. Щоб отримати рекомендації щодо навантаження, спочатку потрібно створити план.'
      )
    );

    await saveRecommendations(userId, recommendations);

    return {
      profile,
      plan: null,
      statistics: null,
      recommendations,
    };
  }

  const statistics = await getPlanStats(userId, activePlan.id);

  if (statistics.totalWorkouts === 0) {
    recommendations.push(
      buildRecommendation(
        'workout_plan',
        'Поточний план не містить тренувань',
        'Активний план знайдено, але в ньому немає тренувальних днів. Рекомендується згенерувати новий план.'
      )
    );

    await saveRecommendations(userId, recommendations);

    return {
      profile,
      plan: activePlan,
      statistics,
      recommendations,
    };
  }

  if (statistics.completedWorkouts === 0) {
    recommendations.push(
      buildRecommendation(
        'consistency',
        'Почніть виконання плану з першого тренування',
        'Поточний план уже створено, але виконаних тренувань ще немає. Рекомендується почати з першого тренувального дня без підвищення навантаження.'
      )
    );
  }

  if (statistics.completionRate < 50 && statistics.completedWorkouts > 0) {
    recommendations.push(
      buildRecommendation(
        'training_load',
        'Рекомендовано зменшити навантаження',
        `Користувач виконав ${statistics.completedWorkouts} з ${statistics.totalWorkouts} тренувань, тобто ${statistics.completionRate}% плану. Це може свідчити, що поточна частота або складність тренувань завелика.`
      )
    );
  }

  if (statistics.completionRate >= 50 && statistics.completionRate < 80) {
    recommendations.push(
      buildRecommendation(
        'consistency',
        'Рекомендовано зберегти поточний рівень навантаження',
        `Користувач виконав ${statistics.completionRate}% плану. Це середній рівень виконання, тому систему навантаження поки краще не ускладнювати.`
      )
    );
  }

  if (statistics.completionRate >= 80) {
    recommendations.push(
      buildRecommendation(
        'progression',
        'Можна поступово підвищувати складність',
        `Користувач виконав ${statistics.completionRate}% плану. Це свідчить про добру регулярність, тому система може рекомендувати поступове підвищення складності або обсягу тренувань.`
      )
    );
  }

  if (statistics.feedback.too_hard > 0) {
    recommendations.push(
      buildRecommendation(
        'difficulty',
        'Поточні тренування можуть бути занадто складними',
        `Користувач ${statistics.feedback.too_hard} разів позначив тренування як занадто складне. Рекомендується зменшити кількість підходів, повторень або обрати простіші вправи.`
      )
    );
  }

  if (statistics.feedback.hard > statistics.feedback.normal) {
    recommendations.push(
      buildRecommendation(
        'difficulty',
        'Складність тренувань варто контролювати',
        'Кількість тренувань, позначених як складні, перевищує кількість тренувань із нормальною складністю. Рекомендується не підвищувати навантаження найближчим часом.'
      )
    );
  }

  if (statistics.feedback.easy >= 2 && statistics.completionRate >= 80) {
    recommendations.push(
      buildRecommendation(
        'progression',
        'Можна додати складніші вправи',
        'Користувач регулярно виконує план і кілька разів позначив тренування як легкі. Це може свідчити про готовність до поступового підвищення навантаження.'
      )
    );
  }

  if (profile.goal === 'weight_loss') {
    recommendations.push(
      buildRecommendation(
        'goal',
        'Фокус на регулярності та кардіонавантаженні',
        'Оскільки ціль користувача — зниження ваги, система рекомендує підтримувати регулярність тренувань і залишити в плані кардіовправи та вправи на все тіло.'
      )
    );
  }

  if (profile.goal === 'muscle_gain') {
    recommendations.push(
      buildRecommendation(
        'goal',
        'Фокус на силових вправах',
        'Оскільки ціль користувача — набір м’язової маси, система рекомендує поступово збільшувати силове навантаження, але лише за умови стабільного виконання плану.'
      )
    );
  }

  if (profile.goal === 'maintenance') {
    recommendations.push(
      buildRecommendation(
        'goal',
        'Підтримуйте збалансоване навантаження',
        'Оскільки ціль користувача — підтримка форми, система рекомендує поєднувати силові вправи, кардіо та вправи для корпусу.'
      )
    );
  }

  if (profile.goal === 'general_health') {
    recommendations.push(
      buildRecommendation(
        'goal',
        'Фокус на помірній активності',
        'Оскільки ціль користувача — загальне покращення здоров’я, система рекомендує помірне навантаження, регулярність і поступовість без різкого ускладнення плану.'
      )
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      buildRecommendation(
        'general',
        'Поточний план виглядає збалансованим',
        'На основі доступних даних система не виявила потреби змінювати план. Рекомендується продовжувати виконання поточного тренувального плану.'
      )
    );
  }

  await saveRecommendations(userId, recommendations);

  return {
    profile,
    plan: activePlan,
    statistics,
    recommendations,
  };
};

module.exports = {
  generateRecommendationsForUser,
};
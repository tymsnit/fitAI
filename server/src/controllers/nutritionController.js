const pool = require('../config/db');

const allowedMealTypes = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'water',
];

const getActivityFactor = (trainingsPerWeek) => {
  const value = Number(trainingsPerWeek || 0);

  if (value >= 5) {
    return 1.65;
  }

  if (value >= 3) {
    return 1.5;
  }

  if (value >= 1) {
    return 1.35;
  }

  return 1.2;
};

const calculateDefaultTargets = (profile) => {
  const age = Number(profile.age);
  const height = Number(profile.height);
  const weight = Number(profile.weight);

  if (!age || !height || !weight) {
    return null;
  }

  // Для користувачів до 18 років не розраховуємо автоматичні
  // харчові цілі, щоб не створювати ризик некоректних дієтичних порад.
  if (age < 18) {
    return null;
  }

  let bmr;

  if (profile.gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (profile.gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 78;
  }

  const activityFactor = getActivityFactor(profile.trainingsPerWeek);
  let calories = bmr * activityFactor;

  if (profile.goal === 'weight_loss') {
    calories *= 0.9;
  }

  if (profile.goal === 'muscle_gain') {
    calories *= 1.1;
  }

  const roundedCalories = Math.round(calories);

  const proteinMultiplier = profile.goal === 'muscle_gain' ? 1.6 : 1.3;
  const dailyProtein = Math.round(weight * proteinMultiplier);

  const dailyFats = Math.round((roundedCalories * 0.25) / 9);

  const proteinCalories = dailyProtein * 4;
  const fatsCalories = dailyFats * 9;
  const carbsCalories = Math.max(roundedCalories - proteinCalories - fatsCalories, 0);
  const dailyCarbs = Math.round(carbsCalories / 4);

  const dailyWaterMl = Math.round(weight * 30);

  return {
    dailyCalories: roundedCalories,
    dailyProtein,
    dailyFats,
    dailyCarbs,
    dailyWaterMl,
  };
};

const getUserProfile = async (userId) => {
  const result = await pool.query(
    `
    SELECT
      user_id AS "userId",
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

const getNutritionTargets = async (req, res) => {
  try {
    const userId = req.user.id;

    const existingTargets = await pool.query(
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

    if (existingTargets.rows.length > 0) {
      return res.json({
        targets: existingTargets.rows[0],
      });
    }

    const profile = await getUserProfile(userId);
    const calculatedTargets = profile ? calculateDefaultTargets(profile) : null;

    if (!calculatedTargets) {
      return res.json({
        targets: null,
        message:
          'Nutrition targets cannot be calculated automatically. Please complete profile data or set targets manually.',
      });
    }

    const createdTargets = await pool.query(
      `
      INSERT INTO nutrition_targets (
        user_id,
        daily_calories,
        daily_protein,
        daily_fats,
        daily_carbs,
        daily_water_ml,
        source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
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
      `,
      [
        userId,
        calculatedTargets.dailyCalories,
        calculatedTargets.dailyProtein,
        calculatedTargets.dailyFats,
        calculatedTargets.dailyCarbs,
        calculatedTargets.dailyWaterMl,
        'calculated',
      ]
    );

    res.json({
      targets: createdTargets.rows[0],
    });
  } catch (error) {
    console.error('Error getting nutrition targets:', error);

    res.status(500).json({
      message: 'Server error while getting nutrition targets',
    });
  }
};

const updateNutritionTargets = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      dailyCalories,
      dailyProtein,
      dailyFats,
      dailyCarbs,
      dailyWaterMl,
    } = req.body;

    if (
      Number(dailyCalories) <= 0 ||
      Number(dailyProtein) < 0 ||
      Number(dailyFats) < 0 ||
      Number(dailyCarbs) < 0 ||
      Number(dailyWaterMl) < 0
    ) {
      return res.status(400).json({
        message: 'Nutrition target values are invalid',
      });
    }

    const result = await pool.query(
      `
      INSERT INTO nutrition_targets (
        user_id,
        daily_calories,
        daily_protein,
        daily_fats,
        daily_carbs,
        daily_water_ml,
        source
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'manual')
      ON CONFLICT (user_id)
      DO UPDATE SET
        daily_calories = EXCLUDED.daily_calories,
        daily_protein = EXCLUDED.daily_protein,
        daily_fats = EXCLUDED.daily_fats,
        daily_carbs = EXCLUDED.daily_carbs,
        daily_water_ml = EXCLUDED.daily_water_ml,
        source = 'manual',
        updated_at = CURRENT_TIMESTAMP
      RETURNING
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
      `,
      [
        userId,
        dailyCalories,
        dailyProtein,
        dailyFats,
        dailyCarbs,
        dailyWaterMl,
      ]
    );

    res.json({
      message: 'Nutrition targets updated successfully',
      targets: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating nutrition targets:', error);

    res.status(500).json({
      message: 'Server error while updating nutrition targets',
    });
  }
};

const createNutritionLog = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      mealType,
      productName,
      calories = 0,
      protein = 0,
      fats = 0,
      carbs = 0,
      waterMl = 0,
      loggedAt,
    } = req.body;

    if (!mealType || !allowedMealTypes.includes(mealType)) {
      return res.status(400).json({
        message: 'Invalid meal type',
        allowedValues: allowedMealTypes,
      });
    }

    if (!productName) {
      return res.status(400).json({
        message: 'Product name is required',
      });
    }

    if (
      Number(calories) < 0 ||
      Number(protein) < 0 ||
      Number(fats) < 0 ||
      Number(carbs) < 0 ||
      Number(waterMl) < 0
    ) {
      return res.status(400).json({
        message: 'Nutrition values cannot be negative',
      });
    }

    const result = await pool.query(
      `
      INSERT INTO nutrition_logs (
        user_id,
        meal_type,
        product_name,
        calories,
        protein,
        fats,
        carbs,
        water_ml,
        logged_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, CURRENT_TIMESTAMP))
      RETURNING
        id,
        user_id AS "userId",
        meal_type AS "mealType",
        product_name AS "productName",
        calories,
        protein,
        fats,
        carbs,
        water_ml AS "waterMl",
        logged_at AS "loggedAt",
        created_at AS "createdAt"
      `,
      [
        userId,
        mealType,
        productName,
        calories,
        protein,
        fats,
        carbs,
        waterMl,
        loggedAt || null,
      ]
    );

    res.status(201).json({
      message: 'Nutrition log created successfully',
      log: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating nutrition log:', error);

    res.status(500).json({
      message: 'Server error while creating nutrition log',
    });
  }
};

const getNutritionLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    const values = [userId];

    let query = `
      SELECT
        id,
        user_id AS "userId",
        meal_type AS "mealType",
        product_name AS "productName",
        calories,
        protein,
        fats,
        carbs,
        water_ml AS "waterMl",
        logged_at AS "loggedAt",
        created_at AS "createdAt"
      FROM nutrition_logs
      WHERE user_id = $1
    `;

    if (date) {
      values.push(date);
      query += ` AND DATE(logged_at) = $${values.length}`;
    }

    query += ` ORDER BY logged_at DESC`;

    const result = await pool.query(query, values);

    res.json({
      count: result.rows.length,
      logs: result.rows,
    });
  } catch (error) {
    console.error('Error getting nutrition logs:', error);

    res.status(500).json({
      message: 'Server error while getting nutrition logs',
    });
  }
};

const getNutritionSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    const summaryDate = date || new Date().toISOString().slice(0, 10);

    const summaryResult = await pool.query(
      `
      SELECT
        COALESCE(SUM(calories), 0)::INTEGER AS "totalCalories",
        COALESCE(SUM(protein), 0)::NUMERIC(8,2) AS "totalProtein",
        COALESCE(SUM(fats), 0)::NUMERIC(8,2) AS "totalFats",
        COALESCE(SUM(carbs), 0)::NUMERIC(8,2) AS "totalCarbs",
        COALESCE(SUM(water_ml), 0)::INTEGER AS "totalWaterMl"
      FROM nutrition_logs
      WHERE user_id = $1
        AND DATE(logged_at) = $2
      `,
      [userId, summaryDate]
    );

    const targetsResult = await pool.query(
      `
      SELECT
        daily_calories AS "dailyCalories",
        daily_protein AS "dailyProtein",
        daily_fats AS "dailyFats",
        daily_carbs AS "dailyCarbs",
        daily_water_ml AS "dailyWaterMl",
        source
      FROM nutrition_targets
      WHERE user_id = $1
      `,
      [userId]
    );

    res.json({
      date: summaryDate,
      summary: summaryResult.rows[0],
      targets: targetsResult.rows[0] || null,
    });
  } catch (error) {
    console.error('Error getting nutrition summary:', error);

    res.status(500).json({
      message: 'Server error while getting nutrition summary',
    });
  }
};

const deleteNutritionLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const logId = Number(req.params.id);

    if (!Number.isInteger(logId) || logId <= 0) {
      return res.status(400).json({
        message: 'Invalid nutrition log id',
      });
    }

    const result = await pool.query(
      `
      DELETE FROM nutrition_logs
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [logId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Nutrition log not found',
      });
    }

    res.json({
      message: 'Nutrition log deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting nutrition log:', error);

    res.status(500).json({
      message: 'Server error while deleting nutrition log',
    });
  }
};

module.exports = {
  getNutritionTargets,
  updateNutritionTargets,
  createNutritionLog,
  getNutritionLogs,
  getNutritionSummary,
  deleteNutritionLog,
};
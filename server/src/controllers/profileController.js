const pool = require('../config/db');

const allowedFitnessLevels = ['beginner', 'intermediate', 'advanced'];

const allowedGoals = [
  'weight_loss',
  'muscle_gain',
  'maintenance',
  'general_health',
];

const getProfile = async (req, res) => {
  try {
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
      [req.user.id]
    );

    if (result.rows.length === 0) {
      const createdProfile = await pool.query(
        `
        INSERT INTO user_profiles (
          user_id,
          fitness_level,
          goal,
          trainings_per_week
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
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
        `,
        [req.user.id, 'beginner', 'maintenance', 3]
      );

      return res.json({
        profile: createdProfile.rows[0],
      });
    }

    res.json({
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting profile:', error);

    res.status(500).json({
      message: 'Server error while getting profile',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      name,
      age,
      gender,
      height,
      weight,
      fitnessLevel,
      goal,
      trainingsPerWeek,
    } = req.body;

    if (age !== undefined && (Number(age) <= 0 || Number(age) >= 120)) {
      return res.status(400).json({
        message: 'Age must be between 1 and 119',
      });
    }

    if (height !== undefined && Number(height) <= 0) {
      return res.status(400).json({
        message: 'Height must be greater than 0',
      });
    }

    if (weight !== undefined && Number(weight) <= 0) {
      return res.status(400).json({
        message: 'Weight must be greater than 0',
      });
    }

    if (
      trainingsPerWeek !== undefined &&
      (Number(trainingsPerWeek) < 1 || Number(trainingsPerWeek) > 7)
    ) {
      return res.status(400).json({
        message: 'Trainings per week must be between 1 and 7',
      });
    }

    if (
      fitnessLevel !== undefined &&
      !allowedFitnessLevels.includes(fitnessLevel)
    ) {
      return res.status(400).json({
        message: 'Invalid fitness level',
        allowedValues: allowedFitnessLevels,
      });
    }

    if (goal !== undefined && !allowedGoals.includes(goal)) {
      return res.status(400).json({
        message: 'Invalid goal',
        allowedValues: allowedGoals,
      });
    }

    const existingProfile = await pool.query(
      `
      SELECT id
      FROM user_profiles
      WHERE user_id = $1
      `,
      [req.user.id]
    );

    if (existingProfile.rows.length === 0) {
      await pool.query(
        `
        INSERT INTO user_profiles (
          user_id,
          fitness_level,
          goal,
          trainings_per_week
        )
        VALUES ($1, $2, $3, $4)
        `,
        [req.user.id, 'beginner', 'maintenance', 3]
      );
    }

    const result = await pool.query(
      `
      UPDATE user_profiles
      SET
        name = COALESCE($1, name),
        age = COALESCE($2, age),
        gender = COALESCE($3, gender),
        height = COALESCE($4, height),
        weight = COALESCE($5, weight),
        fitness_level = COALESCE($6, fitness_level),
        goal = COALESCE($7, goal),
        trainings_per_week = COALESCE($8, trainings_per_week),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $9
      RETURNING
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
      `,
      [
        name ?? null,
        age ?? null,
        gender ?? null,
        height ?? null,
        weight ?? null,
        fitnessLevel ?? null,
        goal ?? null,
        trainingsPerWeek ?? null,
        req.user.id,
      ]
    );

    res.json({
      message: 'Profile updated successfully',
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating profile:', error);

    res.status(500).json({
      message: 'Server error while updating profile',
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
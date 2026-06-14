const pool = require('../config/db');

const allowedDifficultyFeedback = ['easy', 'normal', 'hard', 'too_hard'];

const completeWorkout = async (req, res) => {
  try {
    const userId = req.user.id;
    const workoutId = Number(req.params.id);

    const {
      difficultyFeedback = 'normal',
      comment = null,
    } = req.body || {};

    if (!Number.isInteger(workoutId) || workoutId <= 0) {
      return res.status(400).json({
        message: 'Invalid workout id',
      });
    }

    if (
      difficultyFeedback &&
      !allowedDifficultyFeedback.includes(difficultyFeedback)
    ) {
      return res.status(400).json({
        message: 'Invalid difficulty feedback',
        allowedValues: allowedDifficultyFeedback,
      });
    }

    const workoutResult = await pool.query(
      `
      SELECT
        w.id,
        w.title,
        w.day_number AS "dayNumber",
        w.description,
        w.estimated_duration AS "estimatedDuration",
        wp.id AS "planId",
        wp.user_id AS "userId",
        wp.status AS "planStatus"
      FROM workouts w
      JOIN workout_plans wp ON wp.id = w.plan_id
      WHERE w.id = $1
        AND wp.user_id = $2
      `,
      [workoutId, userId]
    );

    if (workoutResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Workout not found for this user',
      });
    }

    const workout = workoutResult.rows[0];

    const existingLogResult = await pool.query(
      `
      SELECT
        id,
        user_id AS "userId",
        workout_id AS "workoutId",
        completed_at AS "completedAt",
        difficulty_feedback AS "difficultyFeedback",
        comment,
        created_at AS "createdAt"
      FROM workout_logs
      WHERE user_id = $1
        AND workout_id = $2
      LIMIT 1
      `,
      [userId, workoutId]
    );

    if (existingLogResult.rows.length > 0) {
      return res.json({
        message: 'Workout already completed',
        workout,
        log: existingLogResult.rows[0],
      });
    }

    const logResult = await pool.query(
      `
      INSERT INTO workout_logs (
        user_id,
        workout_id,
        difficulty_feedback,
        comment
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        user_id AS "userId",
        workout_id AS "workoutId",
        completed_at AS "completedAt",
        difficulty_feedback AS "difficultyFeedback",
        comment,
        created_at AS "createdAt"
      `,
      [
        userId,
        workoutId,
        difficultyFeedback,
        comment,
      ]
    );

    res.status(201).json({
      message: 'Workout completed successfully',
      workout,
      log: logResult.rows[0],
    });
  } catch (error) {
    console.error('Error completing workout:', error);

    res.status(500).json({
      message: 'Server error while completing workout',
    });
  }
};

const getWorkoutHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        wl.id,
        wl.user_id AS "userId",
        wl.workout_id AS "workoutId",
        wl.completed_at AS "completedAt",
        wl.difficulty_feedback AS "difficultyFeedback",
        wl.comment,

        w.title AS "workoutTitle",
        w.day_number AS "dayNumber",
        w.estimated_duration AS "estimatedDuration",

        wp.id AS "planId",
        wp.title AS "planTitle",
        wp.goal,
        wp.fitness_level AS "fitnessLevel"
      FROM workout_logs wl
      JOIN workouts w ON w.id = wl.workout_id
      JOIN workout_plans wp ON wp.id = w.plan_id
      WHERE wl.user_id = $1
      ORDER BY wl.completed_at DESC
      `,
      [userId]
    );

    res.json({
      count: result.rows.length,
      history: result.rows,
    });
  } catch (error) {
    console.error('Error getting workout history:', error);

    res.status(500).json({
      message: 'Server error while getting workout history',
    });
  }
};

module.exports = {
  completeWorkout,
  getWorkoutHistory,
};
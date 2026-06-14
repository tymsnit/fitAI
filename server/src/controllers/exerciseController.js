const pool = require('../config/db');

const getExercises = async (req, res) => {
  try {
    const { category, difficulty, muscleGroup } = req.query;

    let query = `
      SELECT 
        id,
        name,
        description,
        category,
        muscle_group AS "muscleGroup",
        difficulty,
        equipment,
        duration_minutes AS "durationMinutes",
        repetitions,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM exercises
      WHERE 1 = 1
    `;

    const values = [];

    if (category) {
      values.push(category);
      query += ` AND category = $${values.length}`;
    }

    if (difficulty) {
      values.push(difficulty);
      query += ` AND difficulty = $${values.length}`;
    }

    if (muscleGroup) {
      values.push(muscleGroup);
      query += ` AND muscle_group = $${values.length}`;
    }

    query += ` ORDER BY id ASC`;

    const result = await pool.query(query, values);

    res.json({
      count: result.rows.length,
      exercises: result.rows,
    });
  } catch (error) {
    console.error('Error getting exercises:', error);

    res.status(500).json({
      message: 'Server error while getting exercises',
    });
  }
};

const getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        id,
        name,
        description,
        category,
        muscle_group AS "muscleGroup",
        difficulty,
        equipment,
        duration_minutes AS "durationMinutes",
        repetitions,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM exercises
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Exercise not found',
      });
    }

    res.json({
      exercise: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting exercise by id:', error);

    res.status(500).json({
      message: 'Server error while getting exercise',
    });
  }
};

module.exports = {
  getExercises,
  getExerciseById,
};
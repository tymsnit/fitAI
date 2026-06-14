const pool = require('../config/db');

const getAllowedDifficulties = (fitnessLevel) => {
  if (fitnessLevel === 'beginner') {
    return ['beginner'];
  }

  if (fitnessLevel === 'intermediate') {
    return ['beginner', 'intermediate'];
  }

  if (fitnessLevel === 'advanced') {
    return ['beginner', 'intermediate', 'advanced'];
  }

  return ['beginner'];
};

const getPreferredCategories = (goal) => {
  if (goal === 'weight_loss') {
    return ['cardio', 'strength', 'core'];
  }

  if (goal === 'muscle_gain') {
    return ['strength', 'core'];
  }

  if (goal === 'maintenance') {
    return ['strength', 'cardio', 'core'];
  }

  if (goal === 'general_health') {
    return ['cardio', 'core', 'strength'];
  }

  return ['strength', 'cardio', 'core'];
};

const getWorkoutTitle = (dayNumber, goal) => {
  const goalLabels = {
    weight_loss: 'тренування для зниження ваги',
    muscle_gain: 'силове тренування',
    maintenance: 'збалансоване тренування',
    general_health: 'тренування для загального здоров’я',
  };

  return `День ${dayNumber}: ${goalLabels[goal] || 'персональне тренування'}`;
};

const getExerciseLoad = (exercise, fitnessLevel) => {
  if (exercise.duration_minutes) {
    if (fitnessLevel === 'beginner') {
      return {
        sets: null,
        reps: null,
        durationMinutes: exercise.duration_minutes,
        restSeconds: 60,
      };
    }

    if (fitnessLevel === 'intermediate') {
      return {
        sets: null,
        reps: null,
        durationMinutes: exercise.duration_minutes + 2,
        restSeconds: 45,
      };
    }

    return {
      sets: null,
      reps: null,
      durationMinutes: exercise.duration_minutes + 4,
      restSeconds: 30,
    };
  }

  const baseReps = exercise.repetitions || 10;

  if (fitnessLevel === 'beginner') {
    return {
      sets: 2,
      reps: baseReps,
      durationMinutes: null,
      restSeconds: 75,
    };
  }

  if (fitnessLevel === 'intermediate') {
    return {
      sets: 3,
      reps: baseReps + 2,
      durationMinutes: null,
      restSeconds: 60,
    };
  }

  return {
    sets: 4,
    reps: baseReps + 5,
    durationMinutes: null,
    restSeconds: 45,
  };
};

const buildWorkoutDays = (exercises, trainingsPerWeek, goal, fitnessLevel) => {
  const workoutDays = [];

  for (let day = 1; day <= trainingsPerWeek; day += 1) {
    const selectedExercises = [];

    for (let i = 0; i < exercises.length; i += 1) {
      if (selectedExercises.length >= 4) {
        break;
      }

      const exerciseIndex = (day + i - 1) % exercises.length;
      const exercise = exercises[exerciseIndex];

      if (!selectedExercises.find((item) => item.id === exercise.id)) {
        selectedExercises.push(exercise);
      }
    }

    workoutDays.push({
      title: getWorkoutTitle(day, goal),
      dayNumber: day,
      description: `Персональне тренування №${day}, сформоване на основі мети та рівня підготовки користувача.`,
      estimatedDuration: fitnessLevel === 'beginner' ? 25 : fitnessLevel === 'intermediate' ? 35 : 45,
      exercises: selectedExercises,
    });
  }

  return workoutDays;
};

const generateWorkoutPlanForUser = async (userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const profileResult = await client.query(
      `
      SELECT
        user_id,
        fitness_level,
        goal,
        trainings_per_week
      FROM user_profiles
      WHERE user_id = $1
      `,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      const error = new Error('User profile not found');
      error.statusCode = 404;
      throw error;
    }

    const profile = profileResult.rows[0];

    const fitnessLevel = profile.fitness_level || 'beginner';
    const goal = profile.goal || 'maintenance';
    const trainingsPerWeek = profile.trainings_per_week || 3;

    const allowedDifficulties = getAllowedDifficulties(fitnessLevel);
    const preferredCategories = getPreferredCategories(goal);

    let exercisesResult = await client.query(
      `
      SELECT
        id,
        name,
        description,
        category,
        muscle_group,
        difficulty,
        equipment,
        duration_minutes,
        repetitions
      FROM exercises
      WHERE difficulty = ANY($1::text[])
        AND category = ANY($2::text[])
      ORDER BY
        CASE category
          WHEN 'cardio' THEN 1
          WHEN 'strength' THEN 2
          WHEN 'core' THEN 3
          ELSE 4
        END,
        id ASC
      `,
      [allowedDifficulties, preferredCategories]
    );

    if (exercisesResult.rows.length < 3) {
      exercisesResult = await client.query(
        `
        SELECT
          id,
          name,
          description,
          category,
          muscle_group,
          difficulty,
          equipment,
          duration_minutes,
          repetitions
        FROM exercises
        WHERE difficulty = ANY($1::text[])
        ORDER BY id ASC
        `,
        [allowedDifficulties]
      );
    }

    if (exercisesResult.rows.length === 0) {
      const error = new Error('No exercises found for this profile');
      error.statusCode = 404;
      throw error;
    }

    await client.query(
      `
      UPDATE workout_plans
      SET status = 'archived',
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND status = 'active'
      `,
      [userId]
    );

    const planResult = await client.query(
      `
      INSERT INTO workout_plans (
        user_id,
        title,
        goal,
        fitness_level,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        user_id AS "userId",
        title,
        goal,
        fitness_level AS "fitnessLevel",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        userId,
        'Персональний тренувальний план FitAI',
        goal,
        fitnessLevel,
        'active',
      ]
    );

    const plan = planResult.rows[0];

    const workoutDays = buildWorkoutDays(
      exercisesResult.rows,
      trainingsPerWeek,
      goal,
      fitnessLevel
    );

    const createdWorkouts = [];

    for (const workoutDay of workoutDays) {
      const workoutResult = await client.query(
        `
        INSERT INTO workouts (
          plan_id,
          title,
          day_number,
          description,
          estimated_duration
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          plan_id AS "planId",
          title,
          day_number AS "dayNumber",
          description,
          estimated_duration AS "estimatedDuration",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        `,
        [
          plan.id,
          workoutDay.title,
          workoutDay.dayNumber,
          workoutDay.description,
          workoutDay.estimatedDuration,
        ]
      );

      const workout = workoutResult.rows[0];
      const workoutExercises = [];

      for (let i = 0; i < workoutDay.exercises.length; i += 1) {
        const exercise = workoutDay.exercises[i];
        const load = getExerciseLoad(exercise, fitnessLevel);

        const workoutExerciseResult = await client.query(
          `
          INSERT INTO workout_exercises (
            workout_id,
            exercise_id,
            sets,
            reps,
            duration_minutes,
            rest_seconds,
            order_index
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING
            id,
            workout_id AS "workoutId",
            exercise_id AS "exerciseId",
            sets,
            reps,
            duration_minutes AS "durationMinutes",
            rest_seconds AS "restSeconds",
            order_index AS "orderIndex"
          `,
          [
            workout.id,
            exercise.id,
            load.sets,
            load.reps,
            load.durationMinutes,
            load.restSeconds,
            i + 1,
          ]
        );

        workoutExercises.push({
          ...workoutExerciseResult.rows[0],
          exercise: {
            id: exercise.id,
            name: exercise.name,
            description: exercise.description,
            category: exercise.category,
            muscleGroup: exercise.muscle_group,
            difficulty: exercise.difficulty,
            equipment: exercise.equipment,
          },
        });
      }

      createdWorkouts.push({
        ...workout,
        exercises: workoutExercises,
      });
    }

    await client.query('COMMIT');

    return {
      ...plan,
      workouts: createdWorkouts,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getCurrentWorkoutPlanForUser = async (userId) => {
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

  const workoutIds = workoutsResult.rows.map((workout) => workout.id);

  if (workoutIds.length === 0) {
    return {
      ...plan,
      workouts: [],
    };
  }

  const exercisesResult = await pool.query(
    `
    SELECT
      we.id,
      we.workout_id AS "workoutId",
      we.exercise_id AS "exerciseId",
      we.sets,
      we.reps,
      we.duration_minutes AS "durationMinutes",
      we.rest_seconds AS "restSeconds",
      we.order_index AS "orderIndex",

      e.name,
      e.description,
      e.category,
      e.muscle_group AS "muscleGroup",
      e.difficulty,
      e.equipment
    FROM workout_exercises we
    JOIN exercises e ON e.id = we.exercise_id
    WHERE we.workout_id = ANY($1::int[])
    ORDER BY we.workout_id ASC, we.order_index ASC
    `,
    [workoutIds]
  );

  const workouts = workoutsResult.rows.map((workout) => {
    const exercises = exercisesResult.rows
      .filter((item) => item.workoutId === workout.id)
      .map((item) => ({
        id: item.id,
        workoutId: item.workoutId,
        exerciseId: item.exerciseId,
        sets: item.sets,
        reps: item.reps,
        durationMinutes: item.durationMinutes,
        restSeconds: item.restSeconds,
        orderIndex: item.orderIndex,
        exercise: {
          id: item.exerciseId,
          name: item.name,
          description: item.description,
          category: item.category,
          muscleGroup: item.muscleGroup,
          difficulty: item.difficulty,
          equipment: item.equipment,
        },
      }));

    return {
      ...workout,
      exercises,
    };
  });

  return {
    ...plan,
    workouts,
  };
};

module.exports = {
  generateWorkoutPlanForUser,
  getCurrentWorkoutPlanForUser,
};
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS workout_logs CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS workout_plans CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(100),
    age INTEGER CHECK (age > 0 AND age < 120),
    gender VARCHAR(20),

    height INTEGER CHECK (height > 0),
    weight NUMERIC(5,2) CHECK (weight > 0),

    fitness_level VARCHAR(50) NOT NULL DEFAULT 'beginner',
    goal VARCHAR(50) NOT NULL DEFAULT 'maintenance',
    trainings_per_week INTEGER CHECK (trainings_per_week BETWEEN 1 AND 7),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL,
    description TEXT,

    category VARCHAR(50) NOT NULL,
    muscle_group VARCHAR(50),
    difficulty VARCHAR(50) NOT NULL,

    equipment VARCHAR(100),
    duration_minutes INTEGER,
    repetitions INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workout_plans (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title VARCHAR(150) NOT NULL,
    goal VARCHAR(50) NOT NULL,
    fitness_level VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workouts (
    id SERIAL PRIMARY KEY,

    plan_id INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,

    title VARCHAR(150) NOT NULL,
    day_number INTEGER NOT NULL,
    description TEXT,
    estimated_duration INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workout_exercises (
    id SERIAL PRIMARY KEY,

    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

    sets INTEGER,
    reps INTEGER,
    duration_minutes INTEGER,
    rest_seconds INTEGER,
    order_index INTEGER
);

CREATE TABLE workout_logs (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,

    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    difficulty_feedback VARCHAR(50),
    comment TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_logs_user_workout
ON workout_logs(user_id, workout_id);

CREATE TABLE recommendations (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'rule_based',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
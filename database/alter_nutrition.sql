CREATE TABLE IF NOT EXISTS nutrition_targets (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    daily_calories INTEGER CHECK (daily_calories > 0),
    daily_protein NUMERIC(6,2) CHECK (daily_protein >= 0),
    daily_fats NUMERIC(6,2) CHECK (daily_fats >= 0),
    daily_carbs NUMERIC(6,2) CHECK (daily_carbs >= 0),
    daily_water_ml INTEGER CHECK (daily_water_ml >= 0),

    source VARCHAR(50) DEFAULT 'calculated',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nutrition_logs (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    meal_type VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,

    calories INTEGER DEFAULT 0 CHECK (calories >= 0),
    protein NUMERIC(6,2) DEFAULT 0 CHECK (protein >= 0),
    fats NUMERIC(6,2) DEFAULT 0 CHECK (fats >= 0),
    carbs NUMERIC(6,2) DEFAULT 0 CHECK (carbs >= 0),
    water_ml INTEGER DEFAULT 0 CHECK (water_ml >= 0),

    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_logged_at
ON nutrition_logs(user_id, logged_at);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_meal_type
ON nutrition_logs(user_id, meal_type);
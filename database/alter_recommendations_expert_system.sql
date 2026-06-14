ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS rule_id VARCHAR(50);

ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;

ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS explanation TEXT;

CREATE INDEX IF NOT EXISTS idx_recommendations_user_rule
ON recommendations(user_id, rule_id);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_priority
ON recommendations(user_id, priority);
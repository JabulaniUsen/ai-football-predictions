-- Migration: Add new fields to predictions table
-- Date: 2025-01-XX
-- Description: Adds fields for actual scores, result status, marking, and AI reasoning

-- Add actual_score_home column (integer, nullable)
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS actual_score_home INTEGER;

-- Add actual_score_away column (integer, nullable)
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS actual_score_away INTEGER;

-- Add result_status column (text, nullable)
-- Values: 'win', 'loss', 'draw'
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS result_status TEXT
CHECK (result_status IN ('win', 'loss', 'draw') OR result_status IS NULL);

-- Add is_marked column (boolean, default false)
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS is_marked BOOLEAN DEFAULT FALSE;

-- Add ai_reasoning column (text, nullable)
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

-- Add index on result_status for faster queries
CREATE INDEX IF NOT EXISTS idx_predictions_result_status ON predictions(result_status);

-- Add index on is_marked for faster queries
CREATE INDEX IF NOT EXISTS idx_predictions_is_marked ON predictions(is_marked);

-- Add index on actual_score_home and actual_score_away for filtering
CREATE INDEX IF NOT EXISTS idx_predictions_actual_scores ON predictions(actual_score_home, actual_score_away);

-- Update existing rows to set is_marked to false if NULL
UPDATE predictions
SET is_marked = FALSE
WHERE is_marked IS NULL;

-- Add comment to columns for documentation
COMMENT ON COLUMN predictions.actual_score_home IS 'Actual home team score from the match result';
COMMENT ON COLUMN predictions.actual_score_away IS 'Actual away team score from the match result';
COMMENT ON COLUMN predictions.result_status IS 'Prediction result: win (correct), loss (incorrect), or draw (partially correct)';
COMMENT ON COLUMN predictions.is_marked IS 'Whether the prediction has been marked/reviewed by the user';
COMMENT ON COLUMN predictions.ai_reasoning IS 'AI-generated reasoning/note explaining the prediction';


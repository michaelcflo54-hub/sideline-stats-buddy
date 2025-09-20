-- Add penalty tracking fields to plays table
ALTER TABLE public.plays 
ADD COLUMN penalty_type TEXT,
ADD COLUMN penalty_yards INTEGER,
ADD COLUMN penalty_team TEXT CHECK (penalty_team IN ('us', 'opponent')),
ADD COLUMN penalty_player TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.plays.penalty_type IS 'Type of penalty (holding, false start, etc.)';
COMMENT ON COLUMN public.plays.penalty_yards IS 'Number of yards penalized';
COMMENT ON COLUMN public.plays.penalty_team IS 'Which team was penalized: us or opponent';
COMMENT ON COLUMN public.plays.penalty_player IS 'Player name or number who committed penalty';
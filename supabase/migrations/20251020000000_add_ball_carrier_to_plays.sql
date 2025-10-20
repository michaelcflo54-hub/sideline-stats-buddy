-- Add ball_carrier and quarterback fields to plays table for player statistics
ALTER TABLE public.plays 
ADD COLUMN ball_carrier TEXT,
ADD COLUMN quarterback TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.plays.ball_carrier IS 'Name of the player who carried or received the ball on this play';
COMMENT ON COLUMN public.plays.quarterback IS 'Name of the quarterback on this play';

-- Create indexes for faster player stats queries
CREATE INDEX idx_plays_ball_carrier ON public.plays(ball_carrier) WHERE ball_carrier IS NOT NULL;
CREATE INDEX idx_plays_quarterback ON public.plays(quarterback) WHERE quarterback IS NOT NULL;

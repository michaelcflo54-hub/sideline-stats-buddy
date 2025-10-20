-- Add ball_carrier field to plays table for player statistics
ALTER TABLE public.plays 
ADD COLUMN ball_carrier TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.plays.ball_carrier IS 'Name of the player who carried or received the ball on this play';

-- Create index for faster player stats queries
CREATE INDEX idx_plays_ball_carrier ON public.plays(ball_carrier) WHERE ball_carrier IS NOT NULL;

-- Modify players table to support multiple positions
-- First, add a new column for multiple positions
ALTER TABLE public.players ADD COLUMN positions text[];

-- Copy existing position data to the new array column
UPDATE public.players SET positions = ARRAY[position] WHERE position IS NOT NULL;

-- Drop the old position column
ALTER TABLE public.players DROP COLUMN position;

-- Add constraint to ensure at least one position is provided
ALTER TABLE public.players ADD CONSTRAINT players_positions_not_empty CHECK (array_length(positions, 1) > 0);
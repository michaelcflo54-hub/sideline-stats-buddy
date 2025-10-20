# Database Migration Instructions

## Excel Import Fix - Required Database Changes

The Excel import requires two new columns in the `plays` table. Please run this SQL in your Supabase SQL Editor:

### Step 1: Go to Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your Sideline Stats Buddy project
3. Click "SQL Editor" in the left sidebar

### Step 2: Run the Migration
Copy and paste this SQL code and click "Run":

```sql
-- Add ball_carrier and quarterback fields to plays table for player statistics
ALTER TABLE public.plays 
ADD COLUMN IF NOT EXISTS ball_carrier TEXT,
ADD COLUMN IF NOT EXISTS quarterback TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.plays.ball_carrier IS 'Name of the player who carried or received the ball on this play';
COMMENT ON COLUMN public.plays.quarterback IS 'Name of the quarterback on this play';

-- Create indexes for faster player stats queries
CREATE INDEX IF NOT EXISTS idx_plays_ball_carrier ON public.plays(ball_carrier) WHERE ball_carrier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plays_quarterback ON public.plays(quarterback) WHERE quarterback IS NOT NULL;
```

### Step 3: Verify the Migration
After running the SQL, you should see "Success. No rows returned" message.

### Step 4: Test Excel Import
1. Go back to your app
2. Navigate to a game
3. Try importing your Excel file again
4. The import should now work with ball carrier and quarterback data

## What This Fixes

- **Ball Carrier Column**: Stores which player carried/received the ball
- **Quarterback Column**: Stores which QB was on the play
- **Player Stats**: Enables accurate rushing/passing/receiving statistics
- **Excel Import**: Allows proper mapping of Excel data to database fields

## Fallback Behavior

If the migration hasn't been run yet, the Excel import will still work but will skip the ball_carrier and quarterback fields and show a warning message. The core play data (yards, touchdowns, etc.) will still be imported correctly.

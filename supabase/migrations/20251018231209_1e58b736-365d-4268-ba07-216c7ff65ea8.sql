-- Add explicit authentication checks to all table policies for defense-in-depth security
-- All SECURITY DEFINER functions will continue to work since they bypass RLS

-- 1. Profiles table - require authentication and own profile access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Authenticated users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Authenticated users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 2. Teams table - require authentication
DROP POLICY IF EXISTS "Users can view own team" ON public.teams;
DROP POLICY IF EXISTS "Team members can see full team details" ON public.teams;

CREATE POLICY "Authenticated team members can view own team"
ON public.teams
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND id = get_user_team(auth.uid()) 
  AND get_user_team(auth.uid()) IS NOT NULL
);

DROP POLICY IF EXISTS "Allow authenticated users to create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Players table - require authentication and team membership
DROP POLICY IF EXISTS "Users can view players in their team" ON public.players;
CREATE POLICY "Authenticated team members can view team players"
ON public.players
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND team_id = get_user_team(auth.uid())
);

-- 4. Games table - require authentication and team membership
DROP POLICY IF EXISTS "Users can view games for their team" ON public.games;
CREATE POLICY "Authenticated team members can view team games"
ON public.games
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND team_id = get_user_team(auth.uid())
);

-- 5. Plays table - require authentication (uses join to games)
DROP POLICY IF EXISTS "Users can view plays for their team games" ON public.plays;
CREATE POLICY "Authenticated team members can view team plays"
ON public.plays
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM games 
    WHERE games.id = plays.game_id 
    AND games.team_id = get_user_team(auth.uid())
  )
);

-- 6. Player stats - require authentication (uses join to players)
DROP POLICY IF EXISTS "Users can view player stats for their team" ON public.player_stats;
CREATE POLICY "Authenticated team members can view team player stats"
ON public.player_stats
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM players 
    WHERE players.id = player_stats.player_id 
    AND players.team_id = get_user_team(auth.uid())
  )
);

-- 7. Invitations - keep the existing specific policies but ensure they all require auth
-- The token-based policy is special and already requires auth via email matching
-- Keep the coaches policy as-is since it already has role checks which imply auth
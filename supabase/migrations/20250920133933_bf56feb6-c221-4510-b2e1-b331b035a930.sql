-- Create enum types for better data integrity
CREATE TYPE public.user_role AS ENUM ('head_coach', 'assistant_coach', 'parent');
CREATE TYPE public.play_type AS ENUM ('run', 'pass', 'punt', 'field_goal', 'kickoff', 'extra_point');
CREATE TYPE public.weather_condition AS ENUM ('clear', 'rain', 'snow', 'wind', 'fog');
CREATE TYPE public.field_condition AS ENUM ('dry', 'wet', 'muddy', 'frozen');

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  season_year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user profiles table with role-based access
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'parent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  jersey_number INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT NOT NULL,
  weight INTEGER,
  height INTEGER,
  grade_level INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, jersey_number)
);

-- Create games table
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  opponent_name TEXT NOT NULL,
  game_date DATE NOT NULL,
  is_home_game BOOLEAN NOT NULL DEFAULT true,
  weather_condition public.weather_condition,
  field_condition public.field_condition,
  temperature INTEGER,
  final_score_us INTEGER,
  final_score_opponent INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create plays table for detailed play-by-play data
CREATE TABLE public.plays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  down INTEGER NOT NULL CHECK (down BETWEEN 1 AND 4),
  distance INTEGER NOT NULL,
  yard_line INTEGER NOT NULL CHECK (yard_line BETWEEN 1 AND 100),
  play_type public.play_type NOT NULL,
  yards_gained INTEGER NOT NULL DEFAULT 0,
  is_touchdown BOOLEAN NOT NULL DEFAULT false,
  is_first_down BOOLEAN NOT NULL DEFAULT false,
  is_turnover BOOLEAN NOT NULL DEFAULT false,
  play_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create player stats table for individual player performance
CREATE TABLE public.player_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  play_id UUID NOT NULL REFERENCES public.plays(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  stat_type TEXT NOT NULL, -- 'rushing_yards', 'passing_yards', 'receiving_yards', 'tackles', etc.
  stat_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Create security function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id;
$$;

-- Create function to get user's team
CREATE OR REPLACE FUNCTION public.get_user_team(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE user_id = _user_id;
$$;

-- RLS Policies for teams table
CREATE POLICY "Users can view their team" ON public.teams
  FOR SELECT TO authenticated
  USING (id = public.get_user_team(auth.uid()));

CREATE POLICY "Coaches can update their team" ON public.teams
  FOR UPDATE TO authenticated
  USING (id = public.get_user_team(auth.uid()) AND public.get_user_role(auth.uid()) IN ('head_coach', 'assistant_coach'));

-- RLS Policies for profiles table
CREATE POLICY "Users can view profiles in their team" ON public.profiles
  FOR SELECT TO authenticated
  USING (team_id = public.get_user_team(auth.uid()));

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for players table
CREATE POLICY "Users can view players in their team" ON public.players
  FOR SELECT TO authenticated
  USING (team_id = public.get_user_team(auth.uid()));

CREATE POLICY "Coaches can manage players" ON public.players
  FOR ALL TO authenticated
  USING (team_id = public.get_user_team(auth.uid()) AND public.get_user_role(auth.uid()) IN ('head_coach', 'assistant_coach'));

-- RLS Policies for games table
CREATE POLICY "Users can view games for their team" ON public.games
  FOR SELECT TO authenticated
  USING (team_id = public.get_user_team(auth.uid()));

CREATE POLICY "Coaches can manage games" ON public.games
  FOR ALL TO authenticated
  USING (team_id = public.get_user_team(auth.uid()) AND public.get_user_role(auth.uid()) IN ('head_coach', 'assistant_coach'));

-- RLS Policies for plays table
CREATE POLICY "Users can view plays for their team games" ON public.plays
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.games 
    WHERE games.id = plays.game_id 
    AND games.team_id = public.get_user_team(auth.uid())
  ));

CREATE POLICY "Coaches can manage plays" ON public.plays
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.games 
    WHERE games.id = plays.game_id 
    AND games.team_id = public.get_user_team(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('head_coach', 'assistant_coach')
  ));

-- RLS Policies for player_stats table
CREATE POLICY "Users can view player stats for their team" ON public.player_stats
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.id = player_stats.player_id 
    AND players.team_id = public.get_user_team(auth.uid())
  ));

CREATE POLICY "Coaches can manage player stats" ON public.player_stats
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.id = player_stats.player_id 
    AND players.team_id = public.get_user_team(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('head_coach', 'assistant_coach')
  ));

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plays_updated_at BEFORE UPDATE ON public.plays FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'parent')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
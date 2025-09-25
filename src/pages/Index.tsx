import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Users, Calendar, BarChart3, Settings, Building2, TrendingUp, Archive } from 'lucide-react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  
  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (profile?.team_id) {
      fetchTeamData();
    }
  }, [profile]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect to landing page if not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  const canManageData = profile?.role === 'head_coach' || profile?.role === 'assistant_coach';

  const fetchTeamData = async () => {
    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', profile.team_id)
        .single();
      
      setTeam(teamData);

      // Fetch players
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', profile.team_id)
        .eq('active', true);
      
      setPlayers(playersData || []);
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-3xl font-bold">Dashboard</h2>
              <p className="text-muted-foreground">Manage your team's football analytics</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/players')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Players You Manage</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{players.length}</div>
              <p className="text-xs text-muted-foreground">Active players on roster</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/team')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teams You Manage</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {team ? '1' : '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {team ? `${team.name} - ${team.season_year}` : 'No team assigned'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Previous Years Seasons</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Historical seasons tracked</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/analytics')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Analytics</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Performance insights available</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                {canManageData 
                  ? "Start recording data for your team" 
                  : "View team analytics and player stats"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManageData ? (
                <>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/team">
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Team
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/players">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Players
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Game
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Record Plays
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/analytics">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      View Analytics
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/analytics">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Team Analytics  
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/players">
                      <Users className="mr-2 h-4 w-4" />
                      View Players
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Steps to set up your team analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(profile?.role === 'head_coach' || profile?.role === 'assistant_coach') && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Create your team and invite coaches</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                  <span className="text-sm">Add players to your roster</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                  <span className="text-sm">Schedule and add games</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                  <span className="text-sm">Start recording play data</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                  <span className="text-sm">View analytics and insights</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface Game {
  id: string;
  opponent_name: string;
  game_date: string;
  final_score_us: number | null;
  final_score_opponent: number | null;
}

interface Play {
  id: string;
  game_id: string;
  quarter: number;
  down: number;
  distance: number;
  yard_line: number;
  play_type: string;
  yards_gained: number;
  is_first_down: boolean;
  is_touchdown: boolean;
  is_turnover: boolean;
  play_description: string | null;
}

interface GameAnalytics {
  totalPlays: number;
  totalYards: number;
  yardsPerPlay: number;
  successRate: number;
  passingStats: {
    attempts: number;
    completions: number;
    yards: number;
    completionRate: number;
    yardsPerAttempt: number;
    touchdowns: number;
  };
  rushingStats: {
    attempts: number;
    yards: number;
    yardsPerAttempt: number;
    touchdowns: number;
  };
  thirdDownStats: {
    attempts: number;
    conversions: number;
    conversionRate: number;
  };
  redZoneStats: {
    trips: number;
    touchdowns: number;
    efficiency: number;
  };
  turnovers: number;
  bigPlays: number;
}

const Analytics = () => {
  const { profile } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [plays, setPlays] = useState<Play[]>([]);
  const [analytics, setAnalytics] = useState<GameAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.team_id) {
      fetchGames();
    }
  }, [profile?.team_id]);

  useEffect(() => {
    if (selectedGameId) {
      fetchPlaysAndAnalyze();
    }
  }, [selectedGameId]);

  const fetchGames = async () => {
    if (!profile?.team_id) return;
    
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('team_id', profile.team_id)
      .order('game_date', { ascending: false });
    
    if (data) {
      setGames(data);
      if (data.length > 0 && !selectedGameId) {
        setSelectedGameId(data[0].id);
      }
    }
  };

  const fetchPlaysAndAnalyze = async () => {
    if (!selectedGameId) return;
    
    setLoading(true);
    const { data } = await supabase
      .from('plays')
      .select('*')
      .eq('game_id', selectedGameId)
      .order('created_at');
    
    if (data) {
      setPlays(data);
      analyzeGame(data);
    }
    setLoading(false);
  };

  const analyzeGame = (playsData: Play[]) => {
    if (playsData.length === 0) {
      setAnalytics(null);
      return;
    }

    const totalPlays = playsData.length;
    const totalYards = playsData.reduce((sum, play) => sum + play.yards_gained, 0);
    const successfulPlays = playsData.filter(play => {
      // Define success based on down and distance
      if (play.down === 1) return play.yards_gained >= play.distance * 0.5;
      if (play.down === 2) return play.yards_gained >= play.distance * 0.7;
      return play.yards_gained >= play.distance;
    });

    // Passing stats
    const passingPlays = playsData.filter(play => play.play_type === 'pass');
    const completedPasses = passingPlays.filter(play => play.yards_gained > 0 || play.is_first_down);
    const passingTouchdowns = passingPlays.filter(play => play.is_touchdown).length;

    // Rushing stats  
    const rushingPlays = playsData.filter(play => play.play_type === 'run');
    const rushingTouchdowns = rushingPlays.filter(play => play.is_touchdown).length;

    // Third down stats
    const thirdDownPlays = playsData.filter(play => play.down === 3);
    const thirdDownConversions = thirdDownPlays.filter(play => play.is_first_down).length;

    // Red zone stats (within 20 yards)
    const redZonePlays = playsData.filter(play => play.yard_line <= 20);
    const redZoneTrips = new Set(redZonePlays.map(play => 
      Math.floor(playsData.indexOf(play) / 10) // Group by drive approximation
    )).size;
    const redZoneTouchdowns = redZonePlays.filter(play => play.is_touchdown).length;

    // Big plays (15+ yards)
    const bigPlays = playsData.filter(play => play.yards_gained >= 15).length;

    // Turnovers
    const turnovers = playsData.filter(play => play.is_turnover).length;

    const gameAnalytics: GameAnalytics = {
      totalPlays,
      totalYards,
      yardsPerPlay: totalYards / totalPlays,
      successRate: (successfulPlays.length / totalPlays) * 100,
      passingStats: {
        attempts: passingPlays.length,
        completions: completedPasses.length,
        yards: passingPlays.reduce((sum, play) => sum + play.yards_gained, 0),
        completionRate: passingPlays.length > 0 ? (completedPasses.length / passingPlays.length) * 100 : 0,
        yardsPerAttempt: passingPlays.length > 0 ? passingPlays.reduce((sum, play) => sum + play.yards_gained, 0) / passingPlays.length : 0,
        touchdowns: passingTouchdowns,
      },
      rushingStats: {
        attempts: rushingPlays.length,
        yards: rushingPlays.reduce((sum, play) => sum + play.yards_gained, 0),
        yardsPerAttempt: rushingPlays.length > 0 ? rushingPlays.reduce((sum, play) => sum + play.yards_gained, 0) / rushingPlays.length : 0,
        touchdowns: rushingTouchdowns,
      },
      thirdDownStats: {
        attempts: thirdDownPlays.length,
        conversions: thirdDownConversions,
        conversionRate: thirdDownPlays.length > 0 ? (thirdDownConversions / thirdDownPlays.length) * 100 : 0,
      },
      redZoneStats: {
        trips: redZoneTrips,
        touchdowns: redZoneTouchdowns,
        efficiency: redZoneTrips > 0 ? (redZoneTouchdowns / redZoneTrips) * 100 : 0,
      },
      turnovers,
      bigPlays,
    };

    setAnalytics(gameAnalytics);
  };

  const getQuarterDistribution = () => {
    const quarters = [1, 2, 3, 4];
    return quarters.map(quarter => ({
      quarter: `Q${quarter}`,
      plays: plays.filter(play => play.quarter === quarter).length,
      yards: plays.filter(play => play.quarter === quarter).reduce((sum, play) => sum + play.yards_gained, 0),
    }));
  };

  const getPlayTypeDistribution = () => {
    const playTypes = ['run', 'pass'];
    return playTypes.map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: plays.filter(play => play.play_type === type).length,
      yards: plays.filter(play => play.play_type === type).reduce((sum, play) => sum + play.yards_gained, 0),
    }));
  };

  const getDownDistribution = () => {
    const downs = [1, 2, 3, 4];
    return downs.map(down => ({
      down: `${down}${down === 1 ? 'st' : down === 2 ? 'nd' : down === 3 ? 'rd' : 'th'}`,
      count: plays.filter(play => play.down === down).length,
      avgYards: plays.filter(play => play.down === down).reduce((sum, play, _, arr) => 
        arr.length > 0 ? sum + play.yards_gained / arr.length : 0, 0),
    }));
  };

  const selectedGame = games.find(game => game.id === selectedGameId);

  if (!profile?.team_id) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p>You need to be assigned to a team to view analytics.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Game Analytics</h1>
            <p className="text-muted-foreground">Comprehensive performance analysis</p>
          </div>
          <div className="w-80">
            <Select value={selectedGameId} onValueChange={setSelectedGameId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent>
                {games.map((game) => (
                  <SelectItem key={game.id} value={game.id}>
                    vs {game.opponent_name} - {new Date(game.game_date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p>Analyzing game data...</p>
          </div>
        ) : !analytics ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {selectedGame ? 'No play data available for this game.' : 'Select a game to view analytics.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Game Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Game Overview
                  {selectedGame && (
                    <div className="text-sm font-normal">
                      vs {selectedGame.opponent_name} - {new Date(selectedGame.game_date).toLocaleDateString()}
                      {selectedGame.final_score_us !== null && (
                        <Badge variant="outline" className="ml-2">
                          {selectedGame.final_score_us}-{selectedGame.final_score_opponent}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{analytics.totalPlays}</div>
                    <div className="text-sm text-muted-foreground">Total Plays</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{analytics.totalYards}</div>
                    <div className="text-sm text-muted-foreground">Total Yards</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{analytics.yardsPerPlay.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Yards/Play</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{analytics.successRate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Offensive Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Passing Attack</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Completion Rate</span>
                    <span className="font-bold">{analytics.passingStats.completionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={analytics.passingStats.completionRate} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <div className="text-xl font-bold">{analytics.passingStats.completions}/{analytics.passingStats.attempts}</div>
                      <div className="text-sm text-muted-foreground">Completions</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{analytics.passingStats.yards}</div>
                      <div className="text-sm text-muted-foreground">Passing Yards</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{analytics.passingStats.yardsPerAttempt.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Yards/Attempt</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{analytics.passingStats.touchdowns}</div>
                      <div className="text-sm text-muted-foreground">Pass TDs</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rushing Attack</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Efficiency</span>
                    <span className="font-bold">{analytics.rushingStats.yardsPerAttempt.toFixed(1)} YPC</span>
                  </div>
                  <Progress value={Math.min(analytics.rushingStats.yardsPerAttempt * 10, 100)} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <div className="text-xl font-bold">{analytics.rushingStats.attempts}</div>
                      <div className="text-sm text-muted-foreground">Rush Attempts</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{analytics.rushingStats.yards}</div>
                      <div className="text-sm text-muted-foreground">Rushing Yards</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{analytics.rushingStats.yardsPerAttempt.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Yards/Carry</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{analytics.rushingStats.touchdowns}</div>
                      <div className="text-sm text-muted-foreground">Rush TDs</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Critical Situations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Third Down Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      {analytics.thirdDownStats.conversionRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {analytics.thirdDownStats.conversions}/{analytics.thirdDownStats.attempts} conversions
                    </div>
                    <Progress value={analytics.thirdDownStats.conversionRate} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Red Zone Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      {analytics.redZoneStats.efficiency.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {analytics.redZoneStats.touchdowns}/{analytics.redZoneStats.trips} trips
                    </div>
                    <Progress value={analytics.redZoneStats.efficiency} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Big Plays</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-primary">{analytics.bigPlays}</div>
                    <div className="text-sm text-muted-foreground">15+ yard plays</div>
                    <div className="text-sm text-muted-foreground">
                      {analytics.turnovers} turnovers
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Play Distribution by Quarter</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getQuarterDistribution()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="quarter" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="plays" fill="hsl(var(--primary))" />
                        <Bar dataKey="yards" fill="hsl(var(--secondary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Run vs Pass Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getPlayTypeDistribution()}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {getPlayTypeDistribution().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? "hsl(var(--primary))" : "hsl(var(--secondary))"} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Performance by Down */}
            <Card>
              <CardHeader>
                <CardTitle>Performance by Down</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getDownDistribution()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="down" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Play Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Analytics;
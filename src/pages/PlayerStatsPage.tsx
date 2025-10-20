import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Award, TrendingUp, Target, Zap } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PlayerStats {
  player_id: string;
  player_name: string;
  jersey_number: number;
  positions: string[];
  total_plays: number;
  total_yards: number;
  touchdowns: number;
  turnovers: number;
  first_downs: number;
  avg_yards_per_play: number;
  success_rate: number;
}

const PlayerStatsPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.team_id) {
      fetchPlayers();
      fetchGames();
    }
  }, [profile]);

  useEffect(() => {
    if (players.length > 0) {
      calculatePlayerStats();
    }
  }, [players, selectedGame]);

  const fetchPlayers = async () => {
    try {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', profile.team_id)
        .eq('active', true)
        .order('jersey_number');
      
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchGames = async () => {
    try {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('team_id', profile.team_id)
        .order('game_date', { ascending: false });
      
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  const calculatePlayerStats = async () => {
    setLoading(true);
    try {
      // Fetch all plays for the team
      let query = supabase
        .from('plays')
        .select(`
          *,
          games!inner(team_id, opponent_name)
        `)
        .eq('games.team_id', profile.team_id);

      // Filter by game if selected
      if (selectedGame !== 'all') {
        query = query.eq('game_id', selectedGame);
      }

      const { data: playsData } = await query;

      // Calculate stats for each player
      const stats: PlayerStats[] = players.map(player => {
        // For now, we'll use a simple approximation based on play descriptions
        // In a real implementation, you'd have a player_id field in the plays table
        const playerPlays = (playsData || []).filter(play => 
          play.play_description?.toLowerCase().includes(player.first_name.toLowerCase()) ||
          play.play_description?.toLowerCase().includes(player.last_name.toLowerCase()) ||
          play.play_description?.toLowerCase().includes(`#${player.jersey_number}`)
        );

        const totalYards = playerPlays.reduce((sum, play) => sum + play.yards_gained, 0);
        const touchdowns = playerPlays.filter(play => play.is_touchdown).length;
        const turnovers = playerPlays.filter(play => play.is_turnover).length;
        const firstDowns = playerPlays.filter(play => play.is_first_down).length;
        const avgYards = playerPlays.length > 0 ? totalYards / playerPlays.length : 0;

        // Calculate success rate based on down
        const successfulPlays = playerPlays.filter(play => {
          if (play.is_touchdown) return true;
          switch (play.down) {
            case 1: return play.yards_gained >= play.distance * 0.5;
            case 2: return play.yards_gained >= play.distance * 0.7;
            case 3:
            case 4: return play.yards_gained >= play.distance;
            default: return false;
          }
        }).length;
        const successRate = playerPlays.length > 0 ? successfulPlays / playerPlays.length : 0;

        return {
          player_id: player.id,
          player_name: `${player.first_name} ${player.last_name}`,
          jersey_number: player.jersey_number,
          positions: player.positions || [],
          total_plays: playerPlays.length,
          total_yards: totalYards,
          touchdowns,
          turnovers,
          first_downs: firstDowns,
          avg_yards_per_play: avgYards,
          success_rate: successRate
        };
      }).filter(stat => stat.total_plays > 0) // Only show players with recorded plays
        .sort((a, b) => b.total_yards - a.total_yards); // Sort by total yards

      setPlayerStats(stats);
    } catch (error) {
      console.error('Error calculating stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/team')}
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Player Statistics</h1>
              <p className="text-muted-foreground">Individual player performance</p>
            </div>
          </div>
          <div className="w-64">
            <Select value={selectedGame} onValueChange={setSelectedGame}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Games</SelectItem>
                {games.map(game => (
                  <SelectItem key={game.id} value={game.id}>
                    vs {game.opponent_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Summary Cards */}
        {playerStats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Top Rusher</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{playerStats[0]?.player_name}</div>
                <div className="text-sm text-muted-foreground">{playerStats[0]?.total_yards} yards</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Most TDs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {[...playerStats].sort((a, b) => b.touchdowns - a.touchdowns)[0]?.player_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {[...playerStats].sort((a, b) => b.touchdowns - a.touchdowns)[0]?.touchdowns} touchdowns
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Best Avg</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {[...playerStats].sort((a, b) => b.avg_yards_per_play - a.avg_yards_per_play)[0]?.player_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {[...playerStats].sort((a, b) => b.avg_yards_per_play - a.avg_yards_per_play)[0]?.avg_yards_per_play.toFixed(1)} yds/play
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Plays</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {playerStats.reduce((sum, stat) => sum + stat.total_plays, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Across all players</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Player Stats Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Player Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading statistics...
              </div>
            ) : playerStats.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Award className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No player statistics available yet</p>
                <p className="text-sm mt-2">Record some plays to see player stats!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Position(s)</TableHead>
                      <TableHead className="text-right">Plays</TableHead>
                      <TableHead className="text-right">Yards</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                      <TableHead className="text-right">TDs</TableHead>
                      <TableHead className="text-right">1st Downs</TableHead>
                      <TableHead className="text-right">Success %</TableHead>
                      <TableHead className="text-right">TOs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerStats.map((stat) => (
                      <TableRow key={stat.player_id}>
                        <TableCell className="font-medium">#{stat.jersey_number}</TableCell>
                        <TableCell className="font-medium">{stat.player_name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {stat.positions.slice(0, 3).map((pos, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {pos}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{stat.total_plays}</TableCell>
                        <TableCell className="text-right font-semibold">{stat.total_yards}</TableCell>
                        <TableCell className="text-right">{stat.avg_yards_per_play.toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          {stat.touchdowns > 0 && (
                            <Badge variant="default" className="text-xs">{stat.touchdowns}</Badge>
                          )}
                          {stat.touchdowns === 0 && '0'}
                        </TableCell>
                        <TableCell className="text-right">{stat.first_downs}</TableCell>
                        <TableCell className="text-right">
                          <span className={stat.success_rate >= 0.5 ? 'text-green-600 font-semibold' : ''}>
                            {Math.round(stat.success_rate * 100)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {stat.turnovers > 0 && (
                            <Badge variant="destructive" className="text-xs">{stat.turnovers}</Badge>
                          )}
                          {stat.turnovers === 0 && '0'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PlayerStatsPage;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowLeft, Play, Target, Flag, TrendingUp, TrendingDown } from 'lucide-react';

interface PlaybookPlay {
  id: string;
  name: string;
  description: string;
  category: 'offense' | 'defense' | 'special_teams';
  direction?: 'left' | 'right' | 'center';
  formation?: string;
}

interface GameData {
  id: string;
  opponent_name: string;
  game_date: string;
  is_home_game: boolean;
  final_score_us?: number;
  final_score_opponent?: number;
}

interface PlayData {
  id: string;
  quarter: number;
  down: number;
  distance: number;
  yard_line: number;
  play_type: 'run' | 'pass' | 'punt' | 'field_goal' | 'extra_point' | 'kickoff';
  yards_gained: number;
  is_turnover: boolean;
  is_touchdown: boolean;
  is_first_down: boolean;
  play_description?: string;
  created_at: string;
}

const GameDetails = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameData | null>(null);
  const [plays, setPlays] = useState<PlayData[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [playbookPlays, setPlaybookPlays] = useState<PlaybookPlay[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddPlay, setShowAddPlay] = useState(false);
  const [selectedOffenseDefense, setSelectedOffenseDefense] = useState<'offense' | 'defense' | ''>('');

  const canManage = profile?.role === 'head_coach' || profile?.role === 'assistant_coach';

  useEffect(() => {
    if (gameId && profile?.team_id) {
      fetchGameData();
      fetchPlayers();
      fetchPlaybookPlays();
    }
  }, [gameId, profile]);

  const fetchGameData = async () => {
    try {
      // Fetch game details
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .eq('team_id', profile.team_id)
        .single();

      if (gameError) throw gameError;
      setGame(gameData);

      // Fetch plays for this game
      const { data: playsData, error: playsError } = await supabase
        .from('plays')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at');

      if (playsError) throw playsError;
      setPlays(playsData || []);
    } catch (error) {
      console.error('Error fetching game data:', error);
      toast({
        title: "Error",
        description: "Failed to load game data.",
        variant: "destructive"
      });
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data: playersData, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', profile.team_id)
        .eq('active', true)
        .order('jersey_number');

      if (error) throw error;
      setPlayers(playersData || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchPlaybookPlays = async () => {
    try {
      // Fetch plays from localStorage (same as PlaybookManagement)
      const savedPlays = localStorage.getItem(`playbook_${profile.team_id}`);
      if (savedPlays) {
        setPlaybookPlays(JSON.parse(savedPlays));
      }
    } catch (error) {
      console.error('Error fetching playbook plays:', error);
    }
  };

  const addPlay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const playData = {
      game_id: gameId,
      quarter: parseInt(formData.get('quarter') as string),
      down: parseInt(formData.get('down') as string),
      distance: parseInt(formData.get('distance') as string),
      yard_line: parseInt(formData.get('yard-line') as string),
      play_type: formData.get('play-type') as 'run' | 'pass' | 'punt' | 'field_goal' | 'extra_point',
      yards_gained: parseInt(formData.get('yards-gained') as string) || 0,
      is_turnover: formData.get('is-turnover') === 'on',
      is_touchdown: formData.get('is-touchdown') === 'on',
      is_first_down: formData.get('is-first-down') === 'on',
      play_description: formData.get('play-description') as string,
    };

    try {
      const { error } = await supabase
        .from('plays')
        .insert(playData);

      if (error) throw error;

      toast({
        title: "Play recorded!",
        description: "Play has been added to the game."
      });

      setShowAddPlay(false);
      fetchGameData();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "Error recording play",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlayIcon = (play: PlayData) => {
    if (play.is_touchdown) return <Flag className="h-4 w-4 text-green-600" />;
    if (play.is_turnover) return <TrendingDown className="h-4 w-4 text-red-600" />;
    if (play.is_first_down) return <TrendingUp className="h-4 w-4 text-blue-600" />;
    return <Play className="h-4 w-4" />;
  };

  const getPlayResult = (play: PlayData) => {
    if (play.is_touchdown) return "TD";
    if (play.is_turnover) return "TO";
    if (play.is_first_down) return "1st Down";
    return `${play.yards_gained > 0 ? '+' : ''}${play.yards_gained} yds`;
  };

  if (!canManage) {
    return (
      <Layout>
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
              <p className="text-muted-foreground">
                Only coaches can manage game details.
              </p>
              <Button 
                onClick={() => navigate('/team')} 
                className="mt-4"
                variant="outline"
              >
                Back to Team
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!game) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-64">
          <div>Loading game data...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
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
              <h2 className="text-3xl font-bold">vs {game.opponent_name}</h2>
              <p className="text-muted-foreground">
                {new Date(game.game_date).toLocaleDateString()} • {game.is_home_game ? 'Home' : 'Away'} Game
              </p>
            </div>
          </div>
          <Dialog open={showAddPlay} onOpenChange={(open) => {
            setShowAddPlay(open);
            if (!open) setSelectedOffenseDefense('');
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Record Play
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Play</DialogTitle>
                <DialogDescription>
                  Add play-by-play details for this down.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addPlay} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quarter">Quarter</Label>
                    <Select name="quarter" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select quarter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Quarter</SelectItem>
                        <SelectItem value="2">2nd Quarter</SelectItem>
                        <SelectItem value="3">3rd Quarter</SelectItem>
                        <SelectItem value="4">4th Quarter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="down">Down</Label>
                    <Select name="down" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Down" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Down</SelectItem>
                        <SelectItem value="2">2nd Down</SelectItem>
                        <SelectItem value="3">3rd Down</SelectItem>
                        <SelectItem value="4">4th Down</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="distance">Distance</Label>
                    <Input
                      id="distance"
                      name="distance"
                      type="number"
                      placeholder="10"
                      min="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yard-line">Yard Line</Label>
                    <Input
                      id="yard-line"
                      name="yard-line"
                      type="number"
                      placeholder="50"
                      min="1"
                      max="99"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offense-defense">Offense/Defense</Label>
                  <Select 
                    name="offense-defense" 
                    required
                    onValueChange={(value) => setSelectedOffenseDefense(value as 'offense' | 'defense')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select offense or defense" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offense">Offense</SelectItem>
                      <SelectItem value="defense">Defense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="playbook-play">Select from Playbook (Optional)</Label>
                  <Select name="playbook-play">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a play from playbook" />
                    </SelectTrigger>
                    <SelectContent>
                      {playbookPlays.map((play) => (
                        <SelectItem key={play.id} value={play.id}>
                          {play.name} ({play.category.replace('_', ' ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="play-type">Play Type</Label>
                    <Select name="play-type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select play type" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedOffenseDefense === 'defense' ? (
                          <>
                            <SelectItem value="inside">Inside</SelectItem>
                            <SelectItem value="outside_run">Outside Run</SelectItem>
                            <SelectItem value="wide_receiver_screen">Wide Receiver Screen</SelectItem>
                            <SelectItem value="draw">Draw</SelectItem>
                            <SelectItem value="deep_pass">Deep Pass</SelectItem>
                            <SelectItem value="flat_pass">Flat Pass</SelectItem>
                            <SelectItem value="jet">Jet</SelectItem>
                            <SelectItem value="tight_end_pass">Tight End Pass</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="run">Run</SelectItem>
                            <SelectItem value="pass">Pass</SelectItem>
                            <SelectItem value="punt">Punt</SelectItem>
                            <SelectItem value="field_goal">Field Goal</SelectItem>
                            <SelectItem value="extra_point">Extra Point</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="direction">Direction</Label>
                    <Select name="direction">
                      <SelectTrigger>
                        <SelectValue placeholder="Select direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="player">Player Involved</Label>
                    <Select name="player">
                      <SelectTrigger>
                        <SelectValue placeholder="Select player" />
                      </SelectTrigger>
                      <SelectContent>
                        {players.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            #{player.jersey_number} {player.first_name} {player.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yards-gained">Yards Gained</Label>
                    <Input
                      id="yards-gained"
                      name="yards-gained"
                      type="number"
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="play-description">Play Description</Label>
                  <Textarea
                    id="play-description"
                    name="play-description"
                    placeholder="Describe the play execution..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="is-first-down" 
                      name="is-first-down" 
                      className="rounded"
                    />
                    <Label htmlFor="is-first-down" className="text-sm">First Down</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="is-touchdown" 
                      name="is-touchdown" 
                      className="rounded"
                    />
                    <Label htmlFor="is-touchdown" className="text-sm">Touchdown</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="is-turnover" 
                      name="is-turnover" 
                      className="rounded"
                    />
                    <Label htmlFor="is-turnover" className="text-sm">Turnover</Label>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Recording...' : 'Record Play'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Game Score */}
        {(game.final_score_us !== null && game.final_score_opponent !== null) && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold">
                  {game.final_score_us} - {game.final_score_opponent}
                </div>
                <div className="text-muted-foreground mt-2">Final Score</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plays List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Play by Play ({plays.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plays.map((play, index) => (
                <div key={play.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getPlayIcon(play)}
                      <div>
                        <div className="font-medium">
                          Q{play.quarter} • {play.down}{play.down === 1 ? 'st' : play.down === 2 ? 'nd' : play.down === 3 ? 'rd' : 'th'} & {play.distance} at {play.yard_line}
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {play.play_type.replace('_', ' ')} play
                        </div>
                        {play.play_description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {play.play_description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={play.is_touchdown ? 'default' : play.is_turnover ? 'destructive' : 'secondary'}
                      >
                        {getPlayResult(play)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {plays.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No plays recorded yet. Start tracking the game!
                  <div className="mt-2">
                    <Button onClick={() => setShowAddPlay(true)} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Record First Play
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default GameDetails;
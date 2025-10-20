import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowLeft, Calendar, Edit, Trash2, Trophy } from 'lucide-react';
import { format } from 'date-fns';

const SchedulePage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScheduleGame, setShowScheduleGame] = useState(false);
  const [showEditGame, setShowEditGame] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [gameDate, setGameDate] = useState<Date>();
  const [editGameDate, setEditGameDate] = useState<Date>();

  const canManage = profile?.role === 'head_coach' || profile?.role === 'assistant_coach';

  useEffect(() => {
    if (profile?.team_id) {
      fetchGames();
    }
  }, [profile]);

  const fetchGames = async () => {
    try {
      const { data: gamesData } = await supabase
        .from('games')
        .select('*')
        .eq('team_id', profile.team_id)
        .order('game_date');
      
      setGames(gamesData || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  const scheduleGame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!gameDate) {
      toast({
        title: "Error",
        description: "Please select a game date.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const { error } = await supabase
        .from('games')
        .insert({
          team_id: profile.team_id,
          opponent_name: formData.get('opponent-name') as string,
          game_date: gameDate.toISOString(),
          game_time: formData.get('game-time') as string,
          location: formData.get('location') as string,
          is_home_game: formData.get('is-home') === 'true',
          season_year: new Date(gameDate).getFullYear()
        });

      if (error) throw error;

      toast({
        title: "Game scheduled!",
        description: "The game has been added to the schedule."
      });

      setShowScheduleGame(false);
      setGameDate(undefined);
      fetchGames();
      e.currentTarget.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule game.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const { error } = await supabase
        .from('games')
        .update({
          final_score_us: formData.get('score-us') ? parseInt(formData.get('score-us') as string) : null,
          final_score_opponent: formData.get('score-opponent') ? parseInt(formData.get('score-opponent') as string) : null,
        })
        .eq('id', editingGame.id);

      if (error) throw error;

      toast({
        title: "Game updated!",
        description: "The game score has been updated."
      });

      setShowEditGame(false);
      setEditingGame(null);
      fetchGames();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update game.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;

      toast({
        title: "Game deleted",
        description: "The game has been removed from the schedule."
      });

      fetchGames();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete game.",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (game: any) => {
    setEditingGame(game);
    setEditGameDate(new Date(game.game_date));
    setShowEditGame(true);
  };

  const getGameStatus = (game: any) => {
    const gameDate = new Date(game.game_date);
    const today = new Date();
    
    if (game.final_score_us !== null && game.final_score_opponent !== null) {
      const won = game.final_score_us > game.final_score_opponent;
      return (
        <Badge variant={won ? 'default' : 'destructive'}>
          {won ? 'Win' : 'Loss'} {game.final_score_us}-{game.final_score_opponent}
        </Badge>
      );
    } else if (gameDate < today) {
      return <Badge variant="outline">Completed</Badge>;
    } else {
      return <Badge variant="secondary">Scheduled</Badge>;
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
              <h1 className="text-3xl font-bold">Team Schedule</h1>
              <p className="text-muted-foreground">View and manage game schedule</p>
            </div>
          </div>
          {canManage && (
            <Dialog open={showScheduleGame} onOpenChange={setShowScheduleGame}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Game
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule New Game</DialogTitle>
                  <DialogDescription>
                    Add a game to your team's schedule
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={scheduleGame} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="opponent-name">Opponent</Label>
                    <Input
                      id="opponent-name"
                      name="opponent-name"
                      placeholder="Team name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Game Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {gameDate ? format(gameDate, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={gameDate}
                          onSelect={setGameDate}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="game-time">Game Time</Label>
                    <Input
                      id="game-time"
                      name="game-time"
                      type="time"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="Stadium/field name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="is-home">Home/Away</Label>
                    <Select name="is-home" required defaultValue="true">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Home Game</SelectItem>
                        <SelectItem value="false">Away Game</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Scheduling...' : 'Schedule Game'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Games ({games.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {games.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No games scheduled yet</p>
                {canManage && (
                  <Button
                    onClick={() => setShowScheduleGame(true)}
                    className="mt-4"
                    variant="outline"
                  >
                    Schedule First Game
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 cursor-pointer" onClick={() => navigate(`/game/${game.id}`)}>
                      <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            vs {game.opponent_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(game.game_date), 'PPP')} • {game.game_time} • {game.is_home_game ? 'Home' : 'Away'}
                          </div>
                          {game.location && (
                            <div className="text-xs text-muted-foreground">
                              📍 {game.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getGameStatus(game)}
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(game)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteGame(game.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Game Dialog */}
        <Dialog open={showEditGame} onOpenChange={setShowEditGame}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Game Score</DialogTitle>
              <DialogDescription>
                Enter the final score for this game
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={updateGame} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="score-us">Your Team Score</Label>
                <Input
                  id="score-us"
                  name="score-us"
                  type="number"
                  min="0"
                  defaultValue={editingGame?.final_score_us || ''}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="score-opponent">Opponent Score</Label>
                <Input
                  id="score-opponent"
                  name="score-opponent"
                  type="number"
                  min="0"
                  defaultValue={editingGame?.final_score_opponent || ''}
                  placeholder="0"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Score'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default SchedulePage;

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
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Mail, Settings, BookOpen, ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const TeamManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [showChangeRole, setShowChangeRole] = useState(false);
  const [showScheduleGame, setShowScheduleGame] = useState(false);
  const [gameDate, setGameDate] = useState<Date>();
  const [newRole, setNewRole] = useState<'head_coach' | 'assistant_coach' | 'parent' | ''>('');

  const canManageTeam = profile?.role === 'head_coach' || profile?.role === 'assistant_coach';

  useEffect(() => {
    if (profile?.team_id) {
      fetchTeamData();
    }
  }, [profile]);

  const fetchTeamData = async () => {
    try {
      // Fetch team details
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', profile.team_id)
        .single();
      
      setTeam(teamData);

      // Fetch team members (coaches and parents)
      const { data: membersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('team_id', profile.team_id);
      
      setTeamMembers(membersData || []);

      // Fetch players
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', profile.team_id)
        .eq('active', true)
        .order('jersey_number');
      
      setPlayers(playersData || []);

      // Fetch games/schedule
      const { data: gamesData } = await supabase
        .from('games')
        .select('*')
        .eq('team_id', profile.team_id)
        .order('game_date');
      
      setGames(gamesData || []);
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  };

  const createTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const teamName = formData.get('team-name') as string;
    const seasonYear = parseInt(formData.get('season-year') as string);

    try {
      // Create team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          season_year: seasonYear
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Update user's profile with team_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ team_id: teamData.id })
        .eq('user_id', profile.user_id);

      if (profileError) throw profileError;

      toast({
        title: "Team created!",
        description: `${teamName} has been created successfully.`
      });

      setShowCreateTeam(false);
      window.location.reload(); // Refresh to update the layout
    } catch (error: any) {
      toast({
        title: "Error creating team",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    try {
      // For now, we'll just show instructions for manual invitation
      // In a full implementation, you'd send an email invitation
      toast({
        title: "Invitation Instructions",
        description: `Share this information with ${email}: 1) Sign up at this app 2) Use team code: ${team?.id?.slice(0, 8)} 3) Contact you to be added to the team.`
      });

      setShowInviteUser(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async () => {
    if (!newRole || !profile?.user_id) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast({
        title: "Role updated!",
        description: `Your role has been changed to ${formatRole(newRole)}.`
      });

      setShowChangeRole(false);
      window.location.reload(); // Refresh to update the layout
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const scheduleGame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const gameData = {
      team_id: profile.team_id,
      opponent_name: formData.get('opponent-name') as string,
      game_date: gameDate ? format(gameDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
      is_home_game: formData.get('game-type') === 'home',
    };

    try {
      const { error } = await supabase
        .from('games')
        .insert(gameData);

      if (error) throw error;

      toast({
        title: "Game scheduled!",
        description: `Game vs ${gameData.opponent_name} has been scheduled.`
      });

      setShowScheduleGame(false);
      setGameDate(undefined);
      fetchTeamData();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "Error scheduling game",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'head_coach': return 'default';
      case 'assistant_coach': return 'secondary';
      case 'parent': return 'outline';
      default: return 'outline';
    }
  };

  if (!profile?.team_id && canManageTeam) {
    return (
      <Layout>
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create Your Team</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                As a coach, you need to create a team first.
              </p>
              <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
                <DialogTrigger asChild>
                  <Button className="w-full">Create Team</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Team</DialogTitle>
                    <DialogDescription>
                      Set up your youth football team for the season.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createTeam} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="team-name">Team Name</Label>
                      <Input
                        id="team-name"
                        name="team-name"
                        placeholder="e.g., Eagles U12"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="season-year">Season Year</Label>
                      <Input
                        id="season-year"
                        name="season-year"
                        type="number"
                        placeholder="2024"
                        defaultValue={new Date().getFullYear()}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Team'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
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
              onClick={() => navigate('/')}
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold">Team Management</h2>
              <p className="text-muted-foreground">
                {team ? `Manage ${team.name} - ${team.season_year} Season` : 'Loading team...'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {canManageTeam && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/playbook')}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Manage Playbook
              </Button>
            )}
            <Dialog open={showChangeRole} onOpenChange={setShowChangeRole}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Change Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Your Role</DialogTitle>
                  <DialogDescription>
                    Update your role on the team. You can switch between coaching roles.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Role</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatRole(profile?.role || '')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>New Role</Label>
                    <Select value={newRole} onValueChange={(value) => setNewRole(value as 'head_coach' | 'assistant_coach' | 'parent' | '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="head_coach">Head Coach</SelectItem>
                        <SelectItem value="assistant_coach">Assistant Coach</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={changeRole} className="w-full" disabled={loading || !newRole}>
                    {loading ? 'Updating...' : 'Update Role'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {canManageTeam && (
              <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Invite Coach
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Coach</DialogTitle>
                    <DialogDescription>
                      Invite an assistant coach or parent to join your team.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={inviteUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="coach@example.com"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Instructions'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Coaches ({teamMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                  </div>
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {formatRole(member.role)}
                  </Badge>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No team members yet. Invite coaches to get started!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Players ({players.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => (
                <div key={player.id} className="p-4 border rounded-lg">
                  <div className="font-medium text-lg mb-2">
                    #{player.jersey_number} {player.first_name} {player.last_name}
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {player.positions?.map((position: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {position}
                        </Badge>
                      ))}
                    </div>
                    {player.grade_level && (
                      <div className="text-sm text-muted-foreground">
                        Grade: {player.grade_level}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground flex gap-4">
                      {player.weight && <span>Weight: {player.weight} lbs</span>}
                      {player.height && <span>Height: {Math.floor(player.height / 12)}'{player.height % 12}"</span>}
                    </div>
                  </div>
                </div>
              ))}
              {players.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No players yet. Add players to get started!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Schedule ({games.length})
              </CardTitle>
              {canManageTeam && (
                <Button onClick={() => setShowScheduleGame(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Game
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/game/${game.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        vs {game.opponent_name}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span>{new Date(game.game_date).toLocaleDateString()}</span>
                        <Badge variant={game.is_home_game ? 'default' : 'outline'}>
                          {game.is_home_game ? 'Home' : 'Away'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      {game.final_score_us !== null && game.final_score_opponent !== null ? (
                        <div className="text-lg font-bold">
                          {game.final_score_us} - {game.final_score_opponent}
                        </div>
                      ) : (
                        <Badge variant="secondary">Scheduled</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {games.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No games scheduled yet.
                  {canManageTeam && (
                    <div className="mt-2">
                      <Button onClick={() => setShowScheduleGame(true)} variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Schedule First Game
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {canManageTeam && (
          <Card>
            <CardHeader>
              <CardTitle>Team Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">For Other Coaches:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Have them sign up for an account at this app</li>
                    <li>Share your team code: <code className="bg-muted px-1 rounded">{team?.id?.slice(0, 8)}</code></li>
                    <li>Contact you to be manually added to the team</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-medium mb-2">What coaches can do:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Create and manage teams</li>
                    <li>Add and manage players</li>
                    <li>Record game data and play-by-play information</li>
                    <li>View analytics and player statistics</li>
                    <li>Generate game reports</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule Game Dialog */}
        <Dialog open={showScheduleGame} onOpenChange={(open) => {
          setShowScheduleGame(open);
          if (!open) setGameDate(undefined);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Game</DialogTitle>
              <DialogDescription>
                Add a new game to your team's schedule.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={scheduleGame} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="opponent-name">Opponent Name</Label>
                <Input
                  id="opponent-name"
                  name="opponent-name"
                  placeholder="e.g., Eagles U12"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Game Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {gameDate ? format(gameDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={gameDate}
                      onSelect={setGameDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="game-type">Game Type</Label>
                <Select name="game-type" defaultValue="home">
                  <SelectTrigger>
                    <SelectValue placeholder="Select game type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home Game</SelectItem>
                    <SelectItem value="away">Away Game</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule Game'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default TeamManagement;
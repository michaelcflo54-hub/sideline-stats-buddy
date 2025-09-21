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
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Mail, Settings, BookOpen, ArrowLeft, Calendar as CalendarIcon, Edit, Trash2, MessageSquare, Share2 } from 'lucide-react';
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
  const [showEditGame, setShowEditGame] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [gameDate, setGameDate] = useState<Date>();
  const [editGameDate, setEditGameDate] = useState<Date>();
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

      // Fetch team members (coaches and parents) - using secure function
      const { data: membersData } = await supabase
        .rpc('get_my_team_member_profiles');
      
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
      // Generate a unique 6-character team code
      const teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          season_year: seasonYear,
          team_code: teamCode
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
      const { error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email,
          teamId: team?.id || '',
          teamName: team?.name || 'Your Team',
          teamCode: team?.team_code || '',
          inviterName: `${profile?.first_name} ${profile?.last_name}`.trim(),
          appUrl: window.location.origin
        }
      });

      if (error) throw error;

      toast({
        title: "Invitation sent!",
        description: `Email invitation has been sent to ${email}.`
      });

      setShowInviteUser(false);
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error sending invitation",
        description: error.message || 'Failed to send invitation email',
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

  const deleteGame = async (gameId: string, gameName: string) => {
    if (!confirm(`Are you sure you want to delete the game vs ${gameName}?`)) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;

      toast({
        title: "Game deleted!",
        description: `Game vs ${gameName} has been deleted.`
      });

      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error deleting game",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditGame = (game: any) => {
    setEditingGame(game);
    setEditGameDate(new Date(game.game_date));
    setShowEditGame(true);
  };

  const editGame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingGame) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const gameData = {
      opponent_name: formData.get('opponent-name') as string,
      game_date: editGameDate ? format(editGameDate, 'yyyy-MM-dd') : editingGame.game_date,
      is_home_game: formData.get('game-type') === 'home',
    };

    try {
      const { error } = await supabase
        .from('games')
        .update(gameData)
        .eq('id', editingGame.id);

      if (error) throw error;

      toast({
        title: "Game updated!",
        description: `Game vs ${gameData.opponent_name} has been updated.`
      });

      setShowEditGame(false);
      setEditingGame(null);
      setEditGameDate(undefined);
      fetchTeamData();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "Error updating game",
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

  const sendFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const feedbackData = {
      role: formData.get('role') as string,
      feedback: formData.get('feedback') as string,
      senderName: `${profile?.first_name} ${profile?.last_name}`.trim(),
      senderEmail: profile?.email || ''
    };

    try {
      const { error } = await supabase.functions.invoke('send-feedback', {
        body: feedbackData
      });

      if (error) throw error;

      toast({
        title: "Feedback sent!",
        description: "Your feedback has been sent to the development team."
      });

      setShowFeedback(false);
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      console.error('Error sending feedback:', error);
      toast({
        title: "Error sending feedback",
        description: error.message || 'Failed to send feedback',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    // Parse positions from checkboxes
    const positions = [];
    const positionOptions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
    positionOptions.forEach(pos => {
      if (formData.get(`position-${pos}`)) {
        positions.push(pos);
      }
    });

    const playerData = {
      team_id: profile.team_id,
      first_name: formData.get('first-name') as string,
      last_name: formData.get('last-name') as string,
      nickname: formData.get('nickname') as string || null,
      jersey_number: parseInt(formData.get('jersey-number') as string),
      positions: positions.length > 0 ? positions : null,
      grade_level: formData.get('grade-level') ? parseInt(formData.get('grade-level') as string) : null,
      height: formData.get('height') ? parseInt(formData.get('height') as string) : null,
      weight: formData.get('weight') ? parseInt(formData.get('weight') as string) : null,
      active: true
    };

    try {
      const { error } = await supabase
        .from('players')
        .insert(playerData);

      if (error) throw error;

      toast({
        title: "Player added!",
        description: `${playerData.first_name} ${playerData.last_name} has been added to the team.`
      });

      setShowAddPlayer(false);
      fetchTeamData();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "Error adding player",
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
            <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send Feedback
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Send Feedback to Developers</DialogTitle>
                  <DialogDescription>
                    Share your needs, requirements, or suggestions with our development team.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={sendFeedback} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Your Role</Label>
                    <Select name="role" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="head_coach">Head Coach</SelectItem>
                        <SelectItem value="assistant_coach">Assistant Coach</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="player">Player</SelectItem>
                        <SelectItem value="administrator">Administrator</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback">Feedback / Requirements</Label>
                    <Textarea
                      id="feedback"
                      name="feedback"
                      placeholder="Describe your needs, suggestions, or requirements..."
                      rows={5}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Feedback'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
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

        {team?.team_code && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="text-3xl font-mono font-bold tracking-wider bg-background p-4 rounded-lg border">
                    {team.team_code}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share this code with assistant coaches and parents so they can join your team.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(team.team_code);
                      toast({ title: "Copied!", description: "Team code copied to clipboard" });
                    }}
                  >
                    Copy Team Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Share Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-mono break-all">
                      {window.location.origin}/join/{team.team_code}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share this link for easy team joining.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/join/${team.team_code}`;
                      navigator.clipboard.writeText(shareUrl);
                      toast({ title: "Copied!", description: "Share link copied to clipboard" });
                    }}
                  >
                    Copy Share Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Players ({players.length})
              </CardTitle>
              {canManageTeam && (
                <Button onClick={() => setShowAddPlayer(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Player
                </Button>
              )}
            </div>
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
                  {canManageTeam && (
                    <div className="mt-2">
                      <Button onClick={() => setShowAddPlayer(true)} variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Add First Player
                      </Button>
                    </div>
                  )}
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
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/game/${game.id}`)}
                    >
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
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        {game.final_score_us !== null && game.final_score_opponent !== null ? (
                          <div className="text-lg font-bold">
                            {game.final_score_us} - {game.final_score_opponent}
                          </div>
                        ) : (
                          <Badge variant="secondary">Scheduled</Badge>
                        )}
                      </div>
                      {canManageTeam && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditGame(game);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGame(game.id, game.opponent_name);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
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

        {/* Edit Game Dialog */}
        <Dialog open={showEditGame} onOpenChange={(open) => {
          setShowEditGame(open);
          if (!open) {
            setEditingGame(null);
            setEditGameDate(undefined);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Game</DialogTitle>
              <DialogDescription>
                Update the game details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editGame} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-opponent-name">Opponent Name</Label>
                <Input
                  id="edit-opponent-name"
                  name="opponent-name"
                  defaultValue={editingGame?.opponent_name}
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
                      {editGameDate ? format(editGameDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editGameDate}
                      onSelect={setEditGameDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-game-type">Game Type</Label>
                <Select name="game-type" defaultValue={editingGame?.is_home_game ? 'home' : 'away'}>
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
                {loading ? 'Updating...' : 'Update Game'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Player Dialog */}
        <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Player</DialogTitle>
              <DialogDescription>
                Add a new player to your team roster.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={addPlayer} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Basic Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                      id="first-name"
                      name="first-name"
                      placeholder="e.g., John"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      name="last-name"
                      placeholder="e.g., Smith"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname (Optional)</Label>
                    <Input
                      id="nickname"
                      name="nickname"
                      placeholder="e.g., Johnny"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="jersey-number">Jersey Number</Label>
                    <Input
                      id="jersey-number"
                      name="jersey-number"
                      type="number"
                      min="0"
                      max="99"
                      placeholder="e.g., 12"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="grade-level">Grade Level (Optional)</Label>
                    <Input
                      id="grade-level"
                      name="grade-level"
                      type="number"
                      min="1"
                      max="12"
                      placeholder="e.g., 8"
                    />
                  </div>
                </div>

                {/* Physical Stats & Positions */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Physical Stats & Positions</h3>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height in Inches (Optional)</Label>
                    <Input
                      id="height"
                      name="height"
                      type="number"
                      min="36"
                      max="84"
                      placeholder="e.g., 60 (for 5'0'')"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight in lbs (Optional)</Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      min="50"
                      max="300"
                      placeholder="e.g., 140"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Positions (Select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'].map(position => (
                        <label key={position} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name={`position-${position}`}
                            value={position}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm font-medium">{position}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Adding...' : 'Add Player'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

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
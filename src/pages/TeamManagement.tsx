import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Mail } from 'lucide-react';

const TeamManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [team, setTeam] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);

  const isHeadCoach = profile?.role === 'head_coach';

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

      // Fetch team members
      const { data: membersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('team_id', profile.team_id);
      
      setTeamMembers(membersData || []);
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

  if (!profile?.team_id && isHeadCoach) {
    return (
      <Layout>
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create Your Team</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                As a head coach, you need to create a team first.
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
          <div>
            <h2 className="text-3xl font-bold">Team Management</h2>
            <p className="text-muted-foreground">
              {team ? `Manage ${team.name} - ${team.season_year} Season` : 'Loading team...'}
            </p>
          </div>
          {isHeadCoach && (
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members ({teamMembers.length})
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

        {isHeadCoach && (
          <Card>
            <CardHeader>
              <CardTitle>Team Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">For Assistant Coaches:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Have them sign up for an account at this app</li>
                    <li>Share your team code: <code className="bg-muted px-1 rounded">{team?.id?.slice(0, 8)}</code></li>
                    <li>Contact you to be manually added to the team</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-medium mb-2">What coaches can do:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
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
      </div>
    </Layout>
  );
};

export default TeamManagement;
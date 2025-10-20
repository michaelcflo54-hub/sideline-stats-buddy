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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowLeft, Shield, Mail, Trash2 } from 'lucide-react';

const CoachesPage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInviteCoach, setShowInviteCoach] = useState(false);

  const isHeadCoach = profile?.role === 'head_coach';

  useEffect(() => {
    if (profile?.team_id) {
      fetchCoaches();
    }
  }, [profile]);

  const fetchCoaches = async () => {
    try {
      const { data: membersData } = await supabase
        .rpc('get_my_team_member_profiles');
      
      // Filter to only show coaches
      const coachData = (membersData || []).filter((member: any) => 
        member.role === 'head_coach' || member.role === 'assistant_coach'
      );
      setCoaches(coachData);
    } catch (error) {
      console.error('Error fetching coaches:', error);
    }
  };

  const inviteCoach = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;

    try {
      const { error } = await supabase.functions.invoke('send-invitation', {
        body: { 
          email, 
          role, 
          teamId: profile.team_id 
        }
      });

      if (error) throw error;

      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${email}.`
      });

      setShowInviteCoach(false);
      e.currentTarget.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeCoach = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this coach from the team?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: null, role: null })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Coach removed",
        description: "The coach has been removed from the team."
      });

      fetchCoaches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove coach.",
        variant: "destructive"
      });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'head_coach':
        return <Badge variant="default">Head Coach</Badge>;
      case 'assistant_coach':
        return <Badge variant="secondary">Assistant Coach</Badge>;
      default:
        return null;
    }
  };

  if (!isHeadCoach) {
    return (
      <Layout>
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
              <p className="text-muted-foreground">
                Only head coaches can manage coaching staff.
              </p>
              <Button 
                onClick={() => navigate('/team')} 
                className="mt-4"
                variant="outline"
              >
                Back to Team Hub
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

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
              <h1 className="text-3xl font-bold">Coaching Staff</h1>
              <p className="text-muted-foreground">Manage your coaching team</p>
            </div>
          </div>
          <Dialog open={showInviteCoach} onOpenChange={setShowInviteCoach}>
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
                  Send an invitation to join your coaching staff
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={inviteCoach} className="space-y-4">
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
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" required defaultValue="assistant_coach">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="head_coach">Head Coach</SelectItem>
                      <SelectItem value="assistant_coach">Assistant Coach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Invitation'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Coaching Staff ({coaches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coaches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No coaches yet. Invite your coaching staff to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {coaches.map((coach) => (
                  <div
                    key={coach.user_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {coach.first_name} {coach.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {coach.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(coach.role)}
                      {coach.user_id !== profile.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCoach(coach.user_id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CoachesPage;

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Invitation {
  id: string;
  team_id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
  team_name?: string;
  team_code?: string;
  inviter_name?: string;
}

interface PendingInvitationsProps {
  onAccepted: () => void;
}

const PendingInvitations = ({ onAccepted }: PendingInvitationsProps) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      // First get the invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitations')
        .select('*')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (invitationsError) {
        console.error('Error fetching invitations:', invitationsError);
        return;
      }

      if (!invitationsData || invitationsData.length === 0) {
        setInvitations([]);
        return;
      }

      // Get team names
      const teamIds = invitationsData.map(inv => inv.team_id);
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, team_code')
        .in('id', teamIds);

      // Get inviter names
      const inviterIds = invitationsData.map(inv => inv.invited_by);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', inviterIds);

      // Combine the data
      const enrichedInvitations = invitationsData.map(invitation => {
        const team = teamsData?.find(t => t.id === invitation.team_id);
        const inviter = profilesData?.find(p => p.user_id === invitation.invited_by);
        
        return {
          ...invitation,
          team_name: team?.name || 'Unknown Team',
          team_code: team?.team_code || '',
          inviter_name: inviter ? `${inviter.first_name} ${inviter.last_name}` : 'Unknown'
        };
      });

      setInvitations(enrichedInvitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    setAccepting(invitationId);
    try {
      const { data: success, error } = await supabase
        .rpc('accept_invitation', { invitation_id: invitationId });

      if (error) {
        throw error;
      }

      if (success) {
        toast({
          title: "Invitation Accepted!",
          description: "You have successfully joined the team. Refreshing...",
        });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        onAccepted();
      } else {
        toast({
          title: "Invalid Invitation",
          description: "This invitation may have expired or is no longer valid.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error Accepting Invitation",
        description: "There was an error accepting the invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAccepting(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

      if (error) {
        throw error;
      }

      toast({
        title: "Invitation Declined",
        description: "You have declined the team invitation.",
      });

      // Remove from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast({
        title: "Error Declining Invitation",
        description: "There was an error declining the invitation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  const formatExpiresIn = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} hours`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">Loading invitations...</div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Team Invitations</CardTitle>
        <CardDescription>
          You have pending invitations to join teams
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{invitation.team_name}</h3>
                <p className="text-sm text-muted-foreground">
                  Invited by {invitation.inviter_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTimeAgo(invitation.created_at)}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="mb-1">
                  <Clock className="h-3 w-3 mr-1" />
                  Expires in {formatExpiresIn(invitation.expires_at)}
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => handleAcceptInvitation(invitation.id)}
                disabled={accepting === invitation.id}
                className="flex-1"
              >
                {accepting === invitation.id ? (
                  "Accepting..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDeclineInvitation(invitation.id)}
                disabled={accepting === invitation.id}
              >
                <X className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PendingInvitations;
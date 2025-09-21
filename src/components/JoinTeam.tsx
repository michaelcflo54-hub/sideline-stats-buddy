import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JoinTeamProps {
  onSuccess: () => void;
}

const JoinTeam = ({ onSuccess }: JoinTeamProps) => {
  const [teamCode, setTeamCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleJoinTeam = async () => {
    if (!teamCode.trim()) {
      toast({
        title: "Team Code Required",
        description: "Please enter a team code to join.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First check if the team code is valid using the secure function
      const { data: canJoin, error: checkError } = await supabase
        .rpc('can_join_team_by_code', { code: teamCode.trim() });

      if (checkError) {
        throw checkError;
      }

      if (!canJoin) {
        toast({
          title: "Invalid Team Code",
          description: "The team code you entered was not found or you're already part of a team.",
          variant: "destructive",
        });
        return;
      }

      // If team code is valid, proceed to join
      const { data: success, error } = await supabase
        .rpc('join_team_by_code', { code: teamCode.trim() });

      if (error) {
        throw error;
      }

      if (success) {
        toast({
          title: "Successfully Joined Team!",
          description: "You have been added to the team. Refreshing...",
        });
        // Refresh the page to load team data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        onSuccess();
      } else {
        toast({
          title: "Unable to Join Team",
          description: "There was an issue joining the team. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error joining team:', error);
      toast({
        title: "Error Joining Team",
        description: "There was an error joining the team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinTeam();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Join a Team</CardTitle>
        <CardDescription>
          Enter the team code provided by your head coach to join the team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teamCode">Team Code</Label>
          <Input
            id="teamCode"
            placeholder="Enter team code (e.g., ABC123)"
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            maxLength={6}
            className="text-center text-lg font-mono tracking-wider"
          />
        </div>
        <Button 
          onClick={handleJoinTeam} 
          disabled={isLoading || !teamCode.trim()}
          className="w-full"
        >
          {isLoading ? "Joining..." : "Join Team"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default JoinTeam;
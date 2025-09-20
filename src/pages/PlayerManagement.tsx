import { useState, useEffect } from 'react';
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
import { Plus, Users, Edit } from 'lucide-react';

const PlayerManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const canManage = profile?.role === 'head_coach' || profile?.role === 'assistant_coach';

  useEffect(() => {
    if (profile?.team_id) {
      fetchPlayers();
    }
  }, [profile]);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', profile.team_id)
        .eq('active', true)
        .order('jersey_number');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const addPlayer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const playerData = {
      team_id: profile.team_id,
      jersey_number: parseInt(formData.get('jersey-number') as string),
      first_name: formData.get('first-name') as string,
      last_name: formData.get('last-name') as string,
      position: formData.get('position') as string,
      weight: formData.get('weight') ? parseInt(formData.get('weight') as string) : null,
      height: formData.get('height') ? parseInt(formData.get('height') as string) : null,
      grade_level: formData.get('grade-level') ? parseInt(formData.get('grade-level') as string) : null,
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
      fetchPlayers();
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

  const positions = [
    'QB', 'RB', 'FB', 'WR', 'TE', 'C', 'G', 'T', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P'
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Player Management</h2>
            <p className="text-muted-foreground">Manage your team roster</p>
          </div>
          {canManage && (
            <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Player
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Player</DialogTitle>
                  <DialogDescription>
                    Add a player to your team roster.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={addPlayer} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input
                        id="first-name"
                        name="first-name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input
                        id="last-name"
                        name="last-name"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jersey-number">Jersey #</Label>
                      <Input
                        id="jersey-number"
                        name="jersey-number"
                        type="number"
                        min="1"
                        max="99"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Select name="position" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map(pos => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="grade-level">Grade</Label>
                      <Input
                        id="grade-level"
                        name="grade-level"
                        type="number"
                        min="1"
                        max="12"
                        placeholder="9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight</Label>
                      <Input
                        id="weight"
                        name="weight"
                        type="number"
                        placeholder="150"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (in)</Label>
                      <Input
                        id="height"
                        name="height"
                        type="number"
                        placeholder="70"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Player'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((player) => (
            <Card key={player.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    #{player.jersey_number} {player.first_name} {player.last_name}
                  </CardTitle>
                  <Badge variant="secondary">{player.position}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  {player.grade_level && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Grade:</span>
                      <span>{player.grade_level}</span>
                    </div>
                  )}
                  {player.weight && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weight:</span>
                      <span>{player.weight} lbs</span>
                    </div>
                  )}
                  {player.height && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Height:</span>
                      <span>{Math.floor(player.height / 12)}'{player.height % 12}"</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {players.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No players yet</h3>
              <p className="text-muted-foreground mb-4">
                {canManage 
                  ? "Add players to your roster to get started with analytics." 
                  : "Players will appear here once coaches add them to the roster."}
              </p>
              {canManage && (
                <Button onClick={() => setShowAddPlayer(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Player
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default PlayerManagement;
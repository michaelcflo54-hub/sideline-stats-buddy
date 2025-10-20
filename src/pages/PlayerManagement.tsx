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
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Edit, ArrowLeft } from 'lucide-react';

const PlayerManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [showEditPlayer, setShowEditPlayer] = useState(false);
  const [editSelectedPositions, setEditSelectedPositions] = useState<string[]>([]);

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
      nickname: formData.get('nickname') as string || null,
      positions: selectedPositions, // Use array of positions
      weight: formData.get('weight') ? parseInt(formData.get('weight') as string) : null,
      height: formData.get('height') ? parseInt(formData.get('height') as string) : null,
      grade_level: formData.get('grade-level') ? parseInt(formData.get('grade-level') as string) : null,
    };

    if (selectedPositions.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one position.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

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
      setSelectedPositions([]);
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

  const handlePositionChange = (position: string, checked: boolean) => {
    setSelectedPositions(prev => 
      checked 
        ? [...prev, position]
        : prev.filter(p => p !== position)
    );
  };

  const handleEditPositionChange = (position: string, checked: boolean) => {
    setEditSelectedPositions(prev => 
      checked 
        ? [...prev, position]
        : prev.filter(p => p !== position)
    );
  };

  const handleEditPlayer = (player: any) => {
    setEditingPlayer(player);
    setEditSelectedPositions(player.positions || []);
    setShowEditPlayer(true);
  };

  const updatePlayer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPlayer || editSelectedPositions.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one position.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const updatedPlayerData = {
      first_name: formData.get('edit-first-name') as string,
      last_name: formData.get('edit-last-name') as string,
      nickname: formData.get('edit-nickname') as string || null,
      jersey_number: parseInt(formData.get('edit-jersey-number') as string),
      positions: editSelectedPositions,
      grade_level: formData.get('edit-grade-level') ? parseInt(formData.get('edit-grade-level') as string) : null,
      weight: formData.get('edit-weight') ? parseInt(formData.get('edit-weight') as string) : null,
      height: formData.get('edit-height') ? parseInt(formData.get('edit-height') as string) : null,
    };

    try {
      const { error } = await supabase
        .from('players')
        .update(updatedPlayerData)
        .eq('id', editingPlayer.id);

      if (error) throw error;

      toast({
        title: "Player updated!",
        description: `${updatedPlayerData.first_name} ${updatedPlayerData.last_name}'s information has been updated.`
      });

      setShowEditPlayer(false);
      setEditingPlayer(null);
      setEditSelectedPositions([]);
      fetchPlayers();
    } catch (error: any) {
      toast({
        title: "Error updating player",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
              <h2 className="text-3xl font-bold">Player Management</h2>
              <p className="text-muted-foreground">Manage your team roster</p>
            </div>
          </div>
          {canManage && (
            <Dialog open={showAddPlayer} onOpenChange={(open) => {
              setShowAddPlayer(open);
              if (!open) setSelectedPositions([]);
            }}>
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname</Label>
                    <Input
                      id="nickname"
                      name="nickname"
                      placeholder="Optional nickname"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jersey-number">Jersey #</Label>
                      <Input
                        id="jersey-number"
                        name="jersey-number"
                        type="number"
                        min="0"
                        max="99"
                        required
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Positions</Label>
                      <div className="grid grid-cols-3 gap-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
                        {positions.map(pos => (
                          <div key={pos} className="flex items-center space-x-2">
                            <Checkbox
                              id={pos}
                              checked={selectedPositions.includes(pos)}
                              onCheckedChange={(checked) => 
                                handlePositionChange(pos, checked as boolean)
                              }
                            />
                            <Label htmlFor={pos} className="text-sm cursor-pointer">
                              {pos}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {selectedPositions.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Select at least one position
                        </p>
                      )}
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
                      {player.nickname && (
                        <span className="text-muted-foreground font-normal"> "{player.nickname}"</span>
                      )}
                    </CardTitle>
                   <div className="flex flex-wrap gap-1">
                     {player.positions?.map((position: string, index: number) => (
                       <Badge key={index} variant="secondary" className="text-xs">
                         {position}
                       </Badge>
                     ))}
                   </div>
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
                 {canManage && (
                   <div className="mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleEditPlayer(player)}
                        >
                          <Edit className="mr-2 h-3 w-3" />
                          Edit Player
                        </Button>
                   </div>
                 )}
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

      {/* Edit Player Dialog */}
      <Dialog open={showEditPlayer} onOpenChange={(open) => {
        setShowEditPlayer(open);
        if (!open) {
          setEditingPlayer(null);
          setEditSelectedPositions([]);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Player Information</DialogTitle>
            <DialogDescription>
              Update information for {editingPlayer?.first_name} {editingPlayer?.last_name}
              {editingPlayer?.nickname && ` "${editingPlayer.nickname}"`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updatePlayer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">First Name</Label>
                <Input
                  id="edit-first-name"
                  name="edit-first-name"
                  defaultValue={editingPlayer?.first_name || ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Last Name</Label>
                <Input
                  id="edit-last-name"
                  name="edit-last-name"
                  defaultValue={editingPlayer?.last_name || ''}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-nickname">Nickname</Label>
              <Input
                id="edit-nickname"
                name="edit-nickname"
                defaultValue={editingPlayer?.nickname || ''}
                placeholder="Optional nickname"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-jersey-number">Jersey #</Label>
                <Input
                  id="edit-jersey-number"
                  name="edit-jersey-number"
                  type="number"
                  min="0"
                  max="99"
                  defaultValue={editingPlayer?.jersey_number || ''}
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Positions</Label>
                <div className="grid grid-cols-3 gap-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
                  {positions.map(pos => (
                    <div key={pos} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${pos}`}
                        checked={editSelectedPositions.includes(pos)}
                        onCheckedChange={(checked) => 
                          handleEditPositionChange(pos, checked as boolean)
                        }
                      />
                      <Label htmlFor={`edit-${pos}`} className="text-sm cursor-pointer">
                        {pos}
                      </Label>
                    </div>
                  ))}
                </div>
                {editSelectedPositions.length === 0 && (
                  <p className="text-xs text-red-500">
                    Select at least one position
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-grade-level">Grade</Label>
                <Input
                  id="edit-grade-level"
                  name="edit-grade-level"
                  type="number"
                  min="1"
                  max="12"
                  defaultValue={editingPlayer?.grade_level || ''}
                  placeholder="9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-weight">Weight</Label>
                <Input
                  id="edit-weight"
                  name="edit-weight"
                  type="number"
                  defaultValue={editingPlayer?.weight || ''}
                  placeholder="150"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-height">Height (in)</Label>
                <Input
                  id="edit-height"
                  name="edit-height"
                  type="number"
                  defaultValue={editingPlayer?.height || ''}
                  placeholder="70"
                />
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full" 
              disabled={loading || editSelectedPositions.length === 0}
            >
              {loading ? 'Updating...' : 'Update Player'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default PlayerManagement;
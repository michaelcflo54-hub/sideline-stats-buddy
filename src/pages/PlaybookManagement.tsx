import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowLeft, BookOpen, Target, Zap, Shield, Edit, Upload } from 'lucide-react';

interface PositionAssignment {
  position: string;
  assignment: string;
}

interface Play {
  id: string;
  name: string;
  description: string;
  category: 'offense' | 'defense' | 'special_teams';
  direction?: 'left' | 'right' | 'center';
  formation?: string;
  playHole?: string;
  motionLeft?: boolean;
  motionRight?: boolean;
  positionAssignments: PositionAssignment[];
  created_at: string;
  team_id: string;
}

const PlaybookManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddPlay, setShowAddPlay] = useState(false);
  const [showEditPlay, setShowEditPlay] = useState(false);
  const [editingPlay, setEditingPlay] = useState<Play | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);

  const canManage = profile?.role === 'head_coach' || profile?.role === 'assistant_coach';

  useEffect(() => {
    if (profile?.team_id && canManage) {
      fetchPlays();
    }
  }, [profile, canManage]);

  const fetchPlays = async () => {
    try {
      // For now, we'll use a simple local state implementation
      // In a real app, you'd want to create a 'playbook' table in Supabase
      const savedPlays = localStorage.getItem(`playbook_${profile.team_id}`);
      if (savedPlays) {
        setPlays(JSON.parse(savedPlays));
      }
    } catch (error) {
      console.error('Error fetching plays:', error);
    }
  };

  const addPlay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    // Parse position assignments from form
    const assignments: PositionAssignment[] = [];
    const positions = ['QB', 'F', 'H', 'FB', 'L-TE', 'R-TE', 'OL'];
    positions.forEach(pos => {
      const assignment = formData.get(`assignment-${pos}`) as string;
      if (assignment && assignment.trim()) {
        assignments.push({ position: pos, assignment: assignment.trim() });
      }
    });
    
    const newPlay: Play = {
      id: crypto.randomUUID(),
      name: formData.get('play-name') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as 'offense' | 'defense' | 'special_teams',
      direction: formData.get('direction') as 'left' | 'right' | 'center' || undefined,
      formation: formData.get('formation') as string || undefined,
      playHole: formData.get('play-hole') as string || undefined,
      motionLeft: formData.get('motion-left') === 'on',
      motionRight: formData.get('motion-right') === 'on',
      positionAssignments: assignments,
      created_at: new Date().toISOString(),
      team_id: profile.team_id
    };

    try {
      const updatedPlays = [...plays, newPlay];
      setPlays(updatedPlays);
      
      // Save to localStorage (in a real app, this would go to Supabase)
      localStorage.setItem(`playbook_${profile.team_id}`, JSON.stringify(updatedPlays));

      toast({
        title: "Play added!",
        description: `${newPlay.name} has been added to your playbook.`
      });

      setShowAddPlay(false);
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "Error adding play",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlay = (play: Play) => {
    setEditingPlay(play);
    setShowEditPlay(true);
  };

  const editPlay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPlay) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    // Parse position assignments from form
    const assignments: PositionAssignment[] = [];
    const positions = ['QB', 'F', 'H', 'FB', 'L-TE', 'R-TE', 'OL'];
    positions.forEach(pos => {
      const assignment = formData.get(`assignment-${pos}`) as string;
      if (assignment && assignment.trim()) {
        assignments.push({ position: pos, assignment: assignment.trim() });
      }
    });
    
    const updatedPlay: Play = {
      ...editingPlay,
      name: formData.get('play-name') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as 'offense' | 'defense' | 'special_teams',
      direction: formData.get('direction') as 'left' | 'right' | 'center' || undefined,
      formation: formData.get('formation') as string || undefined,
      playHole: formData.get('play-hole') as string || undefined,
      motionLeft: formData.get('motion-left') === 'on',
      motionRight: formData.get('motion-right') === 'on',
      positionAssignments: assignments,
    };

    try {
      const updatedPlays = plays.map(play => 
        play.id === editingPlay.id ? updatedPlay : play
      );
      setPlays(updatedPlays);
      
      // Save to localStorage (in a real app, this would go to Supabase)
      localStorage.setItem(`playbook_${profile.team_id}`, JSON.stringify(updatedPlays));

      toast({
        title: "Play updated!",
        description: `${updatedPlay.name} has been updated.`
      });

      setShowEditPlay(false);
      setEditingPlay(null);
    } catch (error: any) {
      toast({
        title: "Error updating play",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportPowerPoint = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.pptx') && !file.name.endsWith('.potx')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PowerPoint file (.pptx or .potx)",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);

    try {
      toast({
        title: "Processing PowerPoint...",
        description: "This may take a moment. Please wait.",
      });

      // For now, show a message that this feature requires backend processing
      // In a real implementation, you would:
      // 1. Upload the file to Supabase Storage
      // 2. Call an edge function to parse the PowerPoint using a library
      // 3. Extract play information and return structured data
      // 4. Create plays from the extracted data

      toast({
        title: "Import functionality ready",
        description: "Please manually enter plays for now. Advanced PowerPoint parsing requires backend processing which can be added via Edge Functions.",
      });

      setShowImport(false);
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'offense': return <Target className="h-4 w-4" />;
      case 'defense': return <Shield className="h-4 w-4" />;
      case 'special_teams': return <Zap className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'offense': return 'bg-green-500';
      case 'defense': return 'bg-red-500';
      case 'special_teams': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredPlays = selectedCategory === 'all' 
    ? plays 
    : plays.filter(play => play.category === selectedCategory);

  if (!canManage) {
    return (
      <Layout>
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
              <p className="text-muted-foreground">
                Only coaches can manage the team playbook.
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
              <h2 className="text-3xl font-bold">Playbook Management</h2>
              <p className="text-muted-foreground">Create and organize your team's plays</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={showImport} onOpenChange={setShowImport}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import from PowerPoint
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Plays from PowerPoint</DialogTitle>
                  <DialogDescription>
                    Upload a PowerPoint file (.pptx or .potx) containing your playbook. 
                    Each slide should represent a play with its name, description, and position assignments.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <Label htmlFor="ppt-upload" className="cursor-pointer">
                      <span className="text-sm font-medium">Click to upload PowerPoint file</span>
                      <Input
                        id="ppt-upload"
                        type="file"
                        accept=".pptx,.potx"
                        onChange={handleImportPowerPoint}
                        disabled={importing}
                        className="hidden"
                      />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supports .pptx and .potx files
                    </p>
                  </div>
                  {importing && (
                    <div className="text-center text-sm text-muted-foreground">
                      Processing file... This may take a moment.
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showAddPlay} onOpenChange={setShowAddPlay}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Play
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Play</DialogTitle>
                <DialogDescription>
                  Create a new play for your team's playbook with detailed position assignments.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addPlay} className="space-y-6" id="add-play-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Basic Information</h3>
                    <div className="space-y-2">
                      <Label htmlFor="play-name">Play Name</Label>
                      <Input
                        id="play-name"
                        name="play-name"
                        placeholder="e.g., Power I"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="play-hole">Play Hole</Label>
                      <Input
                        id="play-hole"
                        name="play-hole"
                        placeholder="e.g., 8/9"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <select 
                        id="category"
                        name="category" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                        onChange={(e) => {
                          const directionField = document.getElementById('direction-field');
                          if (directionField) {
                            directionField.style.display = e.target.value === 'defense' ? 'block' : 'none';
                          }
                        }}
                      >
                        <option value="offense">Offense</option>
                        <option value="defense">Defense</option>
                        <option value="special_teams">Special Teams</option>
                      </select>
                    </div>

                    <div id="direction-field" className="space-y-2" style={{ display: 'none' }}>
                      <Label htmlFor="direction">Direction</Label>
                      <select 
                        name="direction" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select direction (optional)</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="center">Center</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="formation">Primary Formation</Label>
                      <Input
                        id="formation"
                        name="formation"
                        placeholder="e.g., I-Formation"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Motion</Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="motion-left"
                            name="motion-left"
                            className="h-4 w-4 rounded border-input"
                          />
                          <Label htmlFor="motion-left" className="font-normal cursor-pointer">
                            Motion Left
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="motion-right"
                            name="motion-right"
                            className="h-4 w-4 rounded border-input"
                          />
                          <Label htmlFor="motion-right" className="font-normal cursor-pointer">
                            Motion Right
                          </Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">General Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Describe the play execution, key points, etc."
                        className="min-h-[80px]"
                        required
                      />
                    </div>
                  </div>

                  {/* Position Assignments */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Position Assignments</h3>
                    {['QB', 'F', 'H', 'FB', 'L-TE', 'R-TE', 'OL'].map(position => (
                      <div key={position} className="space-y-2">
                        <Label htmlFor={`assignment-${position}`} className="font-mono text-sm">
                          {position}
                        </Label>
                        <Textarea
                          id={`assignment-${position}`}
                          name={`assignment-${position}`}
                          placeholder={`Enter assignment for ${position}...`}
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Play'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

        {/* Edit Play Dialog */}
        <Dialog open={showEditPlay} onOpenChange={(open) => {
          setShowEditPlay(open);
          if (!open) setEditingPlay(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Play</DialogTitle>
              <DialogDescription>
                Update the play details and position assignments in your playbook.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editPlay} className="space-y-6" id="edit-play-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Basic Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="edit-play-name">Play Name</Label>
                    <Input
                      id="edit-play-name"
                      name="play-name"
                      defaultValue={editingPlay?.name}
                      placeholder="e.g., Power I"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-play-hole">Play Hole</Label>
                    <Input
                      id="edit-play-hole"
                      name="play-hole"
                      defaultValue={editingPlay?.playHole}
                      placeholder="e.g., 8/9"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <select 
                      id="edit-category"
                      name="category" 
                      defaultValue={editingPlay?.category}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                      onChange={(e) => {
                        const directionField = document.getElementById('edit-direction-field');
                        if (directionField) {
                          directionField.style.display = e.target.value === 'defense' ? 'block' : 'none';
                        }
                      }}
                    >
                      <option value="offense">Offense</option>
                      <option value="defense">Defense</option>
                      <option value="special_teams">Special Teams</option>
                    </select>
                  </div>

                  <div id="edit-direction-field" className="space-y-2" style={{ display: editingPlay?.category === 'defense' ? 'block' : 'none' }}>
                    <Label htmlFor="edit-direction">Direction</Label>
                    <select 
                      name="direction" 
                      defaultValue={editingPlay?.direction || ''}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select direction (optional)</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                      <option value="center">Center</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-formation">Primary Formation</Label>
                    <Input
                      id="edit-formation"
                      name="formation"
                      defaultValue={editingPlay?.formation}
                      placeholder="e.g., I-Formation"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Motion</Label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-motion-left"
                          name="motion-left"
                          defaultChecked={editingPlay?.motionLeft}
                          className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor="edit-motion-left" className="font-normal cursor-pointer">
                          Motion Left
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-motion-right"
                          name="motion-right"
                          defaultChecked={editingPlay?.motionRight}
                          className="h-4 w-4 rounded border-input"
                          />
                        <Label htmlFor="edit-motion-right" className="font-normal cursor-pointer">
                          Motion Right
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">General Description</Label>
                    <Textarea
                      id="edit-description"
                      name="description"
                      defaultValue={editingPlay?.description}
                      placeholder="Describe the play execution, key points, etc."
                      className="min-h-[80px]"
                      required
                    />
                  </div>
                </div>

                {/* Position Assignments */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Position Assignments</h3>
                  {['QB', 'F', 'H', 'FB', 'L-TE', 'R-TE', 'OL'].map(position => {
                    const existingAssignment = editingPlay?.positionAssignments?.find(a => a.position === position);
                    return (
                      <div key={position} className="space-y-2">
                        <Label htmlFor={`edit-assignment-${position}`} className="font-mono text-sm">
                          {position}
                        </Label>
                        <Textarea
                          id={`edit-assignment-${position}`}
                          name={`assignment-${position}`}
                          defaultValue={existingAssignment?.assignment || ''}
                          placeholder={`Enter assignment for ${position}...`}
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Play'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Category Filter */}
        <div className="flex gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All Plays ({plays.length})
          </Button>
          <Button
            variant={selectedCategory === 'offense' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('offense')}
            className="gap-2"
          >
            <Target className="h-3 w-3" />
            Offense ({plays.filter(p => p.category === 'offense').length})
          </Button>
          <Button
            variant={selectedCategory === 'defense' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('defense')}
            className="gap-2"
          >
            <Shield className="h-3 w-3" />
            Defense ({plays.filter(p => p.category === 'defense').length})
          </Button>
          <Button
            variant={selectedCategory === 'special_teams' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('special_teams')}
            className="gap-2"
          >
            <Zap className="h-3 w-3" />
            Special Teams ({plays.filter(p => p.category === 'special_teams').length})
          </Button>
        </div>

        {/* Plays Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPlays.map((play) => (
            <Card key={play.id} className="hover:shadow-md transition-shadow">
               <CardHeader className="pb-3">
                 <div className="flex items-start justify-between">
                   <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{play.name}</CardTitle>
                        {play.playHole && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {play.playHole}
                          </Badge>
                        )}
                      </div>
                      
                      {play.formation && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Formation:</strong> {play.formation}
                        </p>
                      )}
                      
                      {play.direction && (
                        <p className="text-sm text-muted-foreground mt-1 capitalize">
                          <strong>Direction:</strong> {play.direction}
                        </p>
                      )}

                      {(play.motionLeft || play.motionRight) && (
                        <div className="flex gap-2 mt-2 text-xs">
                          {play.motionLeft && (
                            <Badge variant="secondary" className="text-xs">
                              Motion Left
                            </Badge>
                          )}
                          {play.motionRight && (
                            <Badge variant="secondary" className="text-xs">
                              Motion Right
                            </Badge>
                          )}
                        </div>
                      )}
                   </div>
                   <div className="flex flex-col gap-2">
                     <Badge 
                       variant="secondary" 
                       className={`${getCategoryColor(play.category)} text-white gap-1`}
                     >
                       {getCategoryIcon(play.category)}
                       {play.category.replace('_', ' ')}
                     </Badge>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => handleEditPlay(play)}
                       className="h-7 w-7 p-0"
                     >
                       <Edit className="h-3 w-3" />
                     </Button>
                   </div>
                 </div>
               </CardHeader>
               
              <CardContent className="pt-0 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">General Description</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {play.description}
                  </p>
                </div>
                
                {play.positionAssignments && play.positionAssignments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Position Assignments</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {play.positionAssignments.map((assignment, idx) => (
                        <div key={idx} className="flex gap-2 text-xs">
                          <span className="font-mono font-semibold min-w-[2.5rem] text-right">
                            {assignment.position}:
                          </span>
                          <span className="text-muted-foreground line-clamp-2 flex-1">
                            {assignment.assignment}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="pt-3 border-t text-xs text-muted-foreground">
                  Added {new Date(play.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPlays.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {selectedCategory === 'all' ? 'No plays yet' : `No ${selectedCategory.replace('_', ' ')} plays yet`}
              </h3>
              <p className="text-muted-foreground mb-4">
                Start building your playbook by adding your first play.
              </p>
              <Button onClick={() => setShowAddPlay(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Play
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default PlaybookManagement;
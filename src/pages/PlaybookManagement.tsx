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
import { Plus, ArrowLeft, BookOpen, Target, Zap, Shield, Edit, Upload, PencilRuler } from 'lucide-react';
import PizZip from 'pizzip';
import PlayDesigner, { PlayDiagramData } from '@/components/PlayDesigner';
import PowerPointDesigner, { PowerPointDesign } from '@/components/PowerPointDesigner';

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
  diagram?: PlayDiagramData; // serialized diagram
  powerpoint_design?: PowerPointDesign; // PowerPoint-style design
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
  const [showDesigner, setShowDesigner] = useState(false);
  const [showNewDesigner, setShowNewDesigner] = useState(false);
  const [showPowerPointDesigner, setShowPowerPointDesigner] = useState(false);
  const [newDiagramDraft, setNewDiagramDraft] = useState<PlayDiagramData | null>(null);
  const [newPowerPointDraft, setNewPowerPointDraft] = useState<PowerPointDesign | null>(null);
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
    const positions = ['QB', 'F', 'H', 'FB', 'LT', 'LG', 'C', 'RG', 'RT', 'TE', 'X', 'Z', 'Y'];
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

  const handleDesignPlay = (play: Play) => {
    setEditingPlay(play);
    setShowDesigner(true);
  };

  const editPlay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPlay) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    // Parse position assignments from form
    const assignments: PositionAssignment[] = [];
    const positions = ['QB', 'F', 'H', 'FB', 'LT', 'LG', 'C', 'RG', 'RT', 'TE', 'X', 'Z', 'Y'];
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

  const extractTextFromSlide = (slideXml: string): string => {
    // Extract all text from <a:t> tags in the XML
    const textMatches = slideXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    return textMatches.map(match => {
      const text = match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '');
      return text;
    }).join('\n');
  };

  const parsePlayFromSlide = (slideText: string, index: number): Play | null => {
    const lines = slideText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) return null;

    // Initialize play data
    let playName = `Play ${index + 1}`;
    let description = '';
    let category: 'offense' | 'defense' | 'special_teams' = 'offense';
    let formation = '';
    let playHole = '';
    let direction: 'left' | 'right' | 'center' | undefined = undefined;
    let motionLeft = false;
    let motionRight = false;
    const positionAssignments: PositionAssignment[] = [];

    // First non-empty line is usually the play name
    if (lines.length > 0) {
      playName = lines[0];
      
      // Check if play name contains hole notation like "Lead (1/2 Hole)"
      const holeMatch = playName.match(/\((\d+\/\d+)\s*(?:hole)?\)/i);
      if (holeMatch) {
        playHole = holeMatch[1];
      }
    }

    // All valid position codes
    const validPositions = ['QB', 'F', 'H', 'FB', 'LT', 'LG', 'C', 'RG', 'RT', 'TE', 'L-TE', 'R-TE', 'X', 'Z', 'Y', 'S', 'Q', 'OL'];
    
    // Parse through lines looking for specific patterns
    let currentPosition = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Skip header words that are not actual assignments
      if (line === 'POS' || line === 'Assignment' || line === 'Position') {
        continue;
      }

      // Check for standalone play hole (e.g., "8/9", "6/7")
      if (/^\d+\/\d+$/.test(line)) {
        playHole = line;
        continue;
      }
      
      // Check for formation keywords
      if (lowerLine.includes('formation:')) {
        formation = line.replace(/formation:/i, '').trim();
      } else if (lowerLine.match(/\b(i-formation|shotgun|spread|flex|pro|pistol|wing|double wing|single back)\b/i)) {
        const formationMatch = line.match(/\b(i-formation|shotgun|spread|flex|pro|pistol|wing|double wing|single back)[^\n]*/i);
        if (formationMatch) {
          formation = formationMatch[0].trim();
        }
      }

      // Check for direction
      if (lowerLine.includes('direction:')) {
        const dir = line.replace(/direction:/i, '').trim().toLowerCase();
        if (dir === 'left' || dir === 'right' || dir === 'center') {
          direction = dir as 'left' | 'right' | 'center';
        }
      } else if (lowerLine.match(/\b(left|right)\b/) && (lowerLine.includes('flex') || lowerLine.includes('formation'))) {
        if (lowerLine.includes('left')) direction = 'left';
        if (lowerLine.includes('right')) direction = 'right';
      }

      // Check for motion
      if (lowerLine.includes('motion left') || lowerLine.includes('motion-left')) {
        motionLeft = true;
      }
      if (lowerLine.includes('motion right') || lowerLine.includes('motion-right')) {
        motionRight = true;
      }

      // Check for category
      if (lowerLine.includes('offense')) category = 'offense';
      if (lowerLine.includes('defense')) category = 'defense';
      if (lowerLine.includes('special team')) category = 'special_teams';

      // Check if this line is a position label
      const isPositionLabel = validPositions.includes(line);
      if (isPositionLabel) {
        currentPosition = line;
        continue;
      }

      // If we have a current position and this line is the assignment
      if (currentPosition && line.length > 2 && !validPositions.includes(line)) {
        // This is likely the assignment for the current position
        positionAssignments.push({
          position: currentPosition,
          assignment: line
        });
        currentPosition = '';
        continue;
      }

      // Also check for traditional format: "Position: Assignment" or "Position Assignment"
      const positionPattern = new RegExp(`^(${validPositions.join('|')})[:\\s]+(.+)$`, 'i');
      const positionMatch = line.match(positionPattern);
      if (positionMatch) {
        positionAssignments.push({
          position: positionMatch[1].toUpperCase(),
          assignment: positionMatch[2].trim()
        });
      }
    }

    // Build description from non-assignment text
    const usedLines = new Set<string>();
    usedLines.add(playName);
    if (playHole) usedLines.add(playHole);
    if (formation) usedLines.add(formation);
    
    description = lines.slice(1, 5).filter(line => {
      const lowerLine = line.toLowerCase();
      return !usedLines.has(line) &&
             !validPositions.includes(line) &&
             line !== 'POS' &&
             line !== 'Assignment' &&
             line !== 'Position' &&
             !line.match(/^(QB|F|H|FB|LT|LG|C|RG|RT|TE|L-TE|R-TE|X|Z|Y|S|Q|OL)[\s:]/i) &&
             !lowerLine.includes('formation') &&
             !lowerLine.includes('direction') &&
             !lowerLine.includes('motion') &&
             !/^\d+\/\d+$/.test(line) &&
             line.length > 5;
    }).join(' ');

    if (!description || description.length < 10) {
      description = `${playName} play from imported playbook`;
    }

    // Only return play if it has meaningful content
    if (positionAssignments.length > 0 || playName !== `Play ${index + 1}`) {
      return {
        id: crypto.randomUUID(),
        name: playName,
        description,
        category,
        direction,
        formation: formation || undefined,
        playHole: playHole || undefined,
        motionLeft,
        motionRight,
        positionAssignments,
        created_at: new Date().toISOString(),
        team_id: profile.team_id
      };
    }

    return null;
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

      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const zip = new PizZip(arrayBuffer);

      // Get all slide files from the PPTX (slides are in ppt/slides/slideN.xml)
      const slideFiles = Object.keys(zip.files)
        .filter(filename => filename.match(/ppt\/slides\/slide\d+\.xml$/))
        .sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || '0');
          const numB = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || '0');
          return numA - numB;
        });

      const importedPlays: Play[] = [];

      // Parse each slide
      for (let i = 0; i < slideFiles.length; i++) {
        const slideFile = slideFiles[i];
        const slideXml = zip.files[slideFile].asText();
        const slideText = extractTextFromSlide(slideXml);
        
        const play = parsePlayFromSlide(slideText, i);
        if (play) {
          importedPlays.push(play);
        }
      }

      if (importedPlays.length === 0) {
        toast({
          title: "No plays found",
          description: "Could not extract any plays from the PowerPoint file.",
          variant: "destructive"
        });
        return;
      }

      // Add imported plays to the playbook
      const updatedPlays = [...plays, ...importedPlays];
      setPlays(updatedPlays);
      localStorage.setItem(`playbook_${profile.team_id}`, JSON.stringify(updatedPlays));

      toast({
        title: "Import successful!",
        description: `Imported ${importedPlays.length} play${importedPlays.length > 1 ? 's' : ''} from PowerPoint.`
      });

      setShowImport(false);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to parse PowerPoint file. Please check the file format.",
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
            <Dialog open={showNewDesigner} onOpenChange={(open) => {
              setShowNewDesigner(open);
              if (!open) setNewDiagramDraft(null);
            }}>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <PencilRuler className="mr-2 h-4 w-4" />
                  Design New Play
                </Button>
              </DialogTrigger>
            </Dialog>
            
            <Dialog open={showPowerPointDesigner} onOpenChange={(open) => {
              setShowPowerPointDesigner(open);
              if (!open) setNewPowerPointDraft(null);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <PencilRuler className="mr-2 h-4 w-4" />
                  PowerPoint Style
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>PowerPoint Style Play Designer</DialogTitle>
                  <DialogDescription>Create professional play diagrams with text, shapes, and drawing tools like PowerPoint.</DialogDescription>
                </DialogHeader>
                <PowerPointDesigner
                  initial={editingPlay?.powerpoint_design || null}
                  onSave={(data) => {
                    if (editingPlay) {
                      // Editing existing play
                      const updated = plays.map(p => p.id === editingPlay.id ? { ...p, powerpoint_design: data } : p);
                      setPlays(updated);
                      localStorage.setItem(`playbook_${profile.team_id}`, JSON.stringify(updated));
                      toast({ title: 'Design updated', description: `${editingPlay.name} design updated.` });
                      setShowPowerPointDesigner(false);
                      setEditingPlay(null);
                    } else {
                      // Creating new play
                      setNewPowerPointDraft(data);
                    }
                  }}
                  onCancel={() => {
                    setShowPowerPointDesigner(false);
                    setEditingPlay(null);
                  }}
                />
                {newPowerPointDraft && (
                  <form
                    className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget as HTMLFormElement;
                      const formData = new FormData(form);
                      const name = (formData.get('name') as string) || 'New Play';
                      const category = (formData.get('category') as 'offense' | 'defense' | 'special_teams') || 'offense';
                      const newPlay: Play = {
                        id: crypto.randomUUID(),
                        name,
                        description: (formData.get('description') as string) || 'PowerPoint design',
                        category,
                        positionAssignments: [],
                        powerpoint_design: newPowerPointDraft,
                        created_at: new Date().toISOString(),
                        team_id: profile.team_id,
                      };
                      const updated = [...plays, newPlay];
                      setPlays(updated);
                      localStorage.setItem(`playbook_${profile.team_id}`, JSON.stringify(updated));
                      toast({ title: 'Play saved', description: `${name} added to playbook.` });
                      setShowPowerPointDesigner(false);
                      setNewPowerPointDraft(null);
                    }}
                  >
                    <div>
                      <Label htmlFor="pp-name">Name</Label>
                      <Input id="pp-name" name="name" placeholder="e.g., Single Wing Off Tackle" required />
                    </div>
                    <div>
                      <Label htmlFor="pp-category">Category</Label>
                      <select name="category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="offense">Offense</option>
                        <option value="defense">Defense</option>
                        <option value="special_teams">Special Teams</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <Label htmlFor="pp-description">Description</Label>
                      <Input id="pp-description" name="description" placeholder="Optional details" />
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                      <Button type="button" variant="ghost" onClick={() => setNewPowerPointDraft(null)}>Discard Design</Button>
                      <Button type="submit">Save Play</Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
            
            <Dialog open={showNewDesigner} onOpenChange={(open) => {
              setShowNewDesigner(open);
              if (!open) setNewDiagramDraft(null);
            }}>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle>Design New Play</DialogTitle>
                  <DialogDescription>Create a diagram, then save it as a play in your playbook.</DialogDescription>
                </DialogHeader>
                <PlayDesigner
                  initial={null}
                  onSave={(data) => {
                    setNewDiagramDraft(data);
                  }}
                  onCancel={() => setShowNewDesigner(false)}
                />
                {newDiagramDraft && (
                  <form
                    className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget as HTMLFormElement;
                      const formData = new FormData(form);
                      const name = (formData.get('name') as string) || 'New Play';
                      const category = (formData.get('category') as 'offense' | 'defense' | 'special_teams') || 'offense';
                      const newPlay: Play = {
                        id: crypto.randomUUID(),
                        name,
                        description: (formData.get('description') as string) || 'Diagram only',
                        category,
                        positionAssignments: [],
                        diagram: newDiagramDraft,
                        created_at: new Date().toISOString(),
                        team_id: profile.team_id,
                      };
                      const updated = [...plays, newPlay];
                      setPlays(updated);
                      localStorage.setItem(`playbook_${profile.team_id}`, JSON.stringify(updated));
                      toast({ title: 'Play saved', description: `${name} added to playbook.` });
                      setShowNewDesigner(false);
                      setNewDiagramDraft(null);
                    }}
                  >
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" placeholder="e.g., Single Wing Off Tackle" required />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <select name="category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="offense">Offense</option>
                        <option value="defense">Defense</option>
                        <option value="special_teams">Special Teams</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" placeholder="Optional details" />
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                      <Button type="button" variant="ghost" onClick={() => setNewDiagramDraft(null)}>Discard Diagram</Button>
                      <Button type="submit">Save Play</Button>
                    </div>
                  </form>
                )}
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
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {['QB', 'F', 'H', 'FB', 'LT', 'LG', 'C', 'RG', 'RT', 'TE', 'X', 'Z', 'Y'].map(position => (
                        <div key={position} className="space-y-2">
                          <Label htmlFor={`assignment-${position}`} className="font-mono text-sm font-semibold">
                            {position}
                          </Label>
                          <Textarea
                            id={`assignment-${position}`}
                            name={`assignment-${position}`}
                            placeholder={`Enter assignment for ${position}...`}
                            className="min-h-[50px] text-sm"
                          />
                        </div>
                      ))}
                    </div>
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
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {['QB', 'F', 'H', 'FB', 'LT', 'LG', 'C', 'RG', 'RT', 'TE', 'X', 'Z', 'Y'].map(position => {
                      const existingAssignment = editingPlay?.positionAssignments?.find(a => a.position === position);
                      return (
                        <div key={position} className="space-y-2">
                          <Label htmlFor={`edit-assignment-${position}`} className="font-mono text-sm font-semibold">
                            {position}
                          </Label>
                          <Textarea
                            id={`edit-assignment-${position}`}
                            name={`assignment-${position}`}
                            defaultValue={existingAssignment?.assignment || ''}
                            placeholder={`Enter assignment for ${position}...`}
                            className="min-h-[50px] text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Play'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Designer Dialog */}
        <Dialog open={showDesigner} onOpenChange={(open) => {
          setShowDesigner(open);
          if (!open) setEditingPlay(null);
        }}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Design Play Diagram</DialogTitle>
              <DialogDescription>
                Drag players and draw colored arrows for run, pass, and block assignments.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <PlayDesigner
                initial={editingPlay?.diagram || null}
                onSave={(data) => {
                  if (!editingPlay) return;
                  const updated = plays.map(p => p.id === editingPlay.id ? { ...p, diagram: data } : p);
                  setPlays(updated);
                  localStorage.setItem(`playbook_${profile.team_id}`, JSON.stringify(updated));
                  toast({ title: 'Diagram saved', description: `${editingPlay.name} updated.` });
                  setShowDesigner(false);
                  setEditingPlay(null);
                }}
                onCancel={() => {
                  setShowDesigner(false);
                  setEditingPlay(null);
                }}
              />
            </div>
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
                     <Button
                       variant="secondary"
                       size="sm"
                       onClick={() => handleDesignPlay(play)}
                       className="h-7 w-7 p-0"
                       title="Design Diagram"
                     >
                       <PencilRuler className="h-3 w-3" />
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => {
                         setEditingPlay(play);
                         setShowPowerPointDesigner(true);
                       }}
                       className="h-7 w-7 p-0"
                       title="PowerPoint Style"
                     >
                       <PencilRuler className="h-3 w-3" />
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
                {play.diagram && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Diagram</h4>
                    {/* Lightweight preview: render a tiny inline SVG snapshot */}
                    <div className="rounded border">
                      <svg viewBox={`0 0 600 360`} width="100%" height={180}>
                        {/* nodes */}
                        {play.diagram.nodes.map((n) => (
                          <g key={n.id}>
                            {n.type === 'offense' ? (
                              <circle cx={n.x} cy={n.y} r={6} fill="#10b981" />
                            ) : (
                              <polygon points={`${n.x},${n.y - 7} ${n.x - 7},${n.y + 6} ${n.x + 7},${n.y + 6}`} fill="#f59e0b" />
                            )}
                          </g>
                        ))}
                        {play.diagram.edges.map((ed) => {
                          const from = play.diagram!.nodes.find(n => n.id === ed.from);
                          if (!from) return null;
                          const colors: any = { run: '#ef4444', pass: '#3b82f6', block: '#6b7280' };
                          return <line key={ed.id} x1={from.x} y1={from.y} x2={ed.to.x} y2={ed.to.y} stroke={colors[ed.style]} strokeWidth={2} />
                        })}
                      </svg>
                    </div>
                  </div>
                )}
                
                {play.powerpoint_design && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">PowerPoint Design</h4>
                    <div className="rounded border bg-white p-2">
                      <div className="text-xs text-muted-foreground">
                        Professional design with {play.powerpoint_design.elements.length} elements
                      </div>
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
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowLeft, Play, Target, Flag, TrendingUp, TrendingDown, Upload, BarChart3, Users, Trophy, Trash2, Edit } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { analyzePlays, recommendPlay } from '../../analysis-core/src/analyze';
import type { FieldResolvers, PlayInput } from '../../analysis-core/src/index';

interface PlaybookPlay {
  id: string;
  name: string;
  description: string;
  category: 'offense' | 'defense' | 'special_teams';
  direction?: 'left' | 'right' | 'center';
  formation?: string;
}

interface GameData {
  id: string;
  opponent_name: string;
  game_date: string;
  is_home_game: boolean;
  final_score_us?: number;
  final_score_opponent?: number;
}

interface PlayData {
  id: string;
  quarter: number;
  down: number;
  distance: number;
  yard_line: number;
  play_type: 'run' | 'pass' | 'punt' | 'field_goal' | 'extra_point' | 'kickoff';
  yards_gained: number;
  is_turnover: boolean;
  is_touchdown: boolean;
  is_first_down: boolean;
  play_description?: string;
  ball_carrier?: string;
  quarterback?: string;
  penalty_type?: string;
  penalty_yards?: number;
  penalty_team?: 'us' | 'opponent';
  penalty_player?: string;
  created_at: string;
}

const GameDetails = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameData | null>(null);
  const [plays, setPlays] = useState<PlayData[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [playbookPlays, setPlaybookPlays] = useState<PlaybookPlay[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddPlay, setShowAddPlay] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedOffenseDefense, setSelectedOffenseDefense] = useState<'offense' | 'defense' | ''>('');
  const [activeTab, setActiveTab] = useState<string>('plays');
  const [showEditPlay, setShowEditPlay] = useState(false);
  const [editingPlay, setEditingPlay] = useState<PlayData | null>(null);

  const canManage = profile?.role === 'head_coach' || profile?.role === 'assistant_coach';

  // Field resolvers for analysis-core
  const playResolvers: FieldResolvers<PlayData> = {
    gameId: (play) => gameId || '',
    offenseTeam: (play) => game?.opponent_name ? 'Us' : 'Us',
    defenseTeam: (play) => game?.opponent_name || 'Opponent',
    quarter: (play) => play.quarter,
    down: (play) => play.down as 1 | 2 | 3 | 4,
    distance: (play) => play.distance,
    yardLineStart: (play) => play.yard_line,
    yardsGained: (play) => play.yards_gained,
    playFamily: (play) => play.play_type,
    formation: (play) => play.play_description?.split('-')[0]?.trim(),
    isTouchdown: (play) => play.is_touchdown,
    isTurnover: (play) => play.is_turnover,
    isPenalty: (play) => !!play.penalty_type,
    penaltyYards: (play) => play.penalty_yards,
    playId: (play) => play.id
  };

  const parseExcelPlay = (row: any[], playNumber: number): Partial<PlayData> | null => {
    // Skip empty rows or header rows
    if (!row || row.length < 6 || typeof row[0] !== 'number') return null;

    console.log(`Parsing play ${playNumber}:`, row); // Debug log

    const [
      playNum,
      down,
      distance,
      fieldPosition,
      formation,
      playcall,
      direction,
      result,
      success,
      ballCarrier,
      tdTurnoverPenalty,
      notes
    ] = row;

    // Determine play type based on playcall
    let playType: 'run' | 'pass' | 'punt' | 'field_goal' | 'extra_point' | 'kickoff' = 'run';
    if (playcall && typeof playcall === 'string') {
      const playcallLower = playcall.toLowerCase();
      if (playcallLower.includes('smoke') || playcallLower.includes('quick') || playcallLower.includes('pass')) {
        playType = 'pass';
      } else if (playcallLower.includes('punt')) {
        playType = 'punt';
      } else if (playcallLower.includes('field goal') || playcallLower.includes('fg')) {
        playType = 'field_goal';
      } else if (playcallLower.includes('extra point') || playcallLower.includes('pat')) {
        playType = 'extra_point';
      } else if (playcallLower.includes('kickoff')) {
        playType = 'kickoff';
      }
    }

    // Determine if it's a touchdown or turnover
    const isTouchdown = tdTurnoverPenalty && typeof tdTurnoverPenalty === 'string' && 
                       tdTurnoverPenalty.toLowerCase().includes('td');
    const isTurnover = tdTurnoverPenalty && typeof tdTurnoverPenalty === 'string' && 
                      (tdTurnoverPenalty.toLowerCase().includes('turnover') || 
                       tdTurnoverPenalty.toLowerCase().includes('int') ||
                       tdTurnoverPenalty.toLowerCase().includes('fumble'));

    // Determine if it's a first down
    const isFirstDown = success && (success === 'Yes' || success === 'Y' || success === 'y' || success === true);

    // Calculate quarter based on play number (rough estimate)
    const quarter = Math.max(1, Math.min(4, Math.ceil(playNumber / 10)));

    // Try to find yards gained in different possible columns
    let yardsGained = 0;
    
    // Check if result is a number
    if (typeof result === 'number') {
      yardsGained = result;
    }
    // Check if result is a string that contains a number
    else if (typeof result === 'string') {
      const match = result.match(/(-?\d+)/);
      if (match) {
        yardsGained = parseInt(match[1]);
      }
    }
    
    // If still 0, try looking in other columns for yards
    if (yardsGained === 0) {
      // Check if there's a "yards" column or similar
      for (let i = 0; i < row.length; i++) {
        const cell = row[i];
        if (typeof cell === 'number' && cell !== 0 && Math.abs(cell) <= 50) {
          // This looks like yards gained (reasonable range)
          yardsGained = cell;
          console.log(`Found yards in column ${i}: ${cell}`);
          break;
        } else if (typeof cell === 'string') {
          const match = cell.match(/(-?\d+)\s*yards?/i);
          if (match) {
            yardsGained = parseInt(match[1]);
            console.log(`Found yards in column ${i}: ${cell} -> ${yardsGained}`);
            break;
          }
        }
      }
    }

    console.log(`Final yards gained: ${yardsGained} (from result: ${result})`);

    return {
      quarter,
      down: typeof down === 'number' ? Math.max(1, Math.min(4, down)) : 1,
      distance: typeof distance === 'number' ? Math.max(1, distance) : 10,
      yard_line: typeof fieldPosition === 'number' ? Math.max(1, Math.min(100, fieldPosition)) : 25,
      play_type: playType,
      yards_gained: yardsGained,
      is_turnover: Boolean(isTurnover),
      is_touchdown: Boolean(isTouchdown),
      is_first_down: Boolean(isFirstDown),
      play_description: `${formation || 'Unknown'} - ${playcall || 'Unknown'} ${direction || ''}`.trim(),
      ball_carrier: ballCarrier && typeof ballCarrier === 'string' ? ballCarrier.trim() : undefined,
      penalty_type: tdTurnoverPenalty && typeof tdTurnoverPenalty === 'string' && 
                   tdTurnoverPenalty.toLowerCase().includes('penalty') ? tdTurnoverPenalty : undefined,
      penalty_team: tdTurnoverPenalty && typeof tdTurnoverPenalty === 'string' && 
                   tdTurnoverPenalty.toLowerCase().includes('penalty') ? 'us' : undefined,
      penalty_player: tdTurnoverPenalty && typeof tdTurnoverPenalty === 'string' && 
                     tdTurnoverPenalty.toLowerCase().includes('penalty') ? 'Penalty' : undefined,
    };
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !gameId) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);

    try {
      toast({
        title: "Processing Excel file...",
        description: "This may take a moment. Please wait.",
      });

      // Read the Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get the first sheet (or let user choose)
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const importedPlays: Partial<PlayData>[] = [];
      let playNumber = 1;

      // Log the header row to see column structure
      if (jsonData.length > 0) {
        console.log('Excel headers:', jsonData[0]);
      }

      // Parse each row
      for (let i = 1; i < jsonData.length; i++) { // Skip header row
        const row = jsonData[i] as any[];
        const play = parseExcelPlay(row, playNumber);
        if (play) {
          importedPlays.push(play);
          playNumber++;
        }
      }

      if (importedPlays.length === 0) {
        toast({
          title: "No plays found",
          description: "Could not extract any plays from the Excel file.",
          variant: "destructive"
        });
        return;
      }

      // Save plays to database
      const playsToInsert = importedPlays.map(play => ({
        ...play,
        distance: play.distance ?? 10,
        down: play.down ?? 1,
        play_type: play.play_type ?? 'run',
        quarter: play.quarter ?? 1,
        yard_line: play.yard_line ?? 50,
        game_id: gameId,
        created_at: new Date().toISOString(),
      }));

      console.log('Inserting plays:', playsToInsert[0]); // Debug log

      const { error } = await supabase
        .from('plays')
        .insert(playsToInsert);

      if (error) {
        console.error('Database error:', error);
        
        // If the error is about missing columns, try without them
        if (error.message.includes('ball_carrier') || error.message.includes('quarterback')) {
          console.log('Retrying without ball_carrier and quarterback fields...');
          
          const playsToInsertFallback = importedPlays.map(play => {
            const { ball_carrier, quarterback, ...playWithoutNewFields } = play;
            return {
              ...playWithoutNewFields,
              distance: play.distance ?? 10,
              down: play.down ?? 1,
              play_type: play.play_type ?? 'run',
              quarter: play.quarter ?? 1,
              yard_line: play.yard_line ?? 50,
              game_id: gameId,
              created_at: new Date().toISOString(),
            };
          });

          const { error: fallbackError } = await supabase
            .from('plays')
            .insert(playsToInsertFallback);

          if (fallbackError) {
            throw new Error(`Database error: ${fallbackError.message}`);
          }

          toast({
            title: "Import successful!",
            description: `Imported ${importedPlays.length} plays from Excel file. Note: ball_carrier and quarterback data was not saved - please run the database migration.`
          });
        } else {
          throw new Error(`Database error: ${error.message}. Please ensure the database migration has been applied.`);
        }
      } else {
        toast({
          title: "Import successful!",
          description: `Imported ${importedPlays.length} plays from Excel file.`
        });
      }

      // Refresh the plays list
      fetchGameData();
      setShowImport(false);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to parse Excel file. Please check the file format.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  const handleDeletePlay = async (playId: string) => {
    if (!canManage) {
      toast({
        title: "Permission denied",
        description: "Only coaches can delete plays.",
        variant: "destructive"
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this play? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('plays')
        .delete()
        .eq('id', playId);

      if (error) throw error;

      // Update local state
      setPlays(plays.filter(play => play.id !== playId));

      toast({
        title: "Play deleted",
        description: "The play has been removed successfully."
      });
    } catch (error: any) {
      console.error('Error deleting play:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete play.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gameId && profile?.team_id) {
      fetchGameData();
      fetchPlayers();
      fetchPlaybookPlays();
    }
  }, [gameId, profile]);

  const fetchGameData = async () => {
    try {
      // Fetch game details
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .eq('team_id', profile.team_id)
        .single();

      if (gameError) throw gameError;
      setGame(gameData);

      // Fetch plays for this game
      const { data: playsData, error: playsError } = await supabase
        .from('plays')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at');

      if (playsError) throw playsError;
      setPlays((playsData || []).map(play => ({
        ...play,
        penalty_team: play.penalty_team as 'us' | 'opponent' | undefined
      })));
    } catch (error) {
      console.error('Error fetching game data:', error);
      toast({
        title: "Error",
        description: "Failed to load game data.",
        variant: "destructive"
      });
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data: playersData, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', profile.team_id)
        .eq('active', true)
        .order('jersey_number');

      if (error) throw error;
      setPlayers(playersData || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchPlaybookPlays = async () => {
    try {
      // Fetch plays from localStorage (same as PlaybookManagement)
      const savedPlays = localStorage.getItem(`playbook_${profile.team_id}`);
      if (savedPlays) {
        setPlaybookPlays(JSON.parse(savedPlays));
      }
    } catch (error) {
      console.error('Error fetching playbook plays:', error);
    }
  };

  const addPlay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const playData = {
      game_id: gameId,
      quarter: parseInt(formData.get('quarter') as string),
      down: parseInt(formData.get('down') as string),
      distance: parseInt(formData.get('distance') as string),
      yard_line: parseInt(formData.get('yard-line') as string),
      play_type: formData.get('play-type') as 'run' | 'pass' | 'punt' | 'field_goal' | 'extra_point',
      yards_gained: parseInt(formData.get('yards-gained') as string) || 0,
      is_turnover: formData.get('is-turnover') === 'on',
      is_touchdown: formData.get('is-touchdown') === 'on',
      is_first_down: formData.get('is-first-down') === 'on',
      play_description: formData.get('play-description') as string,
      quarterback: formData.get('quarterback') as string || null,
      ball_carrier: formData.get('player') as string || null,
      penalty_type: formData.get('penalty-type') as string === 'none' ? null : formData.get('penalty-type') as string,
      penalty_yards: parseInt(formData.get('penalty-yards') as string) || null,
      penalty_team: formData.get('penalty-team') as string || null,
      penalty_player: formData.get('penalty-player') as string || null,
    };

    try {
      const { error } = await supabase
        .from('plays')
        .insert(playData);

      if (error) throw error;

      toast({
        title: "Play recorded!",
        description: "Play has been added to the game."
      });

      setShowAddPlay(false);
      fetchGameData();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "Error recording play",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const editPlay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPlay) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const playData = {
      quarter: parseInt(formData.get('quarter') as string),
      down: parseInt(formData.get('down') as string),
      distance: parseInt(formData.get('distance') as string),
      yard_line: parseInt(formData.get('yard-line') as string),
      play_type: formData.get('play-type') as 'run' | 'pass' | 'punt' | 'field_goal' | 'extra_point',
      yards_gained: parseInt(formData.get('yards-gained') as string) || 0,
      is_turnover: formData.get('is-turnover') === 'on',
      is_touchdown: formData.get('is-touchdown') === 'on',
      is_first_down: formData.get('is-first-down') === 'on',
      play_description: formData.get('play-description') as string,
      quarterback: formData.get('quarterback') as string || null,
      ball_carrier: formData.get('player') as string || null,
      penalty_type: formData.get('penalty-type') as string === 'none' ? null : formData.get('penalty-type') as string,
      penalty_yards: parseInt(formData.get('penalty-yards') as string) || null,
      penalty_team: formData.get('penalty-team') as string || null,
      penalty_player: formData.get('penalty-player') as string || null,
    };

    try {
      const { error } = await supabase
        .from('plays')
        .update(playData)
        .eq('id', editingPlay.id);

      if (error) throw error;

      toast({
        title: "Play updated!",
        description: "The play has been successfully updated."
      });

      setShowEditPlay(false);
      setEditingPlay(null);
      fetchGameData();
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

  const getPlayIcon = (play: PlayData) => {
    if (play.is_touchdown) return <Flag className="h-4 w-4 text-green-600" />;
    if (play.is_turnover) return <TrendingDown className="h-4 w-4 text-red-600" />;
    if (play.is_first_down) return <TrendingUp className="h-4 w-4 text-blue-600" />;
    return <Play className="h-4 w-4" />;
  };

  const getPlayResult = (play: PlayData) => {
    if (play.is_touchdown) return "TD";
    if (play.is_turnover) return "TO";
    if (play.is_first_down) return "1st Down";
    return `${play.yards_gained > 0 ? '+' : ''}${play.yards_gained} yds`;
  };

  if (!canManage) {
    return (
      <Layout>
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
              <p className="text-muted-foreground">
                Only coaches can manage game details.
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

  if (!game) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-64">
          <div>Loading game data...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Title - Always at Top */}
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
              <h2 className="text-3xl font-bold">vs {game.opponent_name}</h2>
              <p className="text-muted-foreground">
                {new Date(game.game_date).toLocaleDateString()} • {game.is_home_game ? 'Home' : 'Away'} Game
              </p>
            </div>
          </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
            <Dialog open={showImport} onOpenChange={setShowImport}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import Excel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Plays from Excel</DialogTitle>
                  <DialogDescription>
                    Upload an Excel file (.xlsx or .xls) containing your game log. 
                    The file should have columns for Play #, Down, Distance, Field Position, Formation, Playcall, Direction, Result, Success, Ball Carrier, and Notes.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <Label htmlFor="excel-upload" className="cursor-pointer">
                      <span className="text-sm font-medium">Click to upload Excel file</span>
                      <Input
                        id="excel-upload"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelImport}
                        disabled={importing}
                        className="hidden"
                      />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supports .xlsx and .xls files
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
            
          <Dialog open={showAddPlay} onOpenChange={(open) => {
            setShowAddPlay(open);
            if (!open) setSelectedOffenseDefense('');
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Record Play
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Play</DialogTitle>
                <DialogDescription>
                  Add play-by-play details for this down.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addPlay} className="space-y-4 pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quarter">Quarter</Label>
                    <Select name="quarter" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select quarter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Quarter</SelectItem>
                        <SelectItem value="2">2nd Quarter</SelectItem>
                        <SelectItem value="3">3rd Quarter</SelectItem>
                        <SelectItem value="4">4th Quarter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="down">Down</Label>
                    <Select name="down" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Down" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Down</SelectItem>
                        <SelectItem value="2">2nd Down</SelectItem>
                        <SelectItem value="3">3rd Down</SelectItem>
                        <SelectItem value="4">4th Down</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="distance">Distance</Label>
                    <Input
                      id="distance"
                      name="distance"
                      type="number"
                      placeholder="10"
                      min="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yard-line">Yard Line</Label>
                    <Input
                      id="yard-line"
                      name="yard-line"
                      type="number"
                      placeholder="50"
                      min="1"
                      max="99"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offense-defense">Offense/Defense</Label>
                  <Select 
                    name="offense-defense" 
                    required
                    onValueChange={(value) => setSelectedOffenseDefense(value as 'offense' | 'defense')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select offense or defense" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offense">Offense</SelectItem>
                      <SelectItem value="defense">Defense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="playbook-play">Select from Playbook (Optional)</Label>
                  <Select name="playbook-play">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a play from playbook" />
                    </SelectTrigger>
                    <SelectContent>
                      {playbookPlays.map((play) => (
                        <SelectItem key={play.id} value={play.id}>
                          {play.name} ({play.category.replace('_', ' ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="play-type">Play Type</Label>
                    <Select name="play-type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select play type" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedOffenseDefense === 'defense' ? (
                          <>
                            <SelectItem value="inside">Inside</SelectItem>
                            <SelectItem value="outside_run">Outside Run</SelectItem>
                            <SelectItem value="wide_receiver_screen">Wide Receiver Screen</SelectItem>
                            <SelectItem value="draw">Draw</SelectItem>
                            <SelectItem value="deep_pass">Deep Pass</SelectItem>
                            <SelectItem value="flat_pass">Flat Pass</SelectItem>
                            <SelectItem value="jet">Jet</SelectItem>
                            <SelectItem value="tight_end_pass">Tight End Pass</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="run">Run</SelectItem>
                            <SelectItem value="pass">Pass</SelectItem>
                            <SelectItem value="punt">Punt</SelectItem>
                            <SelectItem value="field_goal">Field Goal</SelectItem>
                            <SelectItem value="extra_point">Extra Point</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="direction">Direction</Label>
                    <Select name="direction">
                      <SelectTrigger>
                        <SelectValue placeholder="Select direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quarterback">Quarterback</Label>
                    <Select name="quarterback">
                      <SelectTrigger>
                        <SelectValue placeholder="Select QB" />
                      </SelectTrigger>
                      <SelectContent>
                        {players.filter(p => p.positions?.includes('QB')).map((player) => (
                          <SelectItem key={player.id} value={`${player.first_name} ${player.last_name}`}>
                            #{player.jersey_number} {player.first_name} {player.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="player">Ball Carrier</Label>
                    <Select name="player">
                      <SelectTrigger>
                        <SelectValue placeholder="Select player" />
                      </SelectTrigger>
                      <SelectContent>
                        {players.map((player) => (
                          <SelectItem key={player.id} value={`${player.first_name} ${player.last_name}`}>
                            #{player.jersey_number} {player.first_name} {player.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="yards-gained">Yards Gained</Label>
                    <Input
                      id="yards-gained"
                      name="yards-gained"
                      type="number"
                      placeholder="5"
                    required
                    />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="play-description">Play Description</Label>
                  <Textarea
                    id="play-description"
                    name="play-description"
                    placeholder="Describe the play execution..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="is-first-down" 
                      name="is-first-down" 
                      className="rounded"
                    />
                    <Label htmlFor="is-first-down" className="text-sm">First Down</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="is-touchdown" 
                      name="is-touchdown" 
                      className="rounded"
                    />
                    <Label htmlFor="is-touchdown" className="text-sm">Touchdown</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="is-turnover" 
                      name="is-turnover" 
                      className="rounded"
                    />
                    <Label htmlFor="is-turnover" className="text-sm">Turnover</Label>
                  </div>
                </div>

                {/* Penalty Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Penalty (Optional)</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="penalty-type">Penalty Type</Label>
                      <Select name="penalty-type">
                        <SelectTrigger>
                          <SelectValue placeholder="Select penalty type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Penalty</SelectItem>
                          <SelectItem value="holding">Holding</SelectItem>
                          <SelectItem value="false_start">False Start</SelectItem>
                          <SelectItem value="offside">Offside</SelectItem>
                          <SelectItem value="pass_interference">Pass Interference</SelectItem>
                          <SelectItem value="roughing_passer">Roughing the Passer</SelectItem>
                          <SelectItem value="unsportsmanlike">Unsportsmanlike Conduct</SelectItem>
                          <SelectItem value="illegal_formation">Illegal Formation</SelectItem>
                          <SelectItem value="delay_of_game">Delay of Game</SelectItem>
                          <SelectItem value="encroachment">Encroachment</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="penalty-yards">Penalty Yards</Label>
                        <Input
                          id="penalty-yards"
                          name="penalty-yards"
                          type="number"
                          placeholder="5"
                          min="0"
                          max="50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="penalty-team">Penalized Team</Label>
                        <Select name="penalty-team">
                          <SelectTrigger>
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us">Our Team</SelectItem>
                            <SelectItem value="opponent">Opponent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="penalty-player">Player (Optional)</Label>
                      <Input
                        id="penalty-player"
                        name="penalty-player"
                        placeholder="Player name or number"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Recording...' : 'Record Play'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Game Score - Compact */}
        {(game.final_score_us !== null && game.final_score_opponent !== null) && (
          <div className="flex justify-center items-center py-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">
                  {game.final_score_us} - {game.final_score_opponent}
                </div>
            <span className="text-sm text-muted-foreground ml-3">Final Score</span>
              </div>
        )}

        {/* Edit Play Dialog */}
        <Dialog open={showEditPlay} onOpenChange={(open) => {
          setShowEditPlay(open);
          if (!open) setEditingPlay(null);
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Play</DialogTitle>
              <DialogDescription>
                Update the play details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editPlay} className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quarter">Quarter</Label>
                  <Select name="quarter" required defaultValue={editingPlay?.quarter.toString()}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Quarter</SelectItem>
                      <SelectItem value="2">2nd Quarter</SelectItem>
                      <SelectItem value="3">3rd Quarter</SelectItem>
                      <SelectItem value="4">4th Quarter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-down">Down</Label>
                  <Select name="down" required defaultValue={editingPlay?.down.toString()}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Down</SelectItem>
                      <SelectItem value="2">2nd Down</SelectItem>
                      <SelectItem value="3">3rd Down</SelectItem>
                      <SelectItem value="4">4th Down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-distance">Distance</Label>
                  <Input
                    id="edit-distance"
                    name="distance"
                    type="number"
                    defaultValue={editingPlay?.distance}
                    placeholder="10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-yard-line">Yard Line</Label>
                  <Input
                    id="edit-yard-line"
                    name="yard-line"
                    type="number"
                    defaultValue={editingPlay?.yard_line}
                    placeholder="50"
                    min="1"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-play-type">Play Type</Label>
                <Select name="play-type" required defaultValue={editingPlay?.play_type}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="run">Run</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="punt">Punt</SelectItem>
                    <SelectItem value="field_goal">Field Goal</SelectItem>
                    <SelectItem value="extra_point">Extra Point</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quarterback">Quarterback</Label>
                  <Select name="quarterback" defaultValue={editingPlay?.quarterback || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select QB" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.filter(p => p.positions?.includes('QB')).map((player) => (
                        <SelectItem key={player.id} value={`${player.first_name} ${player.last_name}`}>
                          #{player.jersey_number} {player.first_name} {player.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-player">Ball Carrier</Label>
                  <Select name="player" defaultValue={editingPlay?.ball_carrier || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={`${player.first_name} ${player.last_name}`}>
                          #{player.jersey_number} {player.first_name} {player.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-yards-gained">Yards Gained</Label>
                <Input
                  id="edit-yards-gained"
                  name="yards-gained"
                  type="number"
                  defaultValue={editingPlay?.yards_gained}
                  placeholder="5"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-play-description">Play Description</Label>
                <Textarea
                  id="edit-play-description"
                  name="play-description"
                  defaultValue={editingPlay?.play_description || ''}
                  placeholder="Describe the play..."
                  className="min-h-[60px]"
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-is-touchdown"
                    name="is-touchdown"
                    defaultChecked={editingPlay?.is_touchdown}
                    className="rounded"
                  />
                  <Label htmlFor="edit-is-touchdown" className="cursor-pointer">Touchdown</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-is-turnover"
                    name="is-turnover"
                    defaultChecked={editingPlay?.is_turnover}
                    className="rounded"
                  />
                  <Label htmlFor="edit-is-turnover" className="cursor-pointer">Turnover</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-is-first-down"
                    name="is-first-down"
                    defaultChecked={editingPlay?.is_first_down}
                    className="rounded"
                  />
                  <Label htmlFor="edit-is-first-down" className="cursor-pointer">First Down</Label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Play'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Tabs for Plays and Analytics */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plays" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Play by Play ({plays.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plays" className="mt-4">
            <div className="space-y-2">
              {plays.map((play, index) => (
                <div key={play.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-shrink-0">{getPlayIcon(play)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium whitespace-nowrap">
                            Q{play.quarter} • {play.down}{play.down === 1 ? 'st' : play.down === 2 ? 'nd' : play.down === 3 ? 'rd' : 'th'} & {play.distance}
                          </span>
                          <span className="text-xs text-muted-foreground">at {play.yard_line}</span>
                          <span className="text-xs capitalize">{play.play_type.replace('_', ' ')}</span>
                          {play.play_description && (
                            <span className="text-xs text-muted-foreground truncate">{play.play_description}</span>
                          )}
                        </div>
                        {play.penalty_type && (
                          <div className="text-xs text-red-600 mt-0.5">
                            🚩 {play.penalty_type.replace('_', ' ')} - {play.penalty_yards}y ({play.penalty_team === 'us' ? 'Us' : 'Opp'})
                          </div>
                        )}
                          </div>
                      </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge 
                        variant={play.is_touchdown ? 'default' : play.is_turnover ? 'destructive' : play.is_first_down ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {getPlayResult(play)}
                      </Badge>
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setEditingPlay(play);
                              setShowEditPlay(true);
                            }}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeletePlay(play.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {plays.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No plays recorded yet. Start tracking the game!
                  <div className="mt-4 flex gap-2 justify-center">
                    <Button onClick={() => setShowImport(true)} variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Import from Excel
                    </Button>
                    <Button onClick={() => setShowAddPlay(true)} variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Record First Play
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            {plays.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No plays to analyze yet. Record some plays to see analytics!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Overall Stats */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Game Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{plays.length}</div>
                        <div className="text-xs text-muted-foreground">Total Plays</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{plays.reduce((sum, p) => sum + p.yards_gained, 0)}</div>
                        <div className="text-xs text-muted-foreground">Total Yards</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{plays.filter(p => p.is_first_down).length}</div>
                        <div className="text-xs text-muted-foreground">First Downs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{plays.filter(p => p.is_touchdown).length}</div>
                        <div className="text-xs text-muted-foreground">Touchdowns</div>
                      </div>
            </div>
          </CardContent>
        </Card>

                {/* Play Effectiveness Analysis */}
                {(() => {
                  try {
                    const analysis = analyzePlays(plays as any[], playResolvers, {}, { 
                      team: 'Us',
                      minSamplesPerBucket: 3 
                    });
                    
                    return (
                      <>
                        {/* Top Plays */}
                        {analysis.rankedPlays.length > 0 && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Most Effective Plays
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {analysis.rankedPlays.slice(0, 5).map((play, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{play.key}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {play.sampleSize} plays • {play.raw.avgYards.toFixed(1)} yds/play
                                          {play.adjusted.lowSample && <span className="ml-1 text-amber-600">⚠️ Low sample</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <div className="text-sm font-bold">{Math.round(play.adjusted.successRate * 100)}%</div>
                                      <div className="text-xs text-muted-foreground">Success</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Down & Distance Breakdown */}
                        {Object.keys(analysis.byDownDistanceTables).length > 0 && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                Down & Distance Analysis
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {Object.entries(analysis.byDownDistanceTables).slice(0, 4).map(([key, playTypes]) => (
                                  <div key={key} className="border-l-4 border-primary pl-3">
                                    <div className="font-medium text-sm mb-1">{key}</div>
                                    {playTypes.slice(0, 2).map((playType, idx) => (
                                      <div key={idx} className="text-xs text-muted-foreground ml-2">
                                        • {playType.key}: {Math.round(playType.adjusted.successRate * 100)}% ({playType.sampleSize})
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Play Recommendations */}
                        {(() => {
                          const thirdLongRec = recommendPlay(plays as any[], playResolvers, { 
                            down: 3, 
                            distanceBand: 'long' 
                          }, { team: 'Us', minSamplesPerBucket: 2 });
                          
                          const secondShortRec = recommendPlay(plays as any[], playResolvers, { 
                            down: 2, 
                            distanceBand: 'short' 
                          }, { team: 'Us', minSamplesPerBucket: 2 });

                          if (thirdLongRec.recommendation || secondShortRec.recommendation) {
                            return (
                              <Card>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Flag className="h-5 w-5" />
                                    Play Recommendations
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {thirdLongRec.recommendation && (
                                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                                      <div className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">3rd & Long</div>
                                      <div className="text-sm font-semibold">{thirdLongRec.recommendation.key}</div>
                                      <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                                        {Math.round(thirdLongRec.recommendation.adjusted.successRate * 100)}% success rate • {thirdLongRec.recommendation.raw.avgYards.toFixed(1)} yds
                                      </div>
                                    </div>
                                  )}
                                  {secondShortRec.recommendation && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                      <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">2nd & Short</div>
                                      <div className="text-sm font-semibold">{secondShortRec.recommendation.key}</div>
                                      <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                        {Math.round(secondShortRec.recommendation.adjusted.successRate * 100)}% success rate • {secondShortRec.recommendation.raw.avgYards.toFixed(1)} yds
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          }
                          return null;
                        })()}
                      </>
                    );
                  } catch (error) {
                    console.error('Analytics error:', error);
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Unable to generate analytics. Please ensure you have enough play data.</p>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default GameDetails;
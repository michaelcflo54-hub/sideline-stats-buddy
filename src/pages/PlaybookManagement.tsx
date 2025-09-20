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
import { Plus, ArrowLeft, BookOpen, Target, Zap, Shield } from 'lucide-react';

interface Play {
  id: string;
  name: string;
  description: string;
  category: 'offense' | 'defense' | 'special_teams';
  formation?: string;
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
    const newPlay: Play = {
      id: crypto.randomUUID(),
      name: formData.get('play-name') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as 'offense' | 'defense' | 'special_teams',
      formation: formData.get('formation') as string || undefined,
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
          <Dialog open={showAddPlay} onOpenChange={setShowAddPlay}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Play
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Play</DialogTitle>
                <DialogDescription>
                  Create a new play for your team's playbook.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addPlay} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="play-name">Play Name</Label>
                  <Input
                    id="play-name"
                    name="play-name"
                    placeholder="e.g., Power Run Left"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select 
                    name="category" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="offense">Offense</option>
                    <option value="defense">Defense</option>
                    <option value="special_teams">Special Teams</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="formation">Formation (Optional)</Label>
                  <Input
                    id="formation"
                    name="formation"
                    placeholder="e.g., I-Formation, 4-3 Defense"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe the play execution, key points, etc."
                    className="min-h-[100px]"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Play'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlays.map((play) => (
            <Card key={play.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{play.name}</CardTitle>
                    {play.formation && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {play.formation}
                      </p>
                    )}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`${getCategoryColor(play.category)} text-white gap-1`}
                  >
                    {getCategoryIcon(play.category)}
                    {play.category.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {play.description}
                </p>
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
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
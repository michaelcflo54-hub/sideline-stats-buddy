import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'head_coach':
        return 'default';
      case 'assistant_coach':
        return 'secondary';
      case 'parent':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleBecomeCoach = async () => {
    if (!profile?.user_id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'head_coach' })
      .eq('user_id', profile.user_id);
    if (error) {
      toast({ title: 'Role update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Role updated', description: 'You are now a Head Coach. You can create a team.' });
      window.location.reload();
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Down & Distance Aid</h1>
            <p className="text-sm text-muted-foreground">Youth Football Analytics</p>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {profile.first_name} {profile.last_name}
                </span>
                <Badge variant={getRoleBadgeVariant(profile.role)}>
                  {formatRole(profile.role)}
                </Badge>
              </div>
            )}
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Debug info - remove later */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-4 bg-gray-100 rounded text-xs">
            <div>User: {user?.email}</div>
            <div>Profile: {profile ? `${profile.first_name} ${profile.last_name}` : 'No profile'}</div>
            <div>Role: {profile?.role || 'No role'}</div>
            <div>Team ID: {profile?.team_id || 'No team'}</div>
          </div>
        )}
        
        {!profile?.team_id ? (
          (profile?.role === 'head_coach' || profile?.role === 'assistant_coach') ? (
            children
          ) : (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Welcome!</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  You need to be assigned to a team to access the analytics features. 
                  Please contact your head coach to get added to a team.
                </p>
                {profile && (
                  <Button onClick={handleBecomeCoach}>
                    I'm a Coach — Set Role
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        ) : (
          children
        )}
      </main>
    </div>
  );
};

export default Layout;
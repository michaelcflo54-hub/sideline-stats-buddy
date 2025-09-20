import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, profile, signOut, loading } = useAuth();

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
        {!profile?.team_id ? (
          // If user is a coach, they can create a team, otherwise show contact message
          profile?.role === 'head_coach' || profile?.role === 'assistant_coach' ? (
            children // Let coaches access the app so they can create teams
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
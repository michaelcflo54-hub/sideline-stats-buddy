import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Settings, LogOut } from 'lucide-react';
import JoinTeam from './JoinTeam';
import PendingInvitations from './PendingInvitations';
import UserSettings from './UserSettings';

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
    
    // Use the secure RPC function that only allows the first user to become a coach
    const { data: success, error } = await supabase
      .rpc('request_coach_role');
    
    if (error) {
      toast({ 
        title: 'Role update failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    } else if (!success) {
      toast({ 
        title: 'Request denied', 
        description: 'Coaches already exist in the system. Please request coach privileges from an existing coach.', 
        variant: 'destructive' 
      });
    } else {
      toast({ 
        title: 'Role updated', 
        description: 'You are now a Head Coach. You can create a team.' 
      });
      window.location.reload();
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Down & Distance</h1>
            <p className="text-sm text-muted-foreground">Youth Football Analytics</p>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-auto px-2 hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url || undefined} alt={`${profile.first_name} ${profile.last_name}`} />
                        <AvatarFallback className="text-xs">
                          {profile.first_name?.[0]}{profile.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {profile.first_name} {profile.last_name}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile.first_name} {profile.last_name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                      <Badge variant={getRoleBadgeVariant(profile.role)} className="w-fit mt-1">
                        {formatRole(profile.role)}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <UserSettings>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </UserSettings>
                  <UserSettings>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </UserSettings>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        
        {!profile?.team_id ? (
          <div className="space-y-6">
            {/* Show pending invitations for all users */}
            <PendingInvitations onAccepted={() => window.location.reload()} />
            
            {(profile?.role === 'head_coach' || profile?.role === 'assistant_coach') ? (
              <>
                {children}
                <div className="max-w-md mx-auto">
                  <JoinTeam onSuccess={() => window.location.reload()} />
                </div>
              </>
            ) : (
              <Card className="max-w-md mx-auto">
                <CardHeader>
                  <CardTitle>Welcome!</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    You need to be assigned to a team to access the analytics features. 
                    Check above for any pending team invitations, or contact your head coach to get added to a team.
                  </p>
                  {profile && (
                    <Button onClick={handleBecomeCoach}>
                      I'm a Coach — Set Role
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
};

export default Layout;
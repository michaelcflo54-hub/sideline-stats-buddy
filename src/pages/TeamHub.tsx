import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, BarChart3, Award, Shield, ClipboardList } from 'lucide-react';

const TeamHub = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const isHeadCoach = profile?.role === 'head_coach';
  const isCoach = isHeadCoach || profile?.role === 'assistant_coach';

  const navigationCards = [
    {
      title: 'Coaches',
      description: 'Manage coaching staff and assistants',
      icon: Shield,
      path: '/team/coaches',
      visible: isHeadCoach,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950'
    },
    {
      title: 'Players',
      description: 'View and manage team roster',
      icon: Users,
      path: '/team/players',
      visible: true,
      color: 'text-green-600 bg-green-50 dark:bg-green-950'
    },
    {
      title: 'Schedule',
      description: 'Game schedule and results',
      icon: Calendar,
      path: '/team/schedule',
      visible: true,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950'
    },
    {
      title: 'Player Stats',
      description: 'View individual player statistics',
      icon: Award,
      path: '/team/player-stats',
      visible: true,
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-950'
    },
    {
      title: 'Team Analytics',
      description: 'Performance trends and insights',
      icon: BarChart3,
      path: '/team/analytics',
      visible: true,
      color: 'text-pink-600 bg-pink-50 dark:bg-pink-950'
    },
    {
      title: 'Playbook',
      description: 'Manage team playbook',
      icon: ClipboardList,
      path: '/playbook',
      visible: isCoach,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950'
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-2">
            Access all team resources and management tools
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationCards.filter(card => card.visible).map((card) => (
            <Card 
              key={card.path}
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
              onClick={() => navigate(card.path)}
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-4`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click to access {card.title.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default TeamHub;

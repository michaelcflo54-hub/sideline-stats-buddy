import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UpdateItem {
  id: string;
  title: string | null;
  message: string | null;
  image_path: string | null;
  created_at: string;
}

const Customer = () => {
  const { user, profile, loading } = useAuth();
  const [updates, setUpdates] = useState<UpdateItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('customer_updates')
        .select('id, title, message, image_path, created_at')
        .order('created_at', { ascending: false });
      if (!error) setUpdates(data || []);
    };
    if (user) load();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const getPublic = (path: string) => supabase.storage.from('customer-updates').getPublicUrl(path).data.publicUrl;

  return (
    <div className="min-h-screen bg-background p-4">
      <Card>
        <CardHeader>
          <CardTitle>Your Project Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {updates.map((u) => (
              <div key={u.id} className="border rounded p-4">
                {u.title && <div className="font-semibold mb-2">{u.title}</div>}
                {u.message && <div className="mb-2 text-muted-foreground">{u.message}</div>}
                {u.image_path && (
                  <img src={getPublic(u.image_path)} alt={u.title || 'update'} className="w-full max-h-96 object-cover rounded" />
                )}
                <div className="text-xs text-muted-foreground mt-2">{new Date(u.created_at).toLocaleString()}</div>
              </div>
            ))}
            {updates.length === 0 && <div className="text-muted-foreground">No updates yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Customer;
